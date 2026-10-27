# Right-sized gap-closing roadmap

**Date:** 2026-10-27  
**Goal interpreted:** make the product testable end-to-end like a consumer food-ordering app, not reproduce Zomato's private implementation.

## Sequenced decisions

The order is impact over effort. Costs are relative to the current single-application team, not Zomato's organization. Thresholds are decision gates, not claims about Zomato.

| Priority | Gap | Benefit | Pays off at | Cost/risk now | Verdict |
|---:|---|---|---|---|---|
| 1 | Payment lifecycle is a stub/incomplete (`src/lib/providers.ts`, README caveat) | Enables realistic checkout, webhook retries, refunds and reconciliation tests | Immediately, because checkout is a core goal | Provider sandbox work, signature/idempotency edge cases and financial-state migrations | **ADOPT NOW** |
| 2 | No contract-level test surface or API version/error envelope | Makes web/mobile clients interchangeable and prevents accidental protocol drift | As soon as a second client (Android) exists | Moderate schema/test work; small latency/compatibility discipline cost | **ADOPT NOW** |
| 3 | No product analytics event taxonomy or centralized error/tracing path | Shows where test flows fail and gives evidence for scaling decisions | Immediately for a testing product; before personalization | Privacy/redaction and operational setup | **ADOPT NOW** |
| 4 | Process-local rate limiting and unverified horizontal scale | Prevents a multi-instance test from behaving inconsistently and protects OTP/order routes | At two app instances or shared staging | Redis coordination and failure-mode testing | **ADOPT NOW** |
| 5 | Backups, restore drill, pooling and load tests are not production-verified | Converts “runs locally” into repeatable test infrastructure | Before shared staging or any meaningful traffic | Operations time; load tests can expose schema/query work | **ADOPT NOW** |
| 6 | Missing durable notification/preferences model | Makes order state useful to users and supports push/email/SMS adapters | When testing multi-step order flows with more than one actor | Provider setup, consent and retry semantics | **ADAPT** |
| 7 | Missing courier dispatch and location/ETA contract | Closes the largest visible difference in live-delivery behavior | When delivery testing needs more than status transitions | Privacy, battery, geo simulation and real-time fanout complexity | **ADAPT** |
| 8 | Missing ratings/reviews and moderation model | Covers a major consumer feature and produces useful catalog feedback | When catalog has enough seeded restaurants/users to test ranking | Abuse/moderation and data retention | **ADAPT** |
| 9 | Search index and richer catalog read model | Handles larger menus, facets, geo and typo tolerance | When in-process catalogue exceeds a few thousand active items or p95 becomes a problem | Index lifecycle, consistency and operating another system | **LATER** |
| 10 | Offers/coupons and promotion ledger | Enables realistic discounts and conversion experiments | After payment/refund ledger and order totals are stable | Financial correctness and combinatorial rule testing | **LATER** |
| 11 | Durable outbox/event bus | Reliable fanout and replay without coupling transactional requests to consumers | When multiple consumers or event loss is measurable | New operational system and exactly-once misconceptions | **LATER** |
| 12 | ML recommendations/personalization | Better discovery after enough behavioral data exists | Only after a meaningful event volume, baseline ranking and an owner | Data governance, model evaluation, serving and cold-start complexity | **LATER** |
| 13 | Full microservice split, service mesh, multi-region platform | Independent scaling/ownership at organizational scale | Multiple teams, independently hot domains, or demonstrated deployment bottlenecks | Highest complexity: network failures, data ownership, on-call and CI/CD multiplication | **SKIP** for current scale |

## Implementation slices

### Slice 1: make one journey reliable

Keep the modular monolith. Define versioned schemas for discovery, cart, checkout, order status and identity; standardize errors and request IDs; add contract tests usable by a future Android client. Complete sandbox payment creation, signed webhook verification, idempotent state transitions, refund representation and reconciliation fixtures. Add redacted funnel events and a centralized error sink.

**Exit evidence:** repeatable logged-out discovery, authenticated checkout, payment success/failure, webhook retry, refund simulation, order status updates, and no secret/PII leakage in logs.

### Slice 2: make staging honest

Move rate limiting to Redis with a bounded fallback policy, configure database pooling, add backup/restore automation and a load test covering concurrent order creation and delivery claims. Add SLO dashboards for checkout latency/error rate, event delay, database saturation and notification delivery.

**Exit evidence:** two app instances produce the same limits and idempotency results; restore succeeds; load test thresholds are recorded; degraded Redis behavior is explicit.

### Slice 3: add the consumer capabilities that matter

Add a notification inbox/preferences model, then a simulator-backed dispatch/location contract with coarse, synthetic coordinates and retention limits. Add reviews and moderation states. Keep external providers behind the existing interfaces.

**Exit evidence:** a test scenario can create an order, assign a courier, emit synthetic location/ETA updates, notify the customer, complete delivery and collect a review without real payment or personal data.

### Slice 4: scale only measured bottlenecks

Introduce a transactional outbox if event loss or multiple consumers appears. Add a search index after measured query latency or catalogue size crosses the team’s threshold. Consider a recommendation baseline only after analytics events are trustworthy. Extract a service only when one domain has a distinct scaling or ownership need.

## Zomato-scale practices that would hurt at this scale

- **Premature microservices and service mesh:** multiplies deployment, tracing, failure and data-consistency work before there are independent teams or hot domains.
- **Kafka/Flink/Iceberg/Trino/Druid-style data platform:** useful for the public AWS-described workload, but unjustified for a small catalogue and test traffic; start with an event taxonomy and PostgreSQL exports.
- **ML personalization before instrumentation:** produces opaque behavior from sparse or synthetic data; a deterministic baseline is easier to test.
- **Real courier telemetry first:** adds privacy, battery, geo and operational risk; use a simulator and explicit location contract.
- **Multi-region active-active deployment:** creates payment/order consistency and incident complexity without evidence of regional demand.

## Unknowns to resolve in Phases 3-5

The APK, browser session and HAR can replace some `UNKNOWN` labels with client-side evidence about Android modules/SDKs, web rendering and observed network shapes. They cannot establish Zomato's server databases, queue topology, service count, deployment, or private algorithms. Any copied behavior should remain a clean-room prose/contract observation, not copied code, assets or endpoints.

