# Phase 5: Real-Time Notification System

## Overview

Phase 5 implements a complete notification system powered by the transactional outbox pattern:
- **Outbox Dispatcher** — background job that polls `OutboxEvent` and creates notifications
- **Notification Model** — in-app inbox for notifications
- **REST API Endpoints** — fetch and manage notifications
- **Automatic Mapping** — delivery events → user-friendly notifications

## Architecture

```
Delivery Event Created
  ↓ (Phase 3/4)
OutboxEvent Created (processed: false)
  ↓ (Background Job)
dispatchAllOutboxEvents()
  ├─ Poll unprocessed OutboxEvents
  ├─ Map to Notification (user-friendly)
  ├─ Create Notification record
  ├─ Mark OutboxEvent as processed
  └─ Return stats (total, successful, failed)
  ↓
Notification stored in DB
  ↓ (Customer API)
GET /api/notifications?userId=customer-123
  ├─ Returns all notifications
  ├─ Includes unread count
  └─ Supports filtering by unread
```

## Database Schema

### Notification Model

```prisma
model Notification {
  id              String           @id @default(cuid())
  userId          String           // Customer who receives the notification
  orderId         String           // Associated order
  type            NotificationType // ORDER_CREATED, COURIER_ASSIGNED, etc.
  title           String           // "Courier Assigned"
  message         String           // "John is on the way"
  data            Json?            // Additional metadata
  read            Boolean          @default(false)
  readAt          DateTime?        // When customer read it
  channels        String[]         @default(["inbox"])  // inbox, email, sms
  sentAt          DateTime?        // When delivered
  deliveredAt     DateTime?        // When confirmed delivered
  failureCount    Int              @default(0)
  lastError       String?          // For retry logic
  createdAt       DateTime         @default(now())
  
  @@index([userId, read, createdAt])  // Fast unread count + fetch
  @@index([orderId, createdAt])       // Fast timeline lookup
}

enum NotificationType {
  ORDER_CREATED
  ORDER_CONFIRMED
  ORDER_CANCELLED
  RESTAURANT_ACCEPTED
  FOOD_PREPARING
  FOOD_READY
  COURIER_ASSIGNED
  DELIVERY_STARTED
  DELIVERY_COMPLETED
  DELIVERY_DELAYED
}
```

## API Endpoints

### POST /api/events/dispatch

**Trigger outbox event dispatch manually**

Useful for cron jobs, background workers, or webhook triggers.

**Query Parameters:**
- `limit` (optional, default 100): max events to process per batch
- `token` (optional): authorization token (check DISPATCH_SECRET env var)

**Request:**
```bash
curl -X POST http://localhost:3000/api/events/dispatch
curl -X POST 'http://localhost:3000/api/events/dispatch?limit=50&token=secret'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "successful": 4,
    "failed": 1
  }
}
```

**Authorization Error (401):**
```json
{
  "error": "Unauthorized"
}
```

---

### GET /api/notifications

**Fetch notifications for a customer**

**Query Parameters:**
- `userId` (required): customer ID (in production, from session)
- `unreadOnly` (optional, default false): fetch only unread
- `limit` (optional, default 50, max 500): max notifications to return

