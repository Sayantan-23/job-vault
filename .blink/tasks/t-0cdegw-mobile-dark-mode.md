---
id: t-0cdegw
title: "Mobile has no dark mode — conditional root variables are dropped by react-native-css"
status: backlog
milestone: m-0cc02t
created: 2026-08-29T14:00:00Z
updated: 2026-09-05T00:22:00Z
estimate: S
decisions: [d-0cd3wr]
tags: [mobile, design, deferred]
---

**Deferred by the user 2026-08-29** — mark it, fix it later. Recorded now so the
measurements are not lost.

**This is a real divergence from web, not parity.** The web app *does* have dark
mode: `frontend-next/src/components/theme/theme-provider.tsx` plus theme controls
in the settings workspace, over the `.dark [data-theme-scope='app']` block in
`frontend-next/src/styles/app/theme.css`. Mobile currently renders its light
palette in **both** OS schemes. CLAUDE.md's design line calls dark mode
"first-class".

## What was measured, on a device

Four controlled tests during [[t-0cd9jx]]:

| Test | Result |
|---|---|
| value inside `@media (prefers-color-scheme: dark) { :root { … } }` | **never applies** |
| same block with an always-true `@media (min-width: 1px)` | **never applies** |
| same edit to the unconditional `:root` | **applies** (control passed) |
| rule-level `dark:bg-[#ff0000]` on a wrapper | **applies** |

So the runtime detects the colour scheme correctly. What this stack drops is
**conditional root variables** specifically. The `@media` block currently in
`mobile/src/global.css` is inert; it was kept deliberately, with the measurement
documented in the file, because it costs nothing and starts working if the
library fixes it.

## The fix, when we get to it

**Not** a `dark:` variant on every colour utility — that doubles every class list
and diverges from the web theme's structure, which is why it was rejected in
[[t-0cd9jx]].

Use NativeWind's runtime variable API instead. `vars` and
`VariableContextProvider` are exported from `nativewind` (re-exported from
`react-native-css`; confirmed present in `5.0.0-preview.4`):

```tsx
import { vars, VariableContextProvider } from 'nativewind'
import { useColorScheme } from 'react-native'

const light = vars({ '--card': '#ffffff', /* … */ })
const dark  = vars({ '--card': '#1a1816', /* … */ })

<VariableContextProvider value={useColorScheme() === 'dark' ? dark : light}>
```

Class names stay single — `bg-card`, no prefix — which is the property that made
the two-block CSS shape attractive in the first place. Cost: the dark values move
from CSS into TS, so `global.css` and `theme.ts` share the palette and must not
drift. Consider generating one from the other.

**Also revisit the tab bar** ([[d-0cd3wr]]): its surface is deliberately dark in
light mode, so dark mode needs the inverse treatment or the bar disappears into
the page. The `--tab-bar*` tokens exist precisely so that is a token change, not
a component change.

**Done when** flipping the OS scheme flips the app's palette, and the tab bar
still reads as a distinct surface in both.

**Re-verified 2026-09-05:** Still open in backlog. Citing commit `ed770c9b` explicitly deferred the dark mode runtime switch to `t-0cdegw`.

