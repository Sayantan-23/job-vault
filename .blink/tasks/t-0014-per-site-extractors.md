---
id: t-0014
title: Per-site extractors for more job boards
status: backlog
created: 2026-06-22
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [extension, deferred]
---

Tuned selectors for Naukri, Glassdoor, Wellfound and Workday, alongside the
existing LinkedIn and Indeed extractors.

**Why.** Live-DOM extraction already runs on every site (on-demand
`chrome.scripting.executeScript` via `activeTab`), but everything outside
LinkedIn/Indeed falls back to the generic schema.org/OG extractor — and OG
`site_name` gets **company** wrong often enough to matter.

**Verified 2026-08-25:** still open. `extension/src/content/extractors/` holds
`linkedin.ts`, `indeed.ts`, `generic.ts` and the shared `dom.ts` / `markdown.ts`.
