# Phase 4: Customer Order-Status Endpoint

## Overview

This phase implements a real-time customer order-status endpoint that returns:
- Current order and delivery status
- Order items, pricing, and totals
- Assigned courier details and estimated delivery time
- Complete delivery event timeline for transparency

## API Endpoint

### GET /api/orders/:id/status

Fetch complete order status with delivery timeline.

**Query Parameters:**
- `customerId` (optional): If provided, validates order belongs to customer (authorization)

**Response (200):**
```json
{
  "orderId": "order-123",
  "status": "CONFIRMED",
  "deliveryStatus": "DELIVERING",
  "subtotal": 1000,
  "deliveryFee": 50,
  "serviceFee": 100,
  "total": 1150,
  "currency": "INR",
  "createdAt": "2025-10-28T10:00:00Z",
  "updatedAt": "2025-10-28T10:15:00Z",
  "estimatedDeliveryAt": "2025-10-28T10:30:00Z",
  "deliveredAt": null,
  "restaurant": {
    "id": "rest-123",
    "name": "Pepper Bloom",
    "deliveryMinutes": 30
  },
  "deliveryPartner": {
    "id": "courier-42",
    "name": "Courier One",
    "phone": "+91..."
  },
  "items": [
    {
      "id": "item-1",
      "name": "Paneer Tikka",
      "unitPrice": 450,
      "quantity": 1
    }
  ],
  "timeline": [
    {
      "id": "event-1",
      "status": "READY",
      "courierId": null,
      "reason": null,
      "createdAt": "2025-10-28T10:05:00Z"
    },
    {
      "id": "event-2",
      "status": "ASSIGNED",
      "courierId": "courier-42",
      "reason": null,
      "createdAt": "2025-10-28T10:10:00Z"
    },
    {
      "id": "event-3",
      "status": "DELIVERING",
      "courierId": "courier-42",
      "reason": null,
      "createdAt": "2025-10-28T10:15:00Z"
    }
  ]
}
```

**Error (404):**
```json
{
  "error": "Order order-123 not found or does not belong to customer"
}
```

## Implementation

- **Library**: `src/lib/order-status.ts`
  - `getOrderStatus(orderId)` — fetch full status (admin/system access)
  - `getOrderStatusForCustomer(orderId, customerId)` — fetch status with customer auth check
  - Returns `OrderStatusResponse` type with timeline

- **Endpoint**: `src/app/api/orders/[id]/status/route.ts`
  - GET handler with optional `customerId` param
  - Errors: 404 (not found), 500 (server error)

- **Tests**: `__tests__/order-status-integration.test.ts` (skipped, requires DB)

## Authorization

Two modes:

1. **Without customerId**: Returns full order status (suitable for admin/partner portals)
2. **With customerId**: Validates `order.userId == customerId` (suitable for customer app)

```typescript
// Customer can only see their own order
const status = await getOrderStatusForCustomer(orderId, customerId);

// Admin/system can see any order
const status = await getOrderStatus(orderId);
```

## Timeline Format

Each `DeliveryEvent` becomes a timeline entry showing:

| Field | Meaning |
|-------|---------|
| `status` | PENDING → ACCEPTED → PREPARING → READY → ASSIGNED → DELIVERING → DELIVERED |
| `courierId` | Courier assigned (null until ASSIGNED) |
| `reason` | Optional cancellation or status reason |
| `createdAt` | When this transition occurred |

## State Transitions

The timeline reflects the delivery lifecycle:

```
PENDING (order placed)
  ↓ (accept)
ACCEPTED (restaurant accepted)
  ↓ (start_preparing)
PREPARING (food being prepared)
  ↓ (mark_ready)
READY (ready for pickup)
  ↓ (assign_courier)
ASSIGNED (courier assigned, ETA calculated)
  ↓ (start_delivery)
DELIVERING (on the way)
  ↓ (deliver)
DELIVERED ✓
```

## Real-Time Updates (Future)

To add live updates, extend this endpoint with WebSocket or Server-Sent Events (SSE):

```typescript
// Future: /api/orders/:id/status/stream (SSE)
// Emits: { type: "status_changed", data: { status, deliveryStatus } }
// Emits: { type: "timeline_updated", data: { event } }
```

Integration with `src/lib/outbox.ts` can power this:
- `getUnprocessedOutboxEvents()` polls for notifications
- Dispatch to WebSocket/SSE subscribers
- Mark as processed after delivery

## Testing

When database is available:

```bash
npm test -- order-status-integration.test.ts --run
```

Currently skipped. To enable:
1. Ensure PostgreSQL is reachable
2. Migration applied (`DeliveryEvent`, `OutboxEvent` tables created)
3. Remove `.skip` from describe block

## Integration with Phase 3

Phase 3 (courier assignment) creates the `DeliveryEvent` with ASSIGNED status. Phase 4 endpoint fetches and returns these events to the customer in chronological order.

**Workflow:**
```
1. Order created (PENDING)
2. Restaurant accepts (ACCEPTED)
3. Food prepared (PREPARING)
4. Food ready (READY)
5. POST /api/delivery/assign → creates ASSIGNED event
6. GET /api/orders/:id/status → returns timeline including ASSIGNED event + courier
7. Courier starts delivery (DELIVERING)
8. Delivery complete (DELIVERED)
```

## Performance

Indexes on `DeliveryEvent` and `Order`:
- `DeliveryEvent(orderId, createdAt)` — fast timeline fetch
- `Order(deliveryStatus, updatedAt)` — fast status queries
- `Order(deliveryPartnerId, status)` — courier dashboard queries

## Next Steps

- Add WebSocket/SSE for real-time updates (Phase 5)
- Implement outbox event dispatcher (Phase 5)
- Add customer notification (Phase 5)
