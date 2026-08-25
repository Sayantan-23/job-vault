---
id: t-0011
title: Scrape robustness nice-to-haves (low-severity review findings)
status: backlog
created: 2026-06-17
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [scraping, backend, deferred]
---

The low-severity items consciously deferred from the robust-URL-scraping
adversarial review. Independent; pick them off individually.

- **Anti-bot interstitial heuristic.** A Cloudflare or cookie-wall page that
  yields a non-placeholder title + company + body is reported `status:'ok'` and
  never escalated to the render tier. Add a phrase/length heuristic ("enable
  cookies", "just a moment", "verify you are human") to demote it to `partial`
  and trigger render.
- **`source` provenance precision.** `renderAndExtract` labels a result
  `source:'ai'` whenever the AI produced anything, even when title and company
  came from the raw render. Telemetry-only, cosmetic.
- **Render tier without AI cannot supply company.** With Gemini off the render
  tier yields title + snapshot only, so a JS-rendered page stays `partial`. A
  structured render provider or a light cheerio pass over the rendered HTML
  would close it.
- **Shared placeholder constants.** `Untitled Position` / `Unknown Company` are
  duplicated in `scraper.ts` (`DEFAULT_*`) and `url-paste-form.tsx`
  (`PLACEHOLDER_*`). Correct today, drift risk later — share them through the
  API contract or add a linking test.
- **`getRenderClients()` gating test.** The `SCRAPER_RENDER_ENABLED` env parse is
  tested; the disabled branch returning `[]` and the render-timeout abort path
  are not.

**Verified 2026-08-25:** still open.
