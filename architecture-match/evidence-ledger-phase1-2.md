# Architecture-match evidence ledger (Phases 1-2)

**Date:** 2026-10-27  
**Product under review:** TableTrail (the current working tree)  
**Zomato scope:** consumer food ordering Android app and zomato.com only; Blinkit, District and Hyperpure excluded.

## Method and evidence rules

`OBSERVED` below means directly present in the source tree. It is not a runtime or production observation. `PUBLIC-CLAIM` means a published page, and the URL is included. `INFERRED` is reasoning from the cited evidence and includes an alternative explanation. `UNKNOWN` means the available boundary cannot establish the fact. Confidence is H/M/L.

The existing [evidence-ledger.md](./evidence-ledger.md) was not modified. This file is the additive ledger for this run.

## Phase 1: my architecture

| ID | Finding | Tag | Confidence | Evidence |
|---|---|---|---|---|
| TT-001 | The product is a Next.js 15.5.7 / React 19.1.1 TypeScript application. | OBSERVED | H | `package.json`; `src/app/` |
| TT-002 | The user-facing client in this repository is web-only; no Android source, Gradle project, APK or mobile module is present in the supplied tree. | OBSERVED | H | Workspace inventory; `src/app/`; `package.json` |
| TT-003 | The server and web UI are one deployable application with route handlers under `src/app/api` and shared code under `src/lib`; no separately deployable service directories are present. | OBSERVED | H | `src/app/api/**/route.ts`; `src/lib/**`; `Dockerfile` |
| TT-004 | Restaurant discovery is an in-process filter over a small static catalogue and menu list, including text, cuisine, vegetarian, price and open-now filters. | OBSERVED | H | `src/lib/domain.ts:1-75`; `src/app/page.tsx:1-63` |
| TT-005 | Persistent transactional storage is PostgreSQL through Prisma; the schema includes users, OTP challenges, sessions, addresses, restaurants, menu items, orders, order items, idempotency records and audit logs. | OBSERVED | H | `prisma/schema.prisma:1-175`; `docker-compose.prod.yml:14-39` |
| TT-006 | Orders store server-side prices/totals and status transitions; inventory count is optional on `MenuItem`, with no separate reservation or payment ledger model. | OBSERVED | H | `prisma/schema.prisma:47-148`; `src/lib/orders.ts:1-57` |
| TT-007 | Redis is used for order event publication and subscription; the client-facing real-time mechanism is SSE with polling fallback according to the README. | OBSERVED | H | `src/lib/realtime.ts:1-65`; `README.md` current-status section |
| TT-008 | The event shape is order/status/restaurant/delivery-partner identifiers; it contains no GPS position, ETA, route, courier telemetry or location update contract. | OBSERVED | H | `src/lib/realtime.ts:3` |
| TT-009 | Authentication is OTP/session based with customer, partner, admin and delivery roles in the schema; provider integrations are abstracted behind interfaces. | OBSERVED | H | `prisma/schema.prisma:12-45`; `src/lib/providers.ts:1-45`; `src/lib/auth.ts` |
| TT-010 | Payment and SMS implementations are not production-complete in the repository documentation; the provider interfaces and test/log implementations exist, while the README marks live payment and SMS as incomplete. | OBSERVED | H | `README.md` "Not implemented or verified"; `src/lib/providers.ts:47-220` |
| TT-011 | Maps are represented by a provider interface and mock/Mapbox implementations; the mock returns fixed coordinates and a fixed delivery estimate. | OBSERVED | H | `src/lib/providers.ts:25-45`, `src/lib/providers.ts:180-220` |
| TT-012 | Observability includes structured request logging, request IDs, Prometheus-compatible metrics and liveness/readiness routes; no tracing backend or error-tracking SDK is present in dependencies. | OBSERVED | M | `src/lib/logger.ts`, `src/lib/metrics.ts`, `src/app/api/health/**`, `package.json`; absence is bounded to the supplied tree |
| TT-013 | CI runs dependency audit, lint, typecheck, unit tests, build, Prisma validation and a PostgreSQL/Redis integration job. | OBSERVED | H | `.github/workflows/ci.yml:1-111` |
| TT-014 | The production compose file is a single app container with PostgreSQL and Redis, one exposed app port, and commented-out Nginx; horizontal scaling, load balancing, backup/restore and production pooling are not verified. | OBSERVED / UNKNOWN | H / M | `docker-compose.prod.yml:14-180`; `README.md` production caveats |
| TT-015 | No search index, recommendation model, feature-flag/experimentation service, review/rating write model, notification inbox, courier location stream, or durable event log is present in the supplied source. | OBSERVED | M | `package.json`; `prisma/schema.prisma`; `src/lib/**`; `src/app/api/**`; bounded absence, not proof of runtime absence |

