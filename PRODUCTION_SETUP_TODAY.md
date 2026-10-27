# TableTrail production setup status

This document records the current implementation boundary. It is not a claim that TableTrail is production-ready.

## Implemented foundations

- `Dockerfile` builds a non-root Next.js image and runs migrations before startup.
- `docker-compose.yml` and `docker-compose.prod.yml` define PostgreSQL, Redis, and app services with healthchecks and restart policies.
- `/api/health` is a liveness endpoint.
- `/api/health/ready` checks PostgreSQL when durable providers are enabled.
- A process-local rate limiter covers OTP, OTP verification, and order requests. It is not suitable for multiple app instances.
- PostgreSQL-backed auth, order storage, roles, migrations, and audit records exist.

## Explicitly not implemented or not verified

- **Payments:** The `RazorpayProvider` currently returns a checkout URL-shaped value and verifies a payload signature; it does not create live Razorpay orders or process webhooks end to end. Payments are not production-ready.
- **SMS:** The Fast2SMS adapter exists, but no real provider request or sandbox delivery has been verified in this environment. SMS is not production-ready.
- **Maps:** Mapbox support is an adapter only and has not been verified here.
- **Distributed rate limiting:** The limiter is in process memory and resets on restart. Use a shared Redis-backed implementation before scaling horizontally.
- **Production runtime:** PostgreSQL, Redis, Docker Compose startup, migrations, SSE reconnection, concurrent claims, load, and backup/restore remain unverified in this environment.

## Local development

```powershell
npm install
npx prisma generate
$env:AUTH_PROVIDER="development"
$env:ORDER_STORE="memory"
$env:ENABLE_DEV_AUTH="true"
npm run dev
```

Development authentication is for local testing only. Never expose it through a public hostname or deployment.

## Durable local profile

```powershell
docker compose up --build
```

This is a local integration profile. It is not a production security baseline and its credentials must not be reused.

## Before a production launch

1. Use real secret-manager values and rotate any example secrets that may have been used.
2. Use PostgreSQL authentication and order storage, with database roles assigned by an admin.
3. Implement and test live payment checkout, signed webhooks, refunds, reconciliation, and idempotency.
4. Verify SMS delivery against provider sandbox credentials and define failure/ retry behavior.
5. Replace process-local rate limiting with a shared store.
6. Run the PostgreSQL/Redis integration, concurrency, SSE, load, browser, and backup tests.
7. Add HTTPS termination, centralized monitoring, alerting, backups, restore drills, and incident procedures.
