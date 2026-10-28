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

## Phase 3-5 continuation: supplied APK, browser capture and HAR

| ID | Finding | Tag | Confidence | Evidence |
|---|---|---|---|---|
| A-001 | The supplied base APK identifies as `com.application.zomato`, version `19.9.8`, with min SDK 32, target SDK 37, 65,422 classes and 7,021 resources. | OBSERVED | H | REA `inspect_android_package`; Evidence `ev_25dcf59e085209da46b24bbb0a30800901211440599e39ff99dc5a14761de97c`; artifact SHA-256 `ce9da95fbd5f5830fc8d60ea749348793bfab3c221e62d11df02adc67dd9a40b` |
| A-002 | Static class evidence includes Hilt/Dagger, Retrofit 2, OkHttp/Cronet, Gson/Kotlin serialization/Wire converter classes, Firebase Analytics/Messaging and Coil/Glide image-loading classes. | OBSERVED | H | REA Android class searches and focused inspections; retained Evidence IDs in the exported bundle |
| A-003 | The APK contains separate normal, login and third-party Retrofit client factory patterns and per-tag/lazy client initialization. | OBSERVED | H | REA inspection of `com.zomato.commons.network.retrofit.RetrofitHelper` and Retrofit factory methods |
| A-004 | Manifest declarations include location, notifications, foreground service/data sync, camera, biometrics, contacts, audio/media/storage and attribution-related permissions. | OBSERVED | H | REA `inspect_android_package` manifest projection; static declarations do not prove runtime use or user grants |
| A-005 | A method named `reInitNonPinningCronetClients` is present in static code. This records a named code path only; no runtime execution or pinning bypass was performed. | OBSERVED | H | REA `inspect_android_method` focused method inspection |
| A-006 | No top-level `WebSocket` class matched the bounded Android class-name search. This does not establish that the app has no real-time transport. | UNKNOWN | H | REA bounded `search_android_classes`; obfuscation, alternate libraries, dynamic loading and native code remain possible |
| W-001 | Passive web evidence found `/z-homepage/_astro/` assets and `HomeLayout` bundle naming on the home page; same-origin restaurant-page inspection previously retained `/webroutes/getPage` URL candidates. | OBSERVED | H | REA `inspect_web_page` evidence from the supplied CDP session |
| H-001 | The supplied sanitized HAR decoded successfully: 348,909 bytes, 85 of 85 records retained, with no live URL fetching. | OBSERVED | H | REA `inspect_web_network_capture` summary; Evidence `ev_49a5546a2e4a4dbeb01acaaadfb47d405486871d591d8f48544e055c6b36ad47`; parent `ev_86eab920e74c7dc161f45719ac40c7517b31b3651e04a0419e8236add5d53886` |
| H-002 | The HAR is mostly homepage static assets and CDN media. Value-free record inspection found first-party `GET https://www.zomato.com/` (200), `GET /restaurant-onboard-diy/check-auth` (200), and `POST https://jumbo.zomato.com/event?user_id=-1` (200); no restaurant search/menu API flow was captured. | OBSERVED | H | REA capture preview and API-surface projection; query values and known credentials were excluded |
| H-003 | The HAR shows CDN media requests including HTTP 206 partial-content responses, consistent with range-served media in this capture. | OBSERVED | H | REA capture preview/API-surface projection; this is a transport observation, not an inference about backend storage |
| H-004 | The HAR does not establish Zomato's API domain boundaries, auth scheme, pagination, error envelope, idempotency headers, WebSocket use or server architecture because the relevant flows are absent from this capture. | UNKNOWN | H | REA capture coverage is complete for the 85 supplied records, but the recorded browsing scope is incomplete for those questions |

### REA coverage and limitations carried forward

- Android evidence is base-APK-only and static: split APKs, AAB-only modules, dynamic feature modules, native behavior and runtime configuration are not fully assessed.
- Static declarations and class names do not establish execution, server behavior, or production topology; obfuscation and bundled SDKs complicate attribution.
- Browser evidence is passive, same-origin and bounded; no login, payment, real order, navigation by the agent, or protection bypass occurred.
- HAR evidence is a retained historical capture. REA excluded known credentials/cookies and declared sensitive values; URLs were not fetched. Complete decoding does not establish live runtime attribution or deployment authenticity.rred from the failure. |

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
| BLOCK-001 | Superseded: the initially supplied APK was rejected as an APKPure `.xapk`; the later own-device base APK was accepted and analyzed after JADX configuration. | UNKNOWN | H | Earlier artifact verification; superseded by AND-005 onward. |
| BLOCK-002 | Superseded: the initially supplied extensionless file was not accepted as a HAR; the later sanitized HAR was decoded successfully by REA. | UNKNOWN | H | Earlier artifact verification; superseded by H-001 onward. |

