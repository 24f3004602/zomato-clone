# Production Roadmap & Known Issues

This document outlines the path to production for TableTrail, unresolved issues, and the sequence of work required before accepting real users or payments.

---

## Critical Path to Production

### Phase 1: Core Fixes (Completed ✅)

- ✅ Fix development auth privilege escalation (validateAuthConfiguration, dev user roles restricted to CUSTOMER)
- ✅ Fix order pricing using stale in-memory data (transactional pricing in PostgreSQL, client prices ignored)
- ✅ Add Redis readiness checks to health endpoint
- ✅ Fix Redis connection retry timeouts (1000ms, no retry on outage)
- ✅ Document npm vulnerabilities and upgrade path (SECURITY.md)
- ✅ Update README with honest implementation status
- ✅ Add RUNTIME_VERIFICATION.md with test results
- ✅ Add integration tests for concurrent delivery claims
- ✅ Create test fixtures with valid database users

### Phase 2: Production Deployment Prerequisites (Required)

| Priority | Task | Effort | Risk | Verification |
|----------|------|--------|------|--------------|
| CRITICAL | Real payment integration (Razorpay) | 2-3 weeks | HIGH | Webhook signature verification, refund flow, sandbox testing |
| CRITICAL | Real SMS delivery (Fast2SMS) | 1-2 weeks | HIGH | OTP delivery verification, retry logic, failover testing |
| CRITICAL | Resolve npm vulnerabilities | 2-4 weeks | HIGH | Prisma v7 + Next.js v16 upgrades with full testing |
| HIGH | Distributed rate limiting | 1-2 weeks | MEDIUM | Redis-backed limiter, multi-instance testing |
| HIGH | PostgreSQL migration path | 1 week | HIGH | Test db:migrate:deploy on current schema, rollback procedure |
| HIGH | HTTPS/TLS termination | 3-5 days | MEDIUM | Nginx/Traefik config, Let's Encrypt cert rotation |
| MEDIUM | Secrets rotation policy | 2-3 days | MEDIUM | Automated key rotation, version tracking |
| MEDIUM | Production monitoring | 1-2 weeks | MEDIUM | Prometheus/Grafana or DataDog integration, alerting rules |
| MEDIUM | Database backup & restore | 1 week | MEDIUM | Daily automated backups, restore procedure, RTO/RPO targets |

### Phase 3: Pre-Launch Testing (Required)

- [ ] **Load testing**: 100+ concurrent authenticated users, 10+ orders/second
- [ ] **Integration testing**: PostgreSQL transaction integrity, Redis failover, delivery claim atomicity
- [ ] **Chaos testing**: Network partitions, service restarts, clock skew
- [ ] **Security audit**: SQL injection, XSS, CSRF, authentication bypass, privilege escalation
- [ ] **Browser/device testing**: Chrome, Safari, Firefox; iOS, Android; accessibility (WCAG AA)
- [ ] **Performance baseline**: P50/P95/P99 latency, error rates, resource utilization
- [ ] **Backup/restore drill**: Full production backup, restore to test database, verify data integrity

### Phase 4: Launch Readiness (Final Approval)

Before going live:
1. [ ] Incident response plan and on-call rotation in place
2. [ ] Monitoring and alerting fully configured and tested
3. [ ] Runbooks for common failures (database down, Redis down, API crash)
4. [ ] Log aggregation (CloudWatch, ELK, Datadog) configured
5. [ ] Rate limiting active and validated
6. [ ] HTTPS working end-to-end with valid certificate
7. [ ] Secrets stored in production secret manager (AWS Secrets Manager, HashiCorp Vault)
8. [ ] All integration tests passing (100% pass rate)
9. [ ] Production database backup confirmed
10. [ ] Load test completed with acceptable latency (<500ms P95)

---

## Unresolved Critical Issues

### 1. Real Payment Processing

**Status**: NOT IMPLEMENTED  
**Impact**: Cannot accept payment from real users  
**Current State**: Razorpay provider class exists but returns mock checkout URL; does not create live Razorpay orders

**What's Required**:
1. Implement `RazorpayProvider.createCheckout()` to call Razorpay API:
   - POST `/v1/orders` with amount, currency, receipt
   - Store order ID in database for tracking
   - Return actual checkout URL (not mock)
2. Implement webhook handler at `POST /api/payments/webhook`:
   - Verify webhook signature using secret key
   - Update order status to PAID on successful payment
   - Handle failed payment notifications
   - Implement idempotency (webhook may be retried)
3. Test end-to-end:
   - Create order via `/api/orders`
   - Redirect to Razorpay checkout
   - Complete test payment
   - Verify webhook received and order marked PAID
   - Verify customer can view order with payment status

**Testing Checklist**:
- [ ] Razorpay Sandbox API credentials configured
- [ ] Webhook signature verification tested
- [ ] Test payment flow end-to-end
- [ ] Refund flow tested (partial & full)
- [ ] Webhook retry handling verified
- [ ] Payment timeout handling (user closes checkout)