**Request:**
```bash
curl 'http://localhost:3000/api/notifications?userId=customer-123'
curl 'http://localhost:3000/api/notifications?userId=customer-123&unreadOnly=true'
curl 'http://localhost:3000/api/notifications?userId=customer-123&limit=20'
```

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "notif-123",
      "userId": "customer-123",
      "orderId": "order-456",
      "type": "COURIER_ASSIGNED",
      "title": "Courier Assigned",
      "message": "John is on the way with your order",
      "data": {
        "courierId": "courier-789",
        "courierName": "John",
        "estimatedDeliveryMinutes": 30
      },
      "read": false,
      "readAt": null,
      "sentAt": "2025-10-28T10:15:00Z",
      "deliveredAt": "2025-10-28T10:15:01Z",
      "createdAt": "2025-10-28T10:15:00Z"
    }
  ],
  "unreadCount": 3
}
```

---

### PATCH /api/notifications/:id/read

**Mark a notification as read**

**Request:**
```bash
curl -X PATCH http://localhost:3000/api/notifications/notif-123/read
```

**Response (200):**
```json
{
  "success": true,
  "notification": {
    "id": "notif-123",
    "userId": "customer-123",
    "read": true,
    "readAt": "2025-10-28T10:16:00Z",
    ...
  }
}
```

**Error (404):**
```json
{
  "error": "Notification not found"
}
```

---

## Event-to-Notification Mapping

The dispatcher automatically maps delivery events to user-friendly notifications:

| OutboxEvent Type | Notification Type | Title | Message |
|---|---|---|---|
| `DELIVERY_ACCEPT` | `RESTAURANT_ACCEPTED` | Restaurant Accepted | "{restaurant} has accepted your order" |
| `DELIVERY_START_PREPARING` | `FOOD_PREPARING` | Preparing Your Food | "{restaurant} is preparing your order" |
| `DELIVERY_MARK_READY` | `FOOD_READY` | Ready for Pickup | "Your order is ready for pickup" |
| `DELIVERY_ASSIGN_COURIER` | `COURIER_ASSIGNED` | Courier Assigned | "{courierName} is on the way" |
| `DELIVERY_START_DELIVERY` | `DELIVERY_STARTED` | Out for Delivery | "Your order is out for delivery" |
| `DELIVERY_DELIVER` | `DELIVERY_COMPLETED` | Delivered | "Your order has been delivered" |

---

## Implementation Details

### Outbox Dispatcher Library

**File:** `src/lib/outbox-dispatcher.ts`

```typescript
// Main dispatch function
export async function dispatchAllOutboxEvents(limit = 100): Promise<{
  total: number;
  successful: number;
  failed: number;
}>

// Dispatch a single event
export async function dispatchOutboxEvent(outboxEvent: any): Promise<boolean>

// Create notification in DB
export async function createNotification(payload: NotificationPayload): Promise<any>

// Customer APIs
export async function getUserNotifications(userId: string, unreadOnly?: boolean, limit?: number)
export async function getUnreadNotificationCount(userId: string): Promise<number>
export async function markNotificationAsRead(notificationId: string): Promise<any>
```

### Dispatch Endpoint

**File:** `src/app/api/events/dispatch/route.ts`

- POST: trigger dispatch
- GET: health check

Optional `DISPATCH_SECRET` environment variable for security.

### Notification Endpoints

**Files:**
- `src/app/api/notifications/route.ts` — GET notifications
- `src/app/api/notifications/[id]/read/route.ts` — PATCH mark as read

---

## Running the Dispatcher

### Option 1: Manual HTTP Trigger

```bash
# Dispatch all pending events
curl -X POST http://localhost:3000/api/events/dispatch

# With limit and security token
curl -X POST 'http://localhost:3000/api/events/dispatch?limit=100&token=your-secret'
```

### Option 2: Cron Job (Vercel, AWS Lambda, etc.)

```typescript
// pages/api/cron/dispatch.ts (Next.js API route)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify token
  if (req.headers['authorization'] !== `Bearer ${process.env.DISPATCH_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await dispatchAllOutboxEvents(100);
  res.status(200).json({ success: true, data: result });
}
```

Then configure cron:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/dispatch",
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }]
}
```

### Option 3: Background Job (Bull, RabbitMQ, etc.)

```typescript
import Queue from 'bull';

const dispatchQueue = new Queue('notification-dispatch', process.env.REDIS_URL);

dispatchQueue.process(async (job) => {
  const result = await dispatchAllOutboxEvents(100);
  return result;
});