## REA coverage and limitations

This section records the earlier blocked attempt and is superseded by the continuation sections below. The current exported [REA evidence bundle](./rea-evidence-bundle.json) includes Android and HAR records. Therefore:

- Android internals are assessed only within the static base-APK/JADX boundary; runtime-family hints and execution remain partial.
- Web rendering is only partially assessed from passive script/resource names; attach-window network shapes and WebSockets were empty and do not prove absence.
- HAR protocol/domain/auth/error/pagination evidence is assessed only for the 85 supplied records; absent flows remain unknown.
- Public and source-tree evidence cannot prove backend services, databases, queues, infrastructure, production scale or private API behavior.
- Absence from the source tree or future obfuscated static analysis is not proof of absence.

## Phase 3-5 update: supplied artifacts and coverage

| ID | Finding | Tag | Confidence | Evidence |
|---|---|---|---|---|
| AND-001 | The supplied base APK is a 120,521,421-byte APK with SHA-256 `ce9da95fbd5f5830fc8d60ea749348793bfab3c221e62d11df02adc67dd9a40b`. APK signature structure declares v2 and v3 blocks with a source stamp and consistent declared content digest; REA explicitly did not verify authenticity or signatures. | OBSERVED | H | REA `inspect_apk_signature`, Evidence `ev_ad2d4237d1b87e1a64bfd5a616cecb70be8095bf2c862290bebcb904cc18608` |
| AND-002 | JADX package loading failed with Java heap exhaustion at an observed maximum heap of about 1.95 GiB, including after the permitted timeout/heap recovery retry. | UNKNOWN | H | REA `inspect_android_package`, target SHA-256 above; provider error reports `java.lang.OutOfMemoryError` during `load_apk` |
| AND-003 | Android package metadata, classes, methods, SDK declarations, networking indicators, flags, analytics, maps, push and caching were not established because JADX could not load the APK. | UNKNOWN | H | REA `inspect_android_package` failure; no substitute decompiler used |
| AND-004 | Resource decoding was not available because the Windows apktool launcher was not found. | UNKNOWN | H | REA `decode_android_resources` capability-unavailable result; no external decoder used |
| HAR-001 | Superseded: the sanitized HAR was initially blocked by tool availability; it was later decoded as 85 retained records. | UNKNOWN | H | Earlier tool catalog state; superseded by H-001 through H-004 |
| WEB-007 | The current CDP target is a single logged-out-looking Zomato home page at `https://www.zomato.com/`; target discovery exposed no restaurant target in the current session. | OBSERVED | H | REA `list_browser_targets`, Evidence `ev_dd56c4a26ccaaf2de6ae4b253d89ddcfb50e58a43d2c286d4f15b58715f32955` |
| WEB-008 | Passive REA page inspection of the current home target retained same-origin page scripts/resources and JSON/WebSocket shape collection, but no claim about private API payloads is made from the bounded inspection. | OBSERVED | M | REA `inspect_web_page`, Evidence `ev_7ce0960d94cb62bf7d7abc9be9650ca9d98bf4314fc314cad20666d1c529affb`; output was retained in the exported bundle |

The exported [REA evidence bundle](./rea-evidence-bundle.json) now contains 41 retained records, including Android package/class/method searches, APK signature evidence, browser observations and the HAR capture summary/projections. The supplied DevTools screenshot is supporting user evidence only; it is not a REA capture and does not establish server-side behavior.

## Phase 3 gap-closure design records

The following are proposed designs for TableTrail, not observations about Zomato:

- Payment state machines, callback verification, reconciliation and tests: [payment-lifecycle.md](./payment-lifecycle.md).
- Versioned REST schemas and error/idempotency conventions: [api-contracts.yaml](./api-contracts.yaml).
- Logs, metrics, traces and privacy-conscious analytics: [observability-analytics.md](./observability-analytics.md).
- Redis-backed limits and local/staging load objectives: [scale-test-plan.md](./scale-test-plan.md).
- Synthetic dispatch, location/status events and notifications: [dispatch-location-notifications.md](./dispatch-location-notifications.md).
- Modular-monolith target architecture: [clone-architecture-spec.md](./clone-architecture-spec.md).

These recommendations do not upgrade any `UNKNOWN` Zomato backend claim to an observation.

## Phase 3 Android continuation

