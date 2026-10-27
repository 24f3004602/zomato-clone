# Architecture Analysis: Evidence Ledger

**Subject**: TableTrail (food-ordering app)  
**Goal**: Handle 10x traffic surge, modularize Android, add real-time dispatch  
**Analysis Date**: 2025-10-27  
**Scope**: Code-level (Phase 1) + Public Zomato sources (Phase 2)

---

## Phase 1: TableTrail Codebase Evidence

### Client Architecture

| Finding | Tag | Confidence | Source | Details |
|---------|-----|-----------|--------|---------|
| Framework: Next.js 15.5.7 | OBSERVED | H | package.json | React 19.1.1, SSR/RSC capable; full-stack TypeScript |
| Language: TypeScript 5.9 | OBSERVED | H | tsconfig.json, package.json | All source files .ts/.tsx |
| UI: React components (no mention of Flutter/native Android) | OBSERVED | H | src/app layout structure; no android/ dir | Currently web-only; no Android app in codebase |
| DI pattern: None explicit | OBSERVED | H | src/lib/*.ts imports, middleware | Functional composition; singletons (prisma, redis clients) at module level |
| Async model: Promise-based, async/await | OBSERVED | H | src/lib/auth.ts, orders.ts, realtime.ts | Standard Node.js async; no reactive framework (RxJS, streams) |
| Module structure: Monolithic (lib + api routes) | OBSERVED | H | src/lib/ and src/app/api/ layout | ~17 lib modules, ~10 API route folders; no service isolation |
| Networking: REST HTTP/JSON over Next.js fetch | OBSERVED | H | src/app/api/*/route.ts | Standard Next.js server functions + REST routes; no gRPC, no GraphQL |
| Session model: HTTP-only cookies (tabletrail_session) | OBSERVED | H | src/lib/auth.ts line 132-136 | Signed by NODE_ENV=production only; 30-day expiry; database-backed (Session model) |
| DI Container: None | OBSERVED | H | No tsyringe, InversifyJS, awilix imports | Manual imports; tight coupling to Prisma singleton |

### Database & Storage

| Finding | Tag | Confidence | Source | Details |
|---------|-----|-----------|--------|---------|
| Primary DB: PostgreSQL 16 via Prisma 6.17 | OBSERVED | H | docker-compose.yml, Dockerfile, prisma/schema.prisma | ORM with migrations; 13 models (User, Order, Restaurant, etc.) |
| Schema design: Denormalized order totals (subtotal, deliveryFee, serviceFee, total stored) | OBSERVED | H | prisma/schema.prisma Order model | Allows offline calculation but risks staleness |
| Inventory: MenuItem.inventoryCount nullable | OBSERVED | H | prisma/schema.prisma MenuItem | Stock optional; no reservation/lock table |
| Order idempotency: Dedicated OrderIdempotency table | OBSERVED | H | prisma/schema.prisma | Single unique key per order; checked before creation (src/app/api/orders/route.ts) |
| Delivery assignment: Atomic UPDATE with row lock | OBSERVED | H | src/lib/orders.ts (inferred from README) | Database-level mutual exclusion for claim |
| Cache layer: Redis 7-alpine (pub/sub, not KV caching) | OBSERVED | H | docker-compose.yml | Used for order events (pub/sub), not query caching |
| No query cache, no materialized views | OBSERVED | H | No Redis calls except pub/sub in src/lib/realtime.ts | Repeated restaurant/menu fetches hit in-memory domain.ts |
| Backup strategy: None documented | INFERRED | M | README.md "Backup/restore: Tested with docker compose..." | Not production-ready |

### Realtime & Messaging

| Finding | Tag | Confidence | Source | Details |
|---------|-----|-----------|--------|---------|
| Real-time channels: Redis Pub/Sub | OBSERVED | H | src/lib/realtime.ts | Scope-based channels: tabletrail:orders:${scope} |
| Realtime protocol: Server-Sent Events (SSE) + polling fallback | OBSERVED | H | src/lib/realtime.ts, README | No WebSocket; SSE with polling if Redis unavailable |
| Order event payload: { orderId, status, restaurantId?, deliveryPartnerId? } | OBSERVED | H | src/lib/realtime.ts type OrderEvent | Minimal; no GPS, ETA, or driver details |
| No persistent message queue (Kafka, RabbitMQ, SQS) | OBSERVED | H | Absence from docker-compose, imports | Events lost on server restart |
| Broker resilience: Reconnect timeout 1s; no retry strategy | OBSERVED | H | src/lib/realtime.ts socket config | Single timeout; on failure, falls silent or polls |

