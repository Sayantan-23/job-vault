---
id: t-0c7ire
title: "Fix the 16 react-hooks compiler diagnostics demoted to warnings in the Next 16 upgrade"
status: done
owner: coder
milestone: m-01
decisions: [d-0c7hxl]
created: 2026-08-26T08:11:41Z
updated: 2026-08-26T09:03:27Z
tags: [frontend, tech-debt, react-compiler]
---

The Next 16 upgrade (t-0c7hxm) bumped `eslint-plugin-react-hooks` to v7, whose
React Compiler diagnostics flagged 16 pre-existing violations across 12 files.
They were demoted from `error` to `warn` in `eslint.config.mjs` (with a comment)
to keep the upgrade commit mechanical. The React Compiler bails out of
components it can't verify, so each violation is a component that is NOT getting
auto-memoized — fixing these is where the compiler win actually lands.

Inventory at demotion time:
- `set-state-in-effect` ×8: search-input, sidebar-toggle, edit-persona-sheet,
  profile-workspace, resume-workspace, theme-provider, draggable-card,
  use-cover-letter-refine
- `refs` ×6: documents-section ×3, faq-section ×2, steps-strip
- `purity` ×1: reminder-item.tsx:18
- `preserve-manual-memoization` ×1: use-job-filters.ts:36

Done = violations fixed, rules restored to `error`, board drag + refine flow +
theme switching manually verified (several of these touch subtle state timing).