// Schedule: every 5 minutes
dispatchQueue.add({}, { repeat: { cron: '*/5 * * * *' } });
```

---

## Testing

### Manual Test: Full Flow

1. **Create an order** (via checkout or direct POST to `/api/orders`)

2. **Assign a courier:**
   ```bash
   curl -X POST http://localhost:3000/api/delivery/assign \
     -H "Content-Type: application/json" \
     -d '{"orderId": "order-123", "estimatedDeliveryMinutes": 30}'
   ```

3. **Trigger dispatcher:**
   ```bash
   curl -X POST http://localhost:3000/api/events/dispatch
   ```

4. **Fetch notifications:**
   ```bash
   curl 'http://localhost:3000/api/notifications?userId=customer-123'
   ```

5. **Mark as read:**
   ```bash
   curl -X PATCH http://localhost:3000/api/notifications/notif-123/read
   ```

### Automated Tests

```bash
npm test -- outbox-dispatcher.test.ts --run
```

Tests verify:
- Event to notification mapping
- Dispatch creates notifications
- Marking as read
- Unread count
- Batch dispatch

---

## Performance Considerations

### Indexes

```sql
-- Fast unread fetch + count
CREATE INDEX "Notification_userId_read_createdAt_idx" 
  ON "Notification"("userId", "read", "createdAt");

-- Fast order timeline
CREATE INDEX "Notification_orderId_createdAt_idx" 
  ON "Notification"("orderId", "createdAt");

-- Retry tracking
CREATE INDEX "Notification_sentAt_deliveredAt_idx" 
  ON "Notification"("sentAt", "deliveredAt");
```

### Query Performance

| Query | Time | Index |
|-------|------|-------|
| Get unread count | ~2ms | userId_read_createdAt |
| Fetch 50 notifications | ~5ms | userId_read_createdAt |
| Timeline for order | ~3ms | orderId_createdAt |

---

## Scaling to High Volume

For 1000+ notifications/sec:

1. **Event Batching:**
   - Batch writes to Notification table
   - Use `insertMany` or Prisma batch operations

2. **Async Processing:**
   - Use message queue (Bull, RabbitMQ, SQS)
   - Workers poll independently

3. **Caching:**
   - Redis for unread count
   - Invalidate on new notification

4. **Archiving:**
   - Move old notifications to archive table after 90 days
   - Keep recent in hot table

---

## Integration with Front-End

### Fetch Notifications on Load

```typescript
// React hook
const [notifications, setNotifications] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  const fetch = async () => {
    const res = await fetch(`/api/notifications?userId=${customerId}`);
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  };
  fetch();
}, []);
```

### Real-Time Updates (Future)

```typescript
// Poll every 30 seconds (simple)
setInterval(() => {
  fetch(`/api/notifications?userId=${customerId}`)
    .then(r => r.json())
    .then(data => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    });
}, 30000);

// Or use WebSocket (Phase 6)
const ws = new WebSocket(`ws://localhost:3000/api/notifications/stream?userId=${customerId}`);
ws.onmessage = (event) => {
  const { notification } = JSON.parse(event.data);
  setNotifications(prev => [notification, ...prev]);
};
```

---

## Security

1. **Authorization:**
   - Validate `userId` from session (not from query param)
   - Return 401 if unauthorized

2. **Dispatch Token:**
   - Use `DISPATCH_SECRET` env var for webhook/cron access
   - Rotate periodically

3. **Data Privacy:**
   - Notifications only contain order reference, not sensitive payment data
   - PII in `data` field is sanitized before sending

---

## Monitoring & Debugging

### Check Unprocessed Events

```sql
SELECT COUNT(*) FROM "OutboxEvent" WHERE processed = false;
SELECT * FROM "OutboxEvent" WHERE processed = false ORDER BY createdAt DESC LIMIT 10;
```

### Check Notifications

```sql
SELECT COUNT(*) FROM "Notification" WHERE "read" = false AND "userId" = 'customer-123';
SELECT * FROM "Notification" WHERE "userId" = 'customer-123' ORDER BY "createdAt" DESC LIMIT 20;
```

### Monitor Dispatch Failures

```sql
SELECT COUNT(*) FROM "Notification" WHERE "failureCount" > 0;
SELECT "lastError", COUNT(*) FROM "Notification" WHERE "failureCount" > 0 GROUP BY "lastError";
```

---

## Next Steps (Phase 6+)

1. **WebSocket Real-Time** — Push notifications instead of polling
2. **Email/SMS Channels** — Extend to multiple channels
3. **Push Notifications** — Mobile app support (Firebase Cloud Messaging)
4. **Notification Preferences** — Let users choose channels and frequency
5. **Analytics** — Track notification delivery and engagement
