# Phase 3: Deterministic Courier Assignment

## Overview

This phase implements a deterministic courier assignment system that:
- Hashes the `orderId` to a courier ID (reproducible for tests)
- Prevents double assignment
- Creates a `DeliveryEvent` in ASSIGNED status
- Logs an `OutboxEvent` for notification dispatch
- Enforces state machine (order must be in READY state)

## API Endpoint

### POST /api/delivery/assign

Assign a courier to an order deterministically.

**Request:**
```json
{
  "orderId": "order-123",
  "estimatedDeliveryMinutes": 30
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderId": "order-123",
    "courierId": "courier-42",
    "courierName": "Courier One",
    "estimatedDeliveryMinutes": 30,
    "deliveryEvent": { "id": "event-123", "status": "ASSIGNED", ... },
    "outboxEvent": { "id": "outbox-123", "eventType": "DELIVERY_ASSIGN_COURIER", ... }
  }
}
```

**Error (400):**
```json
{
  "error": "Order order-123 already assigned to courier courier-42"
}
```

### GET /api/delivery/assign?orderId=order-123

Fetch the assigned courier for an order.

**Response (200):**
```json
{
  "orderId": "order-123",
  "assigned": true,
  "courier": {
    "courierId": "courier-42",
    "courierName": "Courier One",
    "phone": "+91...",
    "estimatedDeliveryAt": "2025-10-27T12:45:00Z"
  }
}
```

## Determinism & Reproducibility

The assignment uses an MD5 hash of the order ID:

```typescript
hash(orderId) % courierCount = courierIndex
```

**This means:**
- Same `orderId` → always assigned to the same courier
- Enables reproducible test scenarios
- Fair distribution across courier pool
- No state dependency (no databases of assignments needed)

## Implementation

- **Library**: `src/lib/courier-assignment.ts`
  - `assignCourier(orderId, estimatedDeliveryMinutes)` — assign and transition
  - `getAssignedCourier(orderId)` — fetch current assignment
  - `hashOrderToCourierId(orderId, courierIds)` — deterministic hash
  - `getAvailableCouriers()` — fetch all DELIVERY users

- **Endpoint**: `src/app/api/delivery/assign/route.ts`
  - POST: create assignment
  - GET: fetch assignment

- **Tests**: `src/lib/courier-assignment.test.ts` (currently skipped, awaiting DB)

## Prerequisites

1. Migration must be applied: **prisma/migrations/add_delivery_history_outbox.sql**
   - Adds `deliveryStatus` and `estimatedDeliveryAt` to Order
   - Creates `DeliveryEvent` and `OutboxEvent` tables

2. At least one user with `role = DELIVERY` must exist in the database

3. Order must be in `deliveryStatus = READY` state before assignment

## State Machine

```
PENDING
  ↓ (accept)
ACCEPTED
  ↓ (start_preparing)
PREPARING
  ↓ (mark_ready)
READY
  ↓ (assign_courier) ← Phase 3 transition
ASSIGNED
  ↓ (start_delivery)
DELIVERING
  ↓ (deliver)
DELIVERED
```

Only orders in READY state can transition to ASSIGNED.

## Testing

When the migration is applied and couriers exist in the database:

```bash
npm test -- courier-assignment.test.ts --run
```

Until then, tests remain skipped. To enable:
1. Apply migration SQL
2. Seed at least 2 DELIVERY users
3. Remove `.skip` from describe block
4. Run tests

## Next Steps (Phase 4)

- **Customer order-status endpoint**: `GET /api/orders/:id/status`
  - Returns current `DeliveryEvent` + timeline
  - Includes `deliveryPartner` info
  - Real-time delivery updates via WebSocket

## Notes

- **Idempotency**: Attempting double assignment raises an error (safe to retry)
- **Determinism**: Hash function is stable across Node.js versions
- **Performance**: Assignment is O(1) (hash lookup) after fetching couriers
- **Scalability**: Works with any number of couriers; distribution remains fair
