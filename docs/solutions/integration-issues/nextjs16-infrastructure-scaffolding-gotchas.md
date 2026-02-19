---
title: "Next.js 16 DDD Infrastructure Scaffolding Gotchas"
date: 2026-02-19
tags:
  - next.js-16
  - drizzle-orm
  - zod-v4
  - ultracite
  - oxlint
  - pnpm
  - typescript
  - postgresql
category: integration-issues
severity: medium
component:
  - proxy
  - schema-validation
  - database-orm
  - linting
  - build-configuration
framework: Next.js 16
resolution_time_saved: "2-3 hours"
related_plan: "2026-02-19-feat-infrastructure-project-scaffolding-plan.md"
---

# Next.js 16 DDD Infrastructure Scaffolding Gotchas

Six integration pitfalls encountered when setting up a DDD/hexagonal architecture project with Next.js 16, Drizzle ORM, Zod v4, and Ultracite (oxlint + oxfmt). None are bugs — they're setup gotchas that waste time when undocumented.

## 1. Next.js 16: middleware.ts renamed to proxy.ts

**Symptom:** Build warning: `The "middleware" file convention is deprecated. Please use "proxy" instead.`

**Root cause:** Next.js 16 renamed the middleware convention to clarify its purpose as a network proxy, not Express-style middleware.

**Solution:**

```diff
- // middleware.ts
- export function middleware(request: NextRequest) {
+ // proxy.ts
+ export function proxy(request: NextRequest) {
```

The `config` export with `matcher` stays the same. Migration docs: https://nextjs.org/docs/messages/middleware-to-proxy

**Prevention:** When scaffolding Next.js 16 projects, always use `proxy.ts` — not `middleware.ts`. Check the Next.js version before following any middleware tutorial.

## 2. Zod v4: import path and API changes

**Symptom:** Confusion between `import { z } from "zod"` vs `import { z } from "zod/v4"`. Also, `z.string().url()` is now `z.url()`.

**Root cause:** Zod v4 uses the standard `"zod"` import. String format validators moved to top-level functions for better tree-shaking.

**Solution:**

```typescript
// Correct for Zod v4
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1), // simple string validation
  API_KEYS: z
    .string()
    .min(1)
    .transform((s) => s.split(",")),
});
```

**Prevention:** Pin Zod to a specific major version. When in doubt, `import { z } from "zod"` is always correct for Zod v4.

## 3. Drizzle ORM: empty schema barrel file is not a module

**Symptom:** `TS2306: File '/src/db/schema/index.ts' is not a module.`

**Root cause:** A file with only comments is not a TypeScript module. Any file imported with `import * from` must have at least one export.

**Solution:**

```typescript
// src/db/schema/index.ts
// Re-exports all bounded context schemas.
export {};
```

**Prevention:** Always add `export {}` to barrel files during scaffolding, even before real exports exist.

## 4. postgres.js driver needs serverExternalPackages

**Symptom:** Build or runtime errors when using Drizzle ORM with `postgres` driver in Next.js.

**Root cause:** `postgres` (postgres.js) requires Node.js runtime and cannot be bundled for Edge.

**Solution:**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
```

**Prevention:** When adding any Node.js-native database driver to Next.js, immediately add it to `serverExternalPackages`.

## 5. pnpm v10: esbuild build scripts blocked

**Symptom:** `Warning: Ignored build scripts: esbuild` — then drizzle-kit commands fail.

**Root cause:** pnpm v10 requires explicit approval for package post-install scripts as a security measure.

**Solution:**

```json
// package.json
{
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild"]
  }
}
```

Then run `pnpm install` and `pnpm rebuild esbuild`.

**Prevention:** After installing any package that shows "Ignored build scripts" warnings, add it to `onlyBuiltDependencies` immediately.

## 6. Ultracite init: config filenames and script merging

**Symptom:** Expected `.oxfmt.json` but got `.oxfmtrc.jsonc`. The existing `lint` script still points to `eslint`.

**Root cause:** `npx ultracite init --linter oxlint` creates `.oxlintrc.json` and `.oxfmtrc.jsonc` (not `.oxfmt.json`). It adds `check` and `fix` scripts but does not update the existing `lint` script.

**Solution:** After running init, manually update scripts:

```json
{
  "scripts": {
    "lint": "ultracite check",
    "lint:fix": "ultracite fix"
  }
}
```

Also remove old ESLint dependencies: `pnpm remove eslint eslint-config-next` and delete `eslint.config.mjs`.

**Prevention:** After any linter migration, review `package.json` scripts and remove old config files + dependencies.

## Quick Reference

| Gotcha                               | Fix                                                 |
| ------------------------------------ | --------------------------------------------------- |
| middleware.ts deprecated             | Rename to `proxy.ts`, function to `proxy()`         |
| Zod v4 imports                       | Use `import { z } from "zod"` (not `zod/v4`)        |
| Empty barrel file TS2306             | Add `export {}`                                     |
| postgres.js in Next.js               | Add to `serverExternalPackages` in next.config.ts   |
| pnpm blocks esbuild                  | Add to `pnpm.onlyBuiltDependencies` in package.json |
| Ultracite doesn't update lint script | Manually set `lint` to `ultracite check`            |
