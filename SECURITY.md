# Security: Known Vulnerabilities and Mitigation

## Summary

This document outlines known security vulnerabilities in TableTrail's dependencies and the planned mitigation path.

**Current Status**: Known vulnerabilities exist in `Prisma` and `Next.js` major versions. These are not yet upgraded due to breaking changes and thorough testing requirements.

---

## npm Audit Findings

### High-Severity Vulnerabilities

#### 1. deepmerge-ts (via Prisma)
- **Affected Package**: `deepmerge-ts`
- **CVE**: Affects object prototype pollution in deep merge operations
- **Severity**: HIGH
- **Root Cause**: Transitive dependency from `@prisma/client@6.x`
- **Path**: `npm → @prisma/client → deepmerge-ts`
- **Status**: Requires Prisma major version upgrade
- **Mitigation Path**: 
  1. Test Prisma v7+ with current schema
  2. Review breaking changes in client generation
  3. Update and test all database operations
  4. Deploy to staging, run integration tests

#### 2. postcss (via Next.js)
- **Affected Package**: `postcss`
- **CVE**: Affects CSS processing in build pipeline
- **Severity**: HIGH (in dev/build context, not runtime)
- **Root Cause**: Transitive dependency from `next@15.x`
- **Path**: `npm → next → postcss`
- **Status**: Requires Next.js major version upgrade
- **Mitigation Path**:
  1. Test Next.js 16+ with current pages/components
  2. Review breaking changes in routing, rendering, API
  3. Verify middleware compatibility
  4. Test SSR/SSG behavior
  5. Deploy to staging, run end-to-end tests

### Moderate-Severity Vulnerabilities

#### 3. Additional Dependency Issue
- **Severity**: MODERATE
- **Status**: Under review
- **Action**: Track in next npm audit run

---

## Timeline to Resolution

### Phase 1: Assessment (Week 1)
- [ ] Document all breaking changes in Prisma v7
- [ ] Document all breaking changes in Next.js v16
- [ ] Create test matrix for compatibility
- [ ] Estimate effort and risk

### Phase 2: Development (Week 2-3)
- [ ] Create feature branch for dependency upgrades
- [ ] Upgrade Prisma to v7:
  - [ ] Update package.json
  - [ ] Run `npx prisma generate` to verify schema compatibility
  - [ ] Test all database queries in development
  - [ ] Test with actual PostgreSQL instance
- [ ] Upgrade Next.js to v16:
  - [ ] Update package.json
  - [ ] Test build pipeline
  - [ ] Test pages and API routes
  - [ ] Test middleware
  - [ ] Run full integration tests

### Phase 3: Testing (Week 3-4)
- [ ] Run full test suite
- [ ] Integration tests with PostgreSQL & Redis
- [ ] Concurrent order creation load testing
- [ ] Delivery partner workflow testing
- [ ] Admin role management testing
- [ ] Deploy to staging environment
- [ ] Run security scan: `npm audit --omit=dev`

### Phase 4: Deployment (Week 4)
- [ ] Deploy to production
- [ ] Monitor for errors in production logs
- [ ] Verify all workflows function as expected

---

## Temporary Mitigations (Until Upgrades)

### 1. Build-Time Vulnerabilities
- The affected packages (`postcss`, `deepmerge-ts`) are primarily used during the build phase
- Production container only includes compiled output
- **Mitigation**: Restrict build environment access, don't expose node_modules to runtime

### 2. Development Environment
- Only developers and CI/CD systems run `npm install`
- Use pinned versions in package-lock.json for reproducibility
- **Mitigation**: Keep development machines patched, audit npm scripts regularly

### 3. CI/CD Pipeline
- npm audit runs as part of CI, fails on high-severity production findings
- **Mitigation**: CI configuration prevents accidental deployment of unvetted changes

---

## Unresolved Security Tasks

### Before Production Launch
- [ ] Real payment integration with webhook signature verification (Razorpay)
- [ ] Real SMS delivery with provider failover (Fast2SMS)
- [ ] Distributed rate limiting (multi-instance support)
- [ ] HTTPS/TLS termination configuration
- [ ] Secrets rotation policy
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] SQL injection testing
- [ ] Authentication/authorization audit
- [ ] Data encryption at rest and in transit
- [ ] Backup encryption and restore testing

### Post-Launch
- [ ] Regular security audits (quarterly)
- [ ] Dependency update strategy
- [ ] Incident response plan
- [ ] Vulnerability disclosure policy

---

## Testing npm audit

### To check current status:
```bash
npm audit --omit=dev
```

### To see detailed information:
```bash
npm audit --omit=dev --json | jq '.vulnerabilities'
```

### After Prisma/Next.js upgrades:
```bash
npm audit --omit=dev
# Should return: 0 vulnerabilities
```

---

## References

- [Prisma v7 Upgrade Guide](https://www.prisma.io/docs/upgrade-guide/upgrade-from-prisma-5-to-prisma-6)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/upgrade-guide/version-15-to-16)
- [npm audit Documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [OWASP Dependency Vulnerabilities](https://owasp.org/www-community/attacks/Dependency_Confusion)

---

## FAQ

### Q: Can I use this in production with known vulnerabilities?
**A**: Not recommended. The vulnerabilities are in development/build dependencies, but they should be resolved before accepting user data or payments.

### Q: What's the impact if I don't upgrade?
**A**: The vulnerabilities primarily affect the build pipeline and development environments. Runtime impact is low, but risk increases with scale and sophisticated attacks.

### Q: How long does the upgrade take?
**A**: Estimated 2-4 weeks depending on breaking changes and testing requirements.

### Q: Will existing orders be affected?
**A**: No. The upgrade process preserves the database schema. Existing orders, users, and audit logs remain unchanged. The upgrade is at the application layer only.

---

## Contact

For security concerns, contact the development team before disclosing publicly.
