---
id: d-0cc2w5
title: Android first, on a new jobvault-mobile EAS project
status: accepted
date: 2026-08-29
created: 2026-08-29T00:00:00Z
updated: 2026-08-29T00:00:00Z
tags: [mobile, eas, build]
---

## Context

Development happens on Linux — no Xcode, no local iOS simulator. An
Expo-provisioned EAS project already exists from onboarding
(`sayantan-expo`, id `b8aecc62-4896-4f2c-86ab-d42d261adcba`, referenced by
`expo-prompt.md` at the repo root).

## Decision

**Create a new EAS project named `jobvault-mobile`** rather than reusing
`sayantan-expo`, which is onboarding boilerplate. Costs nothing; `eas init`
creates one. The local directory name does not have to match the EAS project
name.

**Ship and iterate on Android first.**

## Why Android first — the non-obvious reason

Not cost. Sequencing.

iOS is *developable* free from Linux: Expo Go on a physical iPhone runs
`@expo/ui`'s universal layer (SDK 56+), NativeWind, Reanimated, Gesture Handler
and `@gorhom/bottom-sheet` — most of this app. And EAS Build compiles iOS on
Expo's Macs, so no Mac is needed.

But **the share-sheet target — the feature this app exists for (§1 of the
scope) — needs native configuration.** On iOS that is a Share Extension: a
config plugin, therefore a dev build rather than Expo Go, therefore code signing,
therefore the **paid Apple Developer account (99 USD/year)**. On Android it is an
intent filter in the manifest, testable in a dev build EAS produces for free.

So Android is the only order in which the app's central premise can be validated
before any money is spent. If capture-on-the-go does not feel good on Android, it
will not be worth 99 USD on iOS either.

## Consequences

- iOS parity is deferred, not dropped. Nothing in [[d-0cc24z]] or the scope is
  Android-specific; `@expo/ui` covers both platforms.
- The Apple Developer enrolment is the gate for iOS device builds and takes up
  to a day to activate — start it before iOS work, not during.
- Builds run 10–20 minutes and count against the EAS plan's monthly quota.
  **No build is ever started without explicit approval**, including retries.
- Native dependencies install with `npx expo install`, never raw `npm install`,
  so versions track the SDK.