| ID | Finding | Tag | Confidence | Evidence |
|---|---|---|---|---|
| AND-005 | The APK package is `com.application.zomato`, version `19.9.8` / code `1710019980`, with min SDK 32 and target SDK 37. JADX loaded 65,422 classes and 7,021 resources. | OBSERVED | H | REA `inspect_android_package`, Evidence `ev_2991c7d8e3f293de3994d0fee66e46b7ecdba55ac660089393d6792271f2d709`; summary |
| AND-006 | The manifest declares fine/coarse location, camera, notifications, foreground service/data-sync, wake lock, phone/contact/audio/media/storage, biometric/fingerprint, boot completion, exact alarm, ad/attribution and Google/Firebase-related permissions. Permission declaration does not prove runtime requests or use. | OBSERVED / INFERRED | H / M | REA `inspect_android_package`, same Evidence; alternative: some permissions may come from bundled SDKs or legacy features rather than active consumer flows |
| AND-007 | Static class inventories contain Zomato's Retrofit helper, Retrofit 2, OkHttp, Cronet/OkHttp transport, Gson/Kotlin serialization/Wire converters, and a `NetworkCommunicator` integration. | OBSERVED | H | REA `search_android_classes` Evidence `ev_6d6f9da0ac914a4fd87234ac3a4be135791c3228365e5c3c810e8a0898c97a1d`; `inspect_android_class` Evidence `ev_7a7a3d3d9e0cc62c80b4670b87cd3175a57a5510154b504fe6dc72c351644beb` |
| AND-008 | `RetrofitHelper` exposes separate normal, login and third-party client creation, per-tag client maps, lazy tag initialization and client reinitialization. | OBSERVED | H | REA `inspect_android_class` Evidence `ev_7a7a3d3d9e0cc62c80b4670b87cd3175a57a5510154b504fe6dc72c351644beb`; `inspect_android_method` Evidence `ev_6a7fd8a65a860270dfa3add40b0d9f2a4ad2bbe2b5dfece8ad6d54f70a8e3d6b` |
| AND-009 | A method named `reInitNonPinningCronetClients` explicitly obtains a “non-pinning” client and rebuilds Retrofit clients from it. This proves a static code path/name, not when it runs or whether production traffic uses it. | OBSERVED | H | REA `inspect_android_method` Evidence `ev_833bded862046635c317b3035e32b4c4a8884418f074c53673116c81683a8e2c`; clean-room wording only |
| AND-010 | Dagger/Hilt classes are present, indicating a DI framework is bundled; exact application component graph and ownership are not established by this class-name search. | OBSERVED / INFERRED | H / M | REA `search_android_classes` Evidence `ev_8520d500ec0907e74203231940509f75ae0534d190c92421d2645ca871358af6` |
| AND-011 | Firebase Analytics and Firebase Messaging classes are present, supporting analytics and push-notification SDK integration at the shipped-code level. | OBSERVED | H | REA `search_android_classes` Evidence `ev_95b6ed54ac2a0d8b5c64eadfe3cc7292c85c6a6167470830245767103b3df00d`; Evidence `ev_a8741e024afb8ac05a93af23f1ffa7e2bfac51cc42457b2d8907836319ebad9d` |
| AND-012 | Coil 3, Glide OkHttp integration and OkHttp image fetcher classes are present, supporting image loading/caching dependencies; cache policy and runtime use remain unknown. | OBSERVED / UNKNOWN | H / M | REA `search_android_classes` Evidence `ev_95b6ed54ac2a0d8b5c64eadfe3cc7292c85c6a6167470830245767103b3df00d`; Evidence `ev_fbf1392536bbfd5a26318ab1b2f387aab5ee3dd82c0deeb693703057e44345b6` |
| AND-013 | No class-name match for `WebSocket` was found in the complete top-level class inventory. This does not prove no real-time channel exists because names may be obfuscated, implemented through another library, or dynamically loaded. | OBSERVED / UNKNOWN | H / H | REA `search_android_classes` Evidence `ev_09a4d61f7e8846708ffcb06c10e502d419c6dddc1afb08dbb2ff7864198e492e`; bounded negative search limitation |
| AND-014 | The base APK manifest includes an exported Zomato data content provider and AndroidX Startup provider; the provider class exposes standard CRUD methods. Static declarations do not establish external accessibility behavior or data content. | OBSERVED / UNKNOWN | H / H | REA package summary Evidence `ev_2991c7d8e3f293de3994d0fee66e46b7ecdba55ac660089393d6792271f2d709`; class Evidence `ev_9f92e7e46052b87710bc346c50910d797fd555a48ccd188e0601248a23bc64a1` |
