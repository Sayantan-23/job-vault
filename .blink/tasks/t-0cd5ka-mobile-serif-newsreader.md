---
id: t-0cd5ka
title: "Mobile ships Instrument Serif; web ships Newsreader — pick one"
status: done
milestone: m-0cc02t
created: 2026-08-29T09:30:00Z
updated: 2026-09-01T23:25:00Z
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


**Closed 2026-09-01.** Newsreader replaces Instrument Serif in the installed
font package, root font loader and global serif token. The Android emulator
rendered it; glyph comparison against the shipped Newsreader TTF (IoU 0.538)
was materially closer than the system-serif fallback (0.228), ruling out silent
fallback. The task's `theme.ts` condition was stale: that file contains only
layout dimensions, not font values.