**Timeline**: 2-3 weeks

---

### 2. Real SMS Delivery

**Status**: NOT IMPLEMENTED  
**Impact**: OTP cannot be delivered to real users  
**Current State**: Fast2SMS provider class exists but not integrated; OTP logged to stdout in development

**What's Required**:
1. Verify Fast2SMS credentials are configured in production
2. Test SMS delivery:
   - RequestOTP API to `/api/auth/request-otp`
   - Confirm SMS arrives on actual phone
   - Verify OTP format and validity window
3. Implement retry logic:
   - Fast2SMS API may temporarily fail
   - Retry with exponential backoff (3-5 attempts)
   - Log all failures for debugging
4. Implement failover (optional but recommended):
   - Have backup SMS provider (Twilio, AWS SNS)
   - Switch to backup if primary fails for N messages
5. Monitor SMS delivery:
   - Track delivery success rate
   - Alert if <95% of OTPs deliver successfully
   - Track delivery latency (target: <1s)

**Testing Checklist**:
- [ ] Fast2SMS API credentials working
- [ ] Actual SMS received on real phone
- [ ] Retry logic handles transient failures
- [ ] Delivery rate >95%
- [ ] Latency <1 second average

**Timeline**: 1-2 weeks

---

### 3. Dependency Vulnerabilities

**Status**: PENDING  
**Impact**: Security risk; blocks production launch  
**Current State**: 4 high-severity, 1 moderate vulnerability in Prisma and Next.js dependencies

**Required Upgrades**:
1. Prisma v6 → v7:
   - Breaking changes in client generation
   - Test all database queries
   - Verify migrations still work
   - Update type definitions
2. Next.js v15 → v16:
   - Breaking changes in routing, middleware, API
   - Test SSR/SSG rendering
   - Verify API routes
   - Test middleware authentication

**Testing Checklist**:
- [ ] Prisma v7 schema compatibility verified
- [ ] All database operations tested
- [ ] Next.js v16 pages rendered correctly
- [ ] API routes functional
- [ ] Middleware works as expected
- [ ] Full test suite passing
- [ ] `npm audit --omit=dev` returns 0 vulnerabilities

**Timeline**: 2-4 weeks

---

### 4. Distributed Rate Limiting

**Status**: NOT IMPLEMENTED  
**Impact**: Multi-instance deployments vulnerable to abuse (each instance has independent limits)  
**Current State**: Process-local in-memory rate limiter

**What's Required**:
1. Replace in-memory limiter with Redis-backed limiter:
   - Use Redis `SETEX` or Lua scripts for atomic increment
   - TTL of rate limit window
   - Per-IP and per-user rate limits
2. Configure limits in production:
   - OTP requests: 5 per IP per hour
   - OTP verification: 10 per IP per 15 minutes
   - Order creation: 10 per user per hour
   - Discovery API: 100 per IP per minute
3. Test across multiple instances:
   - Spawn 2+ app instances
   - Simulate abuse from single IP
   - Verify limits enforced globally (not per-instance)

**Testing Checklist**:
- [ ] Redis-backed limiter implemented
- [ ] Limits enforced across instances
- [ ] Cleanup of expired keys verified
- [ ] Performance impact <10ms per request

**Timeline**: 1-2 weeks

---

## Medium-Priority Issues

### 5. Migration Rollout Strategy

**Status**: UNTESTED  
**Impact**: Database schema changes may fail or corrupt data in production  
**Current State**: Migrations work in development; production rollout not tested

**What's Required**:
1. Test `npm run db:migrate:deploy` on staging PostgreSQL
2. Document migration rollback procedure
3. Implement zero-downtime migrations:
   - Can new app version work with old schema? (backwards compatibility check)
   - Can old app version work with new schema? (forward compatibility check)
4. Staging test:
   - Deploy v1 of app
   - Create test data
   - Deploy v2 with schema changes
   - Verify data integrity
   - Rollback to v1
   - Verify app still works

**Timeline**: 1 week

---

### 6. HTTPS/TLS Termination

**Status**: NOT CONFIGURED  
**Impact**: All traffic is HTTP; credentials sent in plain text  
**Current State**: Docker Compose app runs on port 3000 with HTTP only

**What's Required**:
1. Add Nginx reverse proxy:
   - Listen on 443 (HTTPS)
   - Forward to app on port 3000 (HTTP)
   - Redirect HTTP→HTTPS
   - Set security headers (HSTS, CSP, X-Frame-Options)
2. Install SSL certificate:
   - Use Let's Encrypt with Certbot
   - Auto-renewal 30 days before expiry
   - Monitor certificate expiration
3. Test:
   - curl https://tabletrail.co.in/api/health
   - Verify certificate is valid
   - Verify HTTP redirects to HTTPS

**Timeline**: 3-5 days

---

### 7. Production Monitoring