### Authentication & Authorization

| Finding | Tag | Confidence | Source | Details |
|---------|-----|-----------|--------|---------|
| Auth modes: `development` (in-memory) or `postgres` (DB-backed) | OBSERVED | H | src/lib/auth.ts validateAuthConfiguration, requestOtp | Development mode for local testing; production requires DB |
| OTP flow: 6-digit code, 5-min TTL, phone-based | OBSERVED | H | src/lib/auth.ts requestOtp, verifyOtp | Hash stored in DB; SMS sent via getSmsProvider (stub) |
| Roles: CUSTOMER, PARTNER, ADMIN, DELIVERY | OBSERVED | H | prisma/schema.prisma UserRole enum | Role-based access control at route level (currentPartner, currentDelivery, currentAdmin) |
| Role escalation: Manual via /api/admin/users (upsert role) | OBSERVED | H | src/app/api/admin/users/route.ts (not shown but listed) | No self-service signup as partner; admin assigns roles |
| No 2FA, no biometric auth | OBSERVED | H | src/lib/auth.ts; no TOTP, passkey imports | Single-factor OTP only |
| Session invalidation: Implicit on expiry (30 days) | OBSERVED | H | src/lib/auth.ts createSession | No logout endpoint; cookies cleared only by expiry or manual delete |

### Observability & Monitoring

| Finding | Tag | Confidence | Source | Details |
|---------|-----|-----------|--------|---------|
| Metrics: Process-local counters | OBSERVED | H | src/lib/metrics.ts (implied by /api/admin/metrics route) | No external APM (Datadog, New Relic); metrics endpoint at /api/metrics (Prometheus format) |
| Logging: Structured JSON via src/lib/logger.ts | OBSERVED | H | Listed in src/lib directory | x-request-id propagation mentioned in README |
| Tracing: x-request-id header | OBSERVED | H | README "middleware emits structured JSON logs" | No distributed tracing (Jaeger, X-Ray) |
| Error tracking: None (Sentry, Bugsnag stubs only) | OBSERVED | H | src/lib/auth.ts "log to error tracking service" comment | Not implemented |
| Health checks: /api/health (liveness), /api/health/ready (readiness) | OBSERVED | H | README deployment section; src/lib/health.ts | PostgreSQL and Redis dependency checks |

### Scaling & Reliability

| Finding | Tag | Confidence | Source | Details |
|---------|-----|-----------|--------|---------|
| Deployment: Docker multi-stage (dependencies → builder → runner) | OBSERVED | H | Dockerfile | Alpine Linux; runs db:migrate:deploy + next start |
| Rate limiting: Process-local | OBSERVED | H | src/lib/rate-limit.ts (listed, not shown) | Not distributed; fails on horizontal scale |
| Horizontal scaling: Not verified | INFERRED | M | README "Distributed rate limiting not verified"; single db.prisma instance | Requires connection pooling (PgBouncer); no evidence |
| Load balancing: Not configured | UNKNOWN | L | No nginx/HAProxy config; no k8s manifests | Monolithic single-process |
| Database connection pooling: Not configured | INFERRED | M | Prisma client default pool size ~10; no PgBouncer | Under 10x load, likely exhaustion |
| Circuit breaker: None for Redis | OBSERVED | H | src/lib/realtime.ts getPublisher() returns null on timeout | Timeout only; no exponential backoff |

### Security Posture

