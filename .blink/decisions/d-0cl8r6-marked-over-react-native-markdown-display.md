---
id: d-0cl8r6
title: "MarkdownProse uses marked, not react-native-markdown-display"
date: 2026-09-02
status: accepted
tags: [mobile, expo, ui]
---

Spec §2 ([[t-0cgtgp]]) names `react-native-markdown-display` as the native
counterpart to the web's `react-markdown`. It is **not used**. This records the
divergence.

**Why not `react-native-markdown-display`:** last released ~2021, React 19
compatibility unverified. The app is on React 19.2.3 / Expo SDK 57 — installing
an unmaintained RN-specific package that may not survive a React upgrade is a
risk with no upside.

**What instead:** `marked` (v16), a pure-JS markdown parser with no React
dependency and no native binding. `marked.lexer(markdown)` returns a token tree;
the component maps each token to our own `Text`/`View` primitives on our tokens,
mirroring the web sibling's element-by-element `components` map (h1–h3, p, ul/ol
with manual bullets/numbers, li, a, strong, em, code, blockquote, hr, img→null).

**Why this is the right shape, not a compromise:**
- The web sibling uses `react-markdown`'s `components` map to own its styling
  element by element. `marked` + a token→component map is the same pattern one
  layer down — the parser is separate from the rendering, which is what makes
  it portable. `react-native-markdown-display` bundles both, and a rules map on
  top of it is a leakier abstraction than owning the rendering outright.
- No new native dependency, no Metro transform risk, no React-version coupling.
- `marked` is the most-downloaded JS markdown parser (48M+ weekly npm); it is
  closer to stdlib for this concern than any RN-specific alternative.

**Accepted cost:** ~100 lines of token→component mapping code that the web
sibling doesn't have (it gets it free from `react-markdown`'s `components`
API). That code is the styling, which we own on both platforms anyway.
