# TableTrail

TableTrail is an independent, original food-discovery and delivery marketplace inspired by common marketplace workflows. It is not affiliated with or a copy of Zomato.

## Current status

The initial foundation includes:

- Next.js and TypeScript application shell
- Responsive discovery homepage
- Restaurant and dish search
- Cuisine, vegetarian, and open-now filters
- Original restaurant catalogue domain model
- Typed payment, notification, and maps provider interfaces
- REST discovery endpoint at `/api/restaurants`
- Unit tests for discovery behavior

The first customer slice is also browser-verified:

- Responsive discovery homepage
- Restaurant detail pages with menu categories
- Add/remove quantities in a local cart
- Order total preview
- Server-validated order submission with delivery details
- Idempotency-key handling for repeated order requests
- Availability, quantity, duplicate-line, and malformed-input validation
- Prisma/PostgreSQL schema for users, addresses, restaurants, menus, orders, and idempotency records
- Phone OTP account flow with signed HTTP-only sessions
- Authenticated order history and PostgreSQL-backed saved-address APIs
- Restaurant partner portal with development onboarding, restaurant pause/resume controls, menu availability and item creation, detailed order queue, and preparation transitions
- Delivery portal with authenticated queue access, atomic order claiming, pickup confirmation, and delivery completion transitions
- PostgreSQL admin role-assignment API and access-management dashboard
- Durable audit records for privileged role, restaurant, menu, order, and delivery changes
- Admin audit-history API and filtered audit trail view
- Admin-only process metrics endpoint for transition, database, Redis, and delivery-latency signals
- Token-protected Prometheus-compatible metrics endpoint
- Structured JSON request logging with propagated request IDs
- GitHub Actions CI for Prisma validation, typecheck, tests, and production builds
- Automatic partner and delivery queue refresh with manual refresh and last-updated indicators
- Liveness and readiness endpoints for deployment health checks (including Redis readiness)
- Redis-backed order events over Server-Sent Events, with polling fallback

## Implementation status

### ✅ Implemented and verified

- **Order storage**: PostgreSQL with transactional pricing, inventory locks, and atomic line items
- **Delivery assignment**: Atomic claim prevents double-assignment using database UPDATE with atomic row lock
- **Authentication**: Development mode (customer-only, cannot escalate to partner/delivery); production mode (database roles required)
- **Realtime events**: Redis pub/sub with Server-Sent Events (SSE) or polling fallback
- **Health checks**: Liveness (/api/health), readiness (/api/health/ready) with PostgreSQL and Redis verification
- **Audit logging**: Privileged actions recorded to PostgreSQL AuditLog table
- **Price calculation**: Transactional inside PostgreSQL (per-item prices from database, not client)
- **Rate limiting**: Process-local for single-instance deployments

### ❌ Not implemented or verified

- **Payment processing**: Razorpay integration stub exists but does NOT create live orders; testing with Razorpay Sandbox not completed
- **SMS delivery**: No real SMS provider integration; test/development stubs only; Fast2SMS integration not verified
- **Distributed rate limiting**: Current limiter is process-local; multi-instance deployments need Redis-backed rate limiter
- **Production deployment**: PostgreSQL/Redis connection pooling, migration rollout, horizontal scaling not verified
- **Security**: Known npm vulnerabilities (Prisma/Next.js major version upgrades pending); see SECURITY.md
- **Load testing**: Concurrent order creation, multi-delivery-partner claims not tested under load
- **Backup/restore**: Tested with docker compose; production backup strategy and restore procedure not verified
- **Browser/device support**: Desktop browser verified; mobile browser, accessibility, low-bandwidth testing incomplete

## ⚠️ Do not use in production without

1. **Real payment integration** (Razorpay or Stripe): Implement webhook signature verification, refund handling, and test with live sandbox
2. **Real SMS delivery** (Fast2SMS, Twilio, or similar): Verify OTP delivery, implement retry logic, test failover
3. **Distributed rate limiting**: Replace process-local limiter with Redis-backed implementation
4. **Dependency upgrades**: Resolve known npm vulnerabilities (Prisma/Next.js major versions); see SECURITY.md
5. **Production hardening**: HTTPS/TLS termination, secret rotation policy, centralized logging, monitoring/alerting
6. **Full integration testing**: PostgreSQL concurrent writes, Redis failover, delivery claims under load, SSE client reconnects
7. **Migration strategy**: Test database migration from schema v0 to current version; verify rollback procedure

Set `ORDER_STORE=postgres` and `AUTH_PROVIDER=postgres` only after the PostgreSQL database is configured and integration-tested. Production rejects `ORDER_STORE=memory`.

## Local setup

Requirements: Node.js 22.23.4 or newer, npm, and (for production profile) PostgreSQL and Redis.

```powershell
npm install
npx prisma generate
npm run typecheck
npm test
npm run dev
```

Open `http://localhost:3000`.

For operations workflows (partner and delivery), development authentication grants customer access only. Partner and delivery workflows require:
1. PostgreSQL enabled (`AUTH_PROVIDER=postgres`, `ORDER_STORE=postgres`)
2. Database users with `PARTNER` or `DELIVERY` roles assigned via `/api/admin/users` 

To run the production profile with PostgreSQL, Redis, and the production server in containers:

```powershell
docker compose up --build
```

The app is then available at `http://localhost:3000`. Compose credentials are for local development only and must not be reused in production. Stop with `docker compose down`; add `-v` only when intentionally deleting the database and Redis volumes.

## Production deployment

Copy `.env.example` to `.env.local` and provide real values through a secret manager in deployed environments. The test payment provider is deliberately non-production.

### Intended production rollout

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to a PostgreSQL database
2. Run `npm run db:migrate` for development, then `npm run db:seed`
3. Use `npm run db:migrate:deploy` for production deployments
4. Replace local catalogue with tenant-aware restaurant and menu records
5. Implement real identity provider (SMS OTP with verified phone, session rotation)
6. Implement and verify real payment provider (signed webhooks, idempotency keys, refunds, reconciliation)
7. Configure Redis for realtime order events (mapped to delivery scope events)
8. Assign `PARTNER` and `DELIVERY` roles through admin workflow
9. Deploy distributed rate limiting (Redis-backed, not process-local)
10. Add monitoring, backups, CI/CD, and disaster recovery

### Deployment health checks

- `GET /api/health`: Liveness probe (no dependencies required)
- `GET /api/health/ready`: Readiness probe (verifies PostgreSQL and Redis)
- `GET /api/metrics`: Prometheus metrics (requires `Authorization: Bearer <METRICS_TOKEN>`)

Application requests include `x-request-id` response header. In production, middleware emits structured JSON logs.

## Security and compliance

See SECURITY.md for:
- Known npm vulnerabilities (Prisma/Next.js major version upgrades required)
- Timeline to resolution
- Temporary mitigations

See RUNTIME_VERIFICATION.md for:
- Integration test results (concurrent claims, SSE, Redis outage)
- Test fixtures and setup
- Outstanding verification tasks

## Safety and product boundaries

Use only original branding, code, data, and media. Integrate external providers through `src/lib/providers.ts`; never embed provider secrets in client-side code. Add consent, retention, deletion, audit, rate-limit, webhook-signature verification, and role-based access controls before production launch.