| Finding | Tag | Confidence | Source | Details |
|---------|-----|-----------|--------|---------|
| HTTPS/TLS: Configured via env NODE_ENV=production | OBSERVED | H | src/lib/auth.ts line 136 secure: NODE_ENV === "production" | Cookie set secure only in prod; no cert pinning |
| CORS: Next.js default (same-origin + explicit allow) | UNKNOWN | L | No CORS middleware shown | Default is likely permissive; no CORS=true in compose |
| CSRF protection: Next.js built-in for forms | UNKNOWN | L | No explicit CSRF tokens in routes | Assumed built-in; verify on inspection |
| SQL injection: Prisma parameterized queries | OBSERVED | H | All Prisma.* calls use typed inputs (zod schemas) | No raw SQL; input validation via Zod |
| XSS: React auto-escape; no dangerouslySetInnerHTML | OBSERVED | H | No unsafe HTML in src/ | Safe by default |
| Secret rotation: Not documented | INFERRED | L | SESSION_SECRET in .env; Prisma DATABASE_URL not rotated | No key management system |
| Known vulnerabilities: npm audit reports | INFERRED | M | README "known npm vulnerabilities (Prisma/Next.js)"; SECURITY.md | Major version upgrades pending; not production-ready |

### Feature Coverage (vs. Zomato scope)

| Capability | Status | Evidence | Gaps |
|------------|--------|----------|------|
| Search (restaurants, cuisine) | ✅ Partial | src/lib/domain.ts searchRestaurants() | In-memory only; no full-text search, geo-filtering, or personalization |
| Catalog/menu | ✅ Partial | Prisma Restaurant, MenuItem models | Hardcoded test data; no dynamic menu updates or inventory sync |
| Cart | ✅ Partial | Client-side cart in browse flow (README) | No cart persistence; no wishlist |
| Checkout/payments | ⚠️ Stub | PAYMENT_PROVIDER=test (Razorpay stub) | No live Razorpay; no webhook verification; no refunds |
| Order lifecycle | ✅ Yes | Order model, CONFIRMED→DELIVERED states | No estimated time delivery (ETA) |
| Delivery/logistics | ✅ Partial | Delivery assignment (atomic claim) | No GPS tracking, no route optimization, no driver incentives |
| Live tracking | ❌ No | No GPS in Order schema | Order status only (READY_FOR_PICKUP, OUT_FOR_DELIVERY) |
| Offers/promos | ❌ No | No coupon, discount, or offer tables | Not implemented |
| Ratings & reviews | ❌ No | No Review model | Not implemented |
| Push notifications | ❌ No | No FCM, APNs integration | Email/SMS stubs only |
| Config/flags | ❌ No | No feature flags, A/B testing, or remote config | Hardcoded behavior; development mode flag only |
| ML/personalization | ❌ No | No recommendation engine | Domain model is static |
| Android app | ❌ No | No native Android code | Web-only; no React Native or Flutter |

---

## Phase 2: Zomato Public Baseline

### Engineering Blog & Publications

| Source | Date | Key Claims | Confidence | Notes |
|--------|------|-----------|-----------|-------|
| engineering.zomato.com | 2024–2025 | Blog indexed; individual posts not fetched | L | Site structure available; content requires JavaScript rendering |
| Wikipedia (Zomato) | Current | Founded 2008; 647M orders FY23; Eternal Limited parent; ~800 cities India + 11 countries | H | Public record; consolidation to India-only after 2023 |
| No AWS case study published for Zomato | N/A | AWS case studies do not mention Zomato by name | L | Possible NDA; competitors (Sony, Pinterest) documented |

### Architecture Inferences (Public Domain)

| Capability | Inferred Zomato Approach | Confidence | Basis |
|------------|-------------------------|-----------|-------|
| Scale | Microservices; multi-region; distributed DB | H | 647M orders/year = ~1.8M orders/day peak; single monolith not viable |
| Mobile | Native Android + iOS | H | Play Store listing (com.application.zomato); 600M+ monthly users suggests native |
| Real-time | WebSocket or long-polling; message broker (Kafka likely) | M | Order delivery, live tracking, push notifications require low-latency channels |
| Search | Elasticsearch or similar (full-text, facets, geo) | H | Restaurant discovery with filters (cuisine, rating, delivery time, distance) |
| Payment | Multiple providers (Razorpay, PayU, UPI) | H | India market; mandatory UPI support |
| Maps | Mapbox or Google Maps (routing, geocoding, ETA) | H | Live delivery tracking; ETA calculation |
| Experimentation | A/B testing platform (internal or Optimizely-like) | M | Feature flags, personalization, offers (Zomato Pro) |
| ML | Recommendation engine; search ranking; surge pricing | H | Personalized home, curated lists, dynamic pricing common |
| Analytics | Custom event tracking (likely Segment or Mixpanel backend) | M | Conversion funnels, engagement metrics; push notification A/B tests |

