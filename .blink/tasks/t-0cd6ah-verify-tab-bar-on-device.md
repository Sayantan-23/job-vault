---
id: t-0cd6ah
title: "Screenshot the tab bar on a real device before C2 hardens anything"
status: done
milestone: m-0cc02t
created: 2026-08-29T09:42:00Z
updated: 2026-08-29T10:45:00Z
estimate: XS
decisions: [d-0cd3wr]
tags: [mobile, verification]
---

C0 ([[t-0ccxkk]]) shipped the four-tab shell but **never saw it run**. The
machine has `/dev/kvm` but no Android system image: `adb devices` is empty,
`emulator -list-avds` is empty, and `~/Android/Sdk/system-images` does not
exist. Installing one is a ~1.5GB `sdkmanager` download plus a first Gradle
build, which the lane correctly did not start on its own.

Substitute evidence it did gather: `npx expo export --platform android`
succeeds, and the compiled Hermes bundle contains the token colours
(`fefcf9`, `131110`), the font families and the Tailwind class names. That
proves the pipeline resolves. It proves nothing about how the bar **looks**.

The user signed off on the *shape* in [[d-0cd3wr]], not on the execution — the
raised FAB clearing the bar, the stretching indigo capsule, the rounded top
corners reading as OS chrome, the safe-area paint. All of that is unverified.

**Done when** the app runs on an emulator or a connected device and the tab bar
is screenshotted at rest and mid-transition, and the result is compared against
[[d-0cd3wr]]. Per CLAUDE.md, run the screenshot pass in a subagent that eyeballs
the images and reports — do not read them into the main thread.

Blocks hardening in C2 ([[t-0ccxkm]]): restyling components against a bar nobody
has looked at is how a wrong silhouette gets baked in.

---

**Done 2026-08-29.** Ran on a physical OnePlus CPH2691 (`BUILD SUCCESSFUL in
23m 58s`, no file change needed; Gradle 9.3.1 and NDK 27.1 self-installed, no
emulator image touched). `mobile/android/` is gitignored, so reruns are
incremental.

**Geometry: every claim in [[d-0cd3wr]] holds.** Four tabs in the right order in
equal 316px slots; full-bleed 0..1264; rounded top corners only; bar bottom 2725
against a 2780 screen, so the 55px gesture inset is covered; no elevation; no
frosted glass. The FAB sits at `[998,2259][1194,2455]` against a bar top of
2511 — a 56px gap, 20dp right margin, overlapping no tab target — and hide-on-
scroll-down / return-on-scroll-up was confirmed through the a11y tree.

**Material: unverifiable, because the palette does not render.** Filed as
[[t-0cd9jx]]. The bar surface, the indigo capsule and the icons are all
invisible, and the hairline renders as a solid black rule. Re-check those four
things after that task lands; the geometry above does not need re-litigating.

Note for whoever reruns this: `npx expo run:android --device 1d8a211` fails with
`Could not find device with name` — the flag wants a display name. Plain
`npx expo run:android` picks the single connected device.