**Status**: PARTIAL (process-local metrics only)  
**Impact**: Cannot see errors, performance issues, or resource exhaustion in production  
**Current State**: `/api/metrics` exposes Prometheus format; no dashboards or alerting

**What's Required**:
1. Set up centralized monitoring:
   - Prometheus (or DataDog/New Relic)
   - Scrape `/api/metrics` every 30 seconds
   - Store metrics for 30 days
2. Create dashboards:
   - Request rate, latency (P50/P95/P99)
   - Error rate, error types
   - Database query latency
   - Redis connection pool usage
   - CPU, memory, disk usage
3. Set up alerting:
   - Error rate >1% → alert
   - P95 latency >1000ms → alert
   - PostgreSQL unreachable → alert
   - Redis unreachable → alert
   - Disk usage >80% → alert
4. Configure log aggregation:
   - Ship logs to CloudWatch/ELK/Datadog
   - Search by request ID, user ID, error type

**Timeline**: 1-2 weeks

---

## Low-Priority But Recommended

### 8. Backup & Disaster Recovery

**Status**: PARTIAL (daily backups in docker compose; production backup not tested)  
**Impact**: Data loss if production database fails without backup  
**Current State**: docker-compose down -v deletes data; no production backup strategy

**What's Required**:
1. Automated daily backups:
   - `pg_dump` → S3 daily at 2 AM UTC
   - Retain for 30 days
   - Test restore procedure weekly
2. Backup verification:
   - Restore backup to test database
   - Verify all tables, indexes, constraints intact
   - Check data integrity (row counts, checksums)
3. Disaster recovery:
   - Document RTO (target: 1 hour)
   - Document RPO (target: 24 hours)
   - Restore from backup to production (dry run monthly)

**Timeline**: 1 week

---

### 9. Load Testing

**Status**: NOT DONE  
**Impact**: Baseline performance unknown; scaling decisions guessed  
**Current State**: App tested with <10 concurrent users only

**What's Required**:
1. Use k6 or Apache JMeter to simulate load:
   - 100 concurrent users
   - Realistic workflow: browse → search → add cart → checkout
   - Ramp up over 5 minutes
   - Hold for 20 minutes
   - Measure P50/P95/P99 latency, error rate
2. Identify bottlenecks:
   - Database query performance
   - Redis connection pool
   - Memory usage spike
   - CPU utilization
3. Scale up incrementally:
   - Test with 500 concurrent users
   - Test with 1000 concurrent users
   - Verify horizontal scaling works

**Timeline**: 1-2 weeks

---

### 10. Security Audit

**Status**: NOT DONE  
**Impact**: Undiscovered vulnerabilities in authentication, authorization, data handling  
**Current State**: Code review done; professional security audit not done

**What's Required**:
1. Penetration testing:
   - SQL injection attempts
   - XSS/CSRF attacks
   - Authentication bypass
   - Privilege escalation (dev user → partner)
   - Payment tampering
2. Code review checklist:
   - Input validation on all endpoints
   - Output encoding
   - Rate limiting
   - Authentication checks
   - Authorization checks
   - Sensitive data logging
3. Compliance:
   - Data retention policy
   - GDPR compliance (if EU users)
   - PCI-DSS (if storing card data)

**Timeline**: 2-3 weeks

---

## Timeline to Production

**Optimistic (if everything goes smoothly)**:
- Week 1: Payment + SMS integration
- Week 2: Dependency upgrades
- Week 3: Distributed rate limiting + migration testing
- Week 4: HTTPS + monitoring
- Week 5: Load testing + security audit
- Week 6: Final hardening + launch readiness

**Realistic (accounting for bugs, rework)**:
- 8-10 weeks

**Before going live**:
- All integration tests passing
- Load testing complete (P95 <500ms)
- Incident response plan in place
- Monitoring and alerting active
- 24-hour on-call rotation staffed

---

## Go/No-Go Checklist

**Do NOT launch production until ALL of these are YES:**

- [ ] Real payment integration complete and tested with Razorpay Sandbox
- [ ] Real SMS delivery complete and tested with Fast2SMS
- [ ] npm audit shows 0 high-severity vulnerabilities
- [ ] Distributed rate limiting deployed
- [ ] Migration rollout tested
- [ ] HTTPS working end-to-end
- [ ] Monitoring and alerting configured
- [ ] Backup and restore tested
- [ ] Load test passed (P95 <500ms with 100+ concurrent users)
- [ ] Security audit completed, critical issues fixed
- [ ] All integration tests passing (100% pass rate)
- [ ] Incident response plan documented and staffed
- [ ] On-call rotation in place
- [ ] Production secrets stored in secret manager (not in code)

---

## References

- Production Readiness: README.md "Production readiness" section
- Known Vulnerabilities: SECURITY.md
- Runtime Verification: RUNTIME_VERIFICATION.md
- Integration Tests: src/__tests__/
- Test Fixtures: src/__tests__/fixtures.ts

---

**Last Updated**: 2026-10-26  
**Status**: Ready for Phase 2 (Production Deployment Prerequisites)