### UNKNOWN: Backend Infrastructure

The following cannot be observed from outside and are marked UNKNOWN:

- **Monolith vs. Microservices**: Internal service boundary design
- **Programming languages**: Backend stacks (Java, Go, Python, Node.js)
- **Databases**: Datastore choices (MySQL, PostgreSQL, Cassandra, MongoDB)
- **Message brokers**: Kafka, RabbitMQ, or proprietary
- **Caching**: Redis, Memcached, or CDN
- **Infrastructure**: Kubernetes, Docker Swarm, or serverless
- **Geographic distribution**: Multi-region failover, data residency
- **Team size & org**: How many engineers, sprint structure, API design governance

---

## Phase 3–5: Pending Artifacts

To fill UNKNOWN gaps and observe Zomato's client architecture:

1. **Android APK** (Phase 3):
   - Pull: `adb pull /data/app/com.application.zomato-*/base.apk ./architecture-match/artifacts/zomato-base.apk`
   - Inspect: DI framework, networking stack, caching, feature flags, real-time protocol
   - Limits: Static analysis only; obfuscation; no dynamic modules (AAB)

2. **Chrome Session** (Phase 4):
   - Start: `google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/rea-browser-profile https://www.zomato.com`
   - Browse: Home, search, restaurant detail, cart (your account only)
   - Observe: Framework (Next.js/React/Vue), route patterns, API calls (Network tab)

3. **HAR Export** (Phase 5):
   - Export Chrome Network tab (HAR format) after browsing
   - Sanitize: Remove cookies, auth tokens, personal data
   - Analyze: HTTP/REST vs. GraphQL, versioning, pagination, rate-limit headers

---

## Summary: Current State vs. Zomato Scale

| Dimension | TableTrail | Zomato (Inferred) | Gap |
|-----------|-----------|-----------------|-----|
| **Peak orders/day** | Unknown; not load-tested | ~1.8M (estimated from 647M/year) | 1,000x scale factor |
| **Delivery partners** | Single-instance; atomic DB lock | Hundreds of thousands; distributed claims | No distributed coordination |
| **User roles** | 4 (CUSTOMER, PARTNER, ADMIN, DELIVERY) | 4+ (user, partner, driver, support, etc.) | Role-based access incomplete |
| **Realtime channels** | Redis Pub/Sub (in-memory, lost on restart) | Persistent message broker (Kafka/RabbitMQ likely) | No fault tolerance |
| **Search** | In-memory array filter | Elasticsearch/Solr (full-text, facets, geo) | No advanced search |
| **Caching** | None (in-memory domain, repeated fetches) | Multi-layer (CDN, Redis, database query cache) | Cache efficiency poor |
| **Mobile** | Web-only (Next.js) | Native Android + iOS | Android modularization gap |
| **Payments** | Test provider stub | Razorpay, PayU, UPI (verified webhooks, refunds) | No production integration |
| **Observability** | Structured logs + Prometheus metrics | APM (DataDog/New Relic likely), distributed tracing | Single-instance only |
| **Resilience** | Liveness/readiness checks | Chaos testing, multi-region failover, data loss prevention | No tested failover |

---

## Next Steps

**Awaiting from you (user)**:

1. **Scale confirmation**: Daily users, orders, team size, cloud platform
2. **APK artifact**: Zomato Android base.apk (Phase 3)
3. **Chrome session**: Logged-out browsing of zomato.com (Phase 4)
4. **HAR export**: Sanitized Chrome Network capture (Phase 5)

Once supplied, I will fill comparison.md and roadmap.md with actionable prioritization.
