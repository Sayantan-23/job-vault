# Polish & Tech-Debt — moved to the Blink tracker

This file used to hold the small non-blocking improvements and accepted
tradeoffs from the 2026-06-16 audit. Moved 2026-08-25:

- **Polish** → `.blink/tasks/`: résumé workspace layout parity (`t-0021`),
  tone/length presets (`t-0022`), job-URL scrape in the cover-letter paste form
  (`t-0023`), side-by-side refine compare (`t-0024`).
- **Verification debt** → `.blink/tasks/t-0026`: the eleven unchecked "manual
  browser pass" notes collapse into one QA sweep. The *merge* half of those
  notes was already stale — `develop` and `master` are level at `a9be1cb` and
  every slice is merged.
- **By-design tradeoffs** → `.blink/risks/`: no non-AI fallback (`r-001`),
  per-user-hourly AI rate limiting only (`r-002`), no raw-file persistence for
  PDF persona import (`r-003`). All three re-verified against the code on
  2026-08-25 and all three still hold.

The old content is in git history.