## Phase 2: Zomato public baseline

| ID | Finding | Tag | Confidence | Evidence and freshness |
|---|---|---|---|---|
| Z-001 | The official Play Store listing identifies the consumer app package as `com.application.zomato` and describes food ordering, search/filtering, real-time tracking, payments, ratings/reviews and dining features. | PUBLIC-CLAIM | H | [Google Play listing](https://play.google.com/store/apps/details?id=com.application.zomato&hl=en-US), accessed 2026-10-27. Listing content can change. |
| Z-002 | Google’s Android case study reports Zomato at 43M+ active customers and 1.5M+ average daily orders at publication time, and reports a 30% app-load improvement, about 20% more fully-loaded homepages, and roughly 25% average cold-start improvement after a four-month optimization effort. | PUBLIC-CLAIM | H | [Android Developers case study](https://developer.android.com/stories/apps/zomato), accessed 2026-10-27; publication date is not stated in the retrieved page, so treat metrics as potentially stale. |
| Z-003 | The Android case study attributes improvements to Perfetto tracing, removing unused SDKs, lazy initialization/App Startup, flatter layouts/ViewStub use, profiling, and caching; it explicitly says Facebook SDK initialization was made conditional. | PUBLIC-CLAIM | H | [Android Developers case study](https://developer.android.com/stories/apps/zomato), accessed 2026-10-27; date not stated, potentially stale. |
| Z-004 | An AWS-published Zomato case study describes a data platform using Aurora MySQL-compatible storage, DynamoDB, EMR, Trino and Druid, with data ingestion/enrichment paths involving S3, Debezium, Kafka, Flink and Iceberg. | PUBLIC-CLAIM | H | [AWS Open Source blog](https://aws.amazon.com/blogs/opensource/how-zomato-boosted-performance-25-and-cut-compute-cost-30-migrating-trino-and-druid-workloads-to-aws-graviton/), 2023-04-21 (URL/page), accessed 2026-10-27. Older than two years; possibly stale. |
| Z-005 | The same AWS case study reports scale figures for analytics at publication time: Trino processing more than 250K queries over 2PB and Druid ingesting more than 20B events and serving 8M queries per week. | PUBLIC-CLAIM | H | [AWS Open Source blog](https://aws.amazon.com/blogs/opensource/how-zomato-boosted-performance-25-and-cut-compute-cost-30-migrating-trino-and-druid-workloads-to-aws-graviton/), 2023-04-21; older than two years, possibly stale. |
| Z-006 | The retrieved public material supports data-platform and Android-performance claims, but does not establish Zomato's current consumer API gateway, exact service count, current mobile UI toolkit, current experimentation platform, payment processor topology, dispatch internals, database ownership boundaries or current deployment topology. | UNKNOWN | H | REA has not inspected an APK, browser session or HAR; public pages retrieved above do not establish these private/backend facts. |
| Z-007 | Search leads mention MQTT, Kafka, SSL pinning, modularization and microservices, but the retrieved leads are secondary or unsourced and are not used as architecture facts. | UNKNOWN | H | Search results included non-primary articles; excluded from comparison because they do not meet the evidence rule. |
| Z-008 | The Zomato engineering blog could not be retrieved within the web-fetch timeout during this run. | UNKNOWN | H | `https://www.zomato.com/blog/`; no claim is inferred from the failure. |

## Phase 4: passive browser evidence

| ID | Finding | Tag | Confidence | Evidence |
|---|---|---|---|---|
| WEB-001 | A Chrome CDP session exposed a Zomato home page and a restaurant order page, both on `https://www.zomato.com`; target discovery also exposed a local CDP page, which was excluded from analysis. | OBSERVED | H | REA `list_browser_targets`, Evidence `ev_3c2016f4dc6659e1df20dfbd82effb1c4f4b511c8bb4de212c2b1eb460d788ce`, target list |
| WEB-002 | The home page inspection retained same-origin script URLs with an Astro-style `/z-homepage/_astro/` naming pattern and a `HomeLayout` bundle. This is a bundle naming observation, not proof of the complete rendering architecture. | OBSERVED | H | REA `inspect_web_page`, Evidence `ev_a35e6d62eb910b21e295e6bce777663185104a3365c68b65c200bd8aef2d1cf1`, scripts section |
| WEB-003 | The restaurant page inspection retained same-origin `/webroutes/getPage` link candidates for restaurant info and order paths, plus a `/zpaykit/js/v4/hook.js` script/resource. These are client-side URL/resource observations; they are not private API calls or payment behavior claims. | OBSERVED | H | REA `inspect_web_page`, Evidence `ev_26b9c2f1bc1f5d0ac47f0ec2ebaa773142b6b50ff4ffcf5c1d9dcabe1d787656`, metadata/scripts/resources sections |
| WEB-004 | The passive inspection reported no attach-window network requests or WebSocket connections for the selected restaurant target, and no requests for the home target. | OBSERVED | H | REA `inspect_web_page`, Evidence `ev_26b9c2f1bc1f5d0ac47f0ec2ebaa773142b6b50ff4ffcf5c1d9dcabe1d787656` and `ev_a35e6d62eb910b21e295e6bce777663185104a3365c68b65c200bd8aef2d1cf1`, network sections |
| WEB-005 | A 60-second observation window on the home target recorded no navigation timeline events; the target remained at the home URL. | OBSERVED | H | REA `observe_web_session`, Evidence `ev_308c331e614a82ef50075862483bab7d1c578f6e80a1ef6ee70bae8ab1251c65` |
| WEB-006 | The observation cannot establish that a user search occurred: the observation was armed after the reported action and its timeline was empty; earlier activity is explicitly unavailable. | UNKNOWN | H | REA `observe_web_session`, Evidence `ev_308c331e614a82ef50075862483bab7d1c578f6e80a1ef6ee70bae8ab1251c65`, limitations/completeness |

## Phase 3 and 5 status

| ID | Finding | Tag | Confidence | Evidence |
|---|---|---|---|---|
| BLOCK-001 | Android analysis is blocked: the supplied path is an APKPure `.xapk`, not the requested `base.apk` pulled from the user's own device, and REA doctor reports no configured caller-supplied JADX MCP JAR. | UNKNOWN | H | User-supplied path; `npx -y rea-agents@6.8.0 doctor --client vscode --json` reports `jadx` missing. No APK was analyzed. |
| BLOCK-002 | HAR analysis is blocked: the supplied path is a 1.4 MB extensionless file and the connected REA tool catalog does not advertise `inspect_web_network_capture`; REA doctor was run and no substitute decoder was used. | UNKNOWN | H | User-supplied path verification; REA tool search/catalog; doctor output. |

## REA coverage and limitations

The exported [REA evidence bundle](./rea-evidence-bundle.json) contains four retained browser records from the passive page/target observations. It contains no Android or HAR records. Therefore:

- Android internals, runtime-family hints, classes, methods and references are **not assessed** (base APK and JADX unavailable).
- Web rendering is only partially assessed from passive script/resource names; attach-window network shapes and WebSockets were empty and do not prove absence.
- HAR protocol/domain/auth/error/pagination evidence is **not assessed** (tool unavailable and file not accepted).
- Public and source-tree evidence cannot prove backend services, databases, queues, infrastructure, production scale or private API behavior.
- Absence from the source tree or future obfuscated static analysis is not proof of absence.
