---
id: t-0cd9jx
title: "Mobile palette does not render, and the bar corner curves the wrong way"
status: backlog
milestone: m-0cc02t
created: 2026-08-29T10:40:00Z
updated: 2026-08-29T11:20:00Z
estimate: S
decisions: [d-0cd3wr, d-006]
tags: [mobile, design, bug]
---

Found by the on-device verification in [[t-0cd6ah]], on a physical OnePlus
CPH2691. **Not one colour token resolves on the device.**

`react-native-css@3.0.7` / `nativewind@5.0.0-preview.4` do not implement CSS
`light-dark()`. They strip the function name and pass the raw argument list
through as if it were a colour:

```
WARN  "#706b66,#96918c" is not a valid color or brush    <- --muted-foreground
WARN  "#fcfcfc,#090b0f" is not a valid color or brush    <- --primary-foreground
```

Every token in `mobile/src/global.css` is wrapped in `light-dark()`, so the whole
palette is dead. Measured on the Jobs screen: `#f2f2f2` over 3.37M px, `#000000`
85k px, **zero warm-toned pixels and zero indigo**. `bg-*` fails silently to
invisible; `text-*` and SVG `stroke` fall back to black or nothing.

Consequence on the tab bar: the surface is invisible, the muted-indigo active
capsule does not render at all, the lucide icons are laid out but drawn with an
unresolved stroke, and `--hairline` becomes a solid 3px black rule — the exact
opposite of a hairline, and a direct violation of [[d-006]].

**Why every gate missed it.** `expo export` succeeds, jest passes, and C0's
substitute evidence — grepping the compiled Hermes bundle for `fefcf9` — found
the string present. The token *is* in the bundle. It just never parses at
runtime. A bundle grep cannot distinguish those two states; only rendering can.

**The web app never did this.** `frontend-next/src/styles/app/theme.css` has zero
occurrences of `light-dark()` — it declares light values on
`[data-theme-scope='app']` and overrides them under `.dark`. C0 invented the
`light-dark()` form on its own.

**Fix — mirror the web's two-block shape:**

```css
:root { --card: #ffffff; ... }
@media (prefers-color-scheme: dark) { :root { --card: #1a1816; ... } }
```

This keeps what C0 was actually after — one set of class names, no `dark:`
prefix on every element — while using a construct NativeWind supports. Following
the OS is the right default on mobile; if a manual toggle is wanted later,
NativeWind's `colorScheme` API layers on top without touching the tokens.
Rejected alternative: a `dark:` variant on every colour utility, which doubles
every class list and diverges from the web file's structure.

**Done when** the tokens are restructured, `npx expo run:android` is re-run on a
device, and the bar is re-checked against [[d-0cd3wr]] — specifically the stone
surface, the hairline top border, the stretching indigo capsule and the four
icons. The geometry is already verified and needs no re-litigation.

**Blocks C2** ([[t-0ccxkm]]): the silhouette is signed off, the palette is not.

---

## Second fix in the same device run — the corner direction

Added 2026-08-29 after the user spotted it on the screenshot. See the amendment
at the bottom of [[d-0cd3wr]] for the measurements; the short version:

C0 implemented "rounded top corners only" literally as `rounded-t-[20px]` on the
bar (`mobile/src/components/tab-bar.tsx:62-65`). Measured against the user's
reference image, that is **mirrored** — ours arcs away from the bar's interior,
the reference arcs into it.

The reference is **not** an inverted corner. It is a normal convex radius on the
*other element*: the page content has rounded **bottom** corners with the bar
colour behind them, which is what makes it read as OS chrome.

**Fix:** drop `rounded-t-*` from the bar, paint the bar colour as the screen
background behind it, give the page/scroll content wrapper `rounded-b-[20px]`
plus `overflow: 'hidden'`. One radius moved between elements — no mask, no SVG,
no new dependency.

**Do not build a true inverted corner.** RN has no such primitive and it would
cost two clipped quarter-disc views, an SVG path or a mask library. It is not
what the reference shows.

Both fixes ship in one device rebuild — the first Android build took 24 minutes,
and `mobile/android/` only exists in the primary checkout, so this task cannot
run in a worktree.
