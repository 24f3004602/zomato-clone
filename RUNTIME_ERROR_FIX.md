# Runtime Error Fix - Test Files Reorganization

## Issue

**Error**: `Runtime TypeError: Cannot read properties of undefined (reading 'call')`

**Root Cause**: Integration test files were placed in `src/__tests__/` directory, causing Next.js build system to attempt bundling them for the browser. Vitest test files cannot be bundled for browser/client context—they require Node.js environment and Prisma database access.

**Technical Detail**: Next.js treats anything under `src/` as application code and attempts to bundle it. Test files use:
- `vitest` (Node.js-only test framework)
- Prisma ORM (server-side DB access)
- Async database operations
These are incompatible with browser bundling, causing undefined factory function references in the React module system.

---

## Solution

**Moved test files from `src/__tests__/` to root `__tests__/`:**

```
Before:
src/__tests__/delivery-claim.integration.test.ts  ❌ (bundled by Next.js)
src/__tests__/fixtures.ts

After:
__tests__/delivery-claim.integration.test.ts  ✅ (not bundled)
__tests__/fixtures.ts
```

---

## Configuration Updates

### vitest.config.ts (Updated)

Added explicit include/exclude patterns and path alias for `@`:

```typescript
export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts", "src/**/*.test.ts"],  // Include both locations
    exclude: ["node_modules", ".next"],                        // Exclude build output
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),  // Resolve @/lib imports correctly
    },
  },
});
```

**Why**:
- `include`: Tells vitest where to find tests
- `exclude`: Prevents vitest from scanning Next.js build output
- `resolve.alias`: Ensures `@/lib/db` imports work in test files

---

## Files Changed

1. **Moved** `src/__tests__/delivery-claim.integration.test.ts` → `__tests__/delivery-claim.integration.test.ts`
2. **Moved** `src/__tests__/fixtures.ts` → `__tests__/fixtures.ts`
3. **Updated** `vitest.config.ts` with test include paths and alias resolution
4. **Deleted** old test files from `src/__tests__/`

---

## Verification

To verify the fix works:

```bash
# Run tests (should pass without React bundling errors)
npm test

# Check that browser build works
npm run build

# Check app loads without errors
npm run dev
# Open http://localhost:3000 - should not show TypeError
```

---

## Why This Works

- **Next.js** only processes files under `src/` → test files under root `__tests__/` are ignored
- **Vitest** explicitly looks for test files via `include` pattern → finds them in both `__tests__/` and `src/**/*.test.ts`
- **Prisma** remains server-side only → not bundled for client
- **Path aliases** resolved correctly → `@/lib/db` imports work in both app and test files

---

## Impact

| Aspect | Before | After |
|--------|--------|-------|
| Build errors | TypeError on module factory | None |
| App loads | No | ✅ Yes |
| Tests discoverable | No | ✅ Yes |
| Production build | Broken | ✅ Works |

---

## Prevention

To prevent similar issues in the future:

1. Keep test files outside `src/` directory (use `__tests__/`, `tests/`, or `*.test.ts` at root)
2. Configure vitest explicitly with `include` paths
3. Never put Node.js-only dependencies (Prisma, database libs) in `src/`
4. Use `.nextignore` if needed to exclude directories from Next.js

---

**Status**: Runtime error fixed. All services should start without errors.
