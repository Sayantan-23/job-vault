---
id: t-0cgtgq
title: "Sheet is on RN Modal, not @gorhom/bottom-sheet as d-0cc24z assigns"
status: backlog
milestone: m-0cc02t
created: 2026-08-31T08:41:55Z
updated: 2026-08-31T08:41:55Z
estimate: S
blocked_by: [t-0ccxkm]
decisions: [d-0cc24z]
tags: [mobile, expo, ui]
---

[[d-0cc24z]] assigns bottom sheets to `@gorhom/bottom-sheet`. It is **not
installed** — a non-font dependency, outside the C2 lane's ownership, so the lane
built `Sheet` on React Native's `Modal` with `animationType="slide"` and declared
the divergence instead of installing across the boundary.

**What the Modal version gets right:** correct chrome, native slide-up, Android
back button wired to close, enters from the bottom (the phone equivalent of the
web's right-hand drawer), grab handle.

**What it does not have:** snap points, velocity dismiss, drag-to-close.

The documented trap is already paid for either way: `GestureHandlerRootView` is
at the root in `mobile/src/app/_layout.tsx`, and the other half of that trap is
that `@gorhom/bottom-sheet` renders invisible without an explicit background
style.

**Done when** either `@gorhom/bottom-sheet` is installed with `npx expo install`
and `Sheet` is upgraded to it (snap points, drag-to-close, explicit background),
or `d-0cc24z` is amended to accept the `Modal` implementation and say why. Every
current `Sheet` caller — including `Select`, which opens one rather than
introducing a second dropdown idiom — must keep working.
