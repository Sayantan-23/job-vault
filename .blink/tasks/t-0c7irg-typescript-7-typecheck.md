---
id: t-0c7irg
title: "Evaluate TypeScript 7 (native port) for frontend-next type checking"
status: done
milestone: m-01
decisions: [d-0c7hxl]
created: 2026-08-26T08:11:41Z
updated: 2026-08-26T08:46:05Z
tags: [frontend, tooling]
---

Deferred from the Next 16 upgrade per d-0c7hxl. Next 16.3's `next build` can
type-check with TypeScript 7 (the ~10x-faster native port) — bump the local
`typescript` dev dep to `^7` and verify `npm run typecheck`, editor LSP, and the
production build all agree with 5.x results before adopting. Consider the
backend too (NodeNext + Drizzle inference is the risk surface there); frontend
and backend can move independently.

## Evaluated 2026-08-26 (isolated worktree, typescript@7.0.2) — verdict: DEFER

The compiler is ready; the ecosystem is not:

- **Blocker:** `typescript-eslint` hard-throws at module load on TS 7.0
  ("does not support TS 7.0"), and `eslint-config-next` imports it
  unconditionally — `npm run lint` exits 2 entirely, not just type-aware rules.
  No npm-level workaround (plain install ERESOLVEs on the peer
  `>=4.8.4 <6.1.0`; the blog's TS6 side-by-side needs pnpm/yarn resolutions).
- Correctness clean: **zero new errors** across all 273 files; strict flags
  verified enforced via probe file; `next build` genuinely engages TS7 (proved
  by injected error) and passes; 609 vitest tests unaffected.
- Speed real but small here: full `tsc --noEmit` 3.79s → 0.76s (~5x);
  `next build` wall clock **unchanged** (16.2s — typecheck is a thin slice of
  a Turbopack build).
- Migration cost when unblocked: drop `baseUrl` from tsconfig (TS5102: removed;
  `paths` already covers it) + the dep bump. `typescript@7` ships no `tsserver`
  (native LSP via `tsc --lsp`); `plugins: [{name:"next"}]` silently dropped
  (editor-only, harmless).
- Trap for re-runs: `--legacy-peer-deps` uninstalls `@testing-library/dom`
  (RTL 16 peer) and fakes 151 TS2305 errors; use
  `overrides: { "typescript": "$typescript" }` instead.

**Re-trigger:** typescript-eslint ships TS ≥7.1 support
(typescript-eslint/typescript-eslint#10940) → adoption is the one-line tsconfig
change + bump. Tracked as [[t-0c7kct]].
