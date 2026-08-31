---
id: t-0cd5ka
title: "Mobile ships Instrument Serif; web ships Newsreader — pick one"
status: paused
milestone: m-0cc02t
created: 2026-08-29T09:30:00Z
updated: 2026-08-31T08:37:46Z
paused_reason: "Newsreader swap landed on slice-mobile-c1-c2 (a47f27f) and gates are green, but the font is visually unverified: the device pass started and was stopped mid-scroll, having confirmed 3 of 5 opacity cases by exact pixel match and a failed RN font load falls back silently to system sans. theme.ts needed no change: it holds no font values."
estimate: XS
tags: [mobile, design]
---

C0 ([[t-0ccxkk]]) loaded **Instrument Serif** because its task file and
`CLAUDE.md`'s design line both named it. Both were stale: the 2026-06-25
editorial-shell redesign moved the web app to **Newsreader**
(`frontend-next/src/app/layout.tsx:2`), and `CLAUDE.md`'s own redesign bullet
already said so while the design line six rows below still said Instrument Serif.

The design line was corrected on 2026-08-29 (`b112931`). The mobile client was
not — that is a visual decision, not a doc fix, so it is left for sign-off.

**Almost certainly:** swap mobile to Newsreader so the two clients match. One
product, one editorial face.

**Done when** `@expo-google-fonts/newsreader` replaces the Instrument Serif
package, `mobile/src/theme.ts` and the `--font-serif` line in
`mobile/src/global.css` name it, and the bundle is re-exported to confirm the
family reaches the compiled output.

Cheap now, annoying after C2 hardens components against the current face.
