---
id: t-0cd6ah
title: "Screenshot the tab bar on a real device before C2 hardens anything"
status: backlog
milestone: m-0cc02t
created: 2026-08-29T09:42:00Z
updated: 2026-08-29T09:42:00Z
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
