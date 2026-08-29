---
id: t-0ccxkq
title: "C6 — Timeline, notifications, push registration"
status: planned
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-29T07:15:35Z
estimate: M
blocked_by: [t-0ccxkn, t-0009]
decisions: [d-004]
tags: [mobile, expo, notifications]
---

Spec §4.5. The mobile half; [[t-0009]] is the backend delivery half.

**This is the Activity tab** ([[d-0cd3wr]]): timeline and notifications merge into
one surface. Both are read-only reverse-chron feeds, so the merge is honest rather
than a way to save a tab slot. It carries the unread badge.

**Done when**
- Timeline and notification feeds render — both are read-only and port almost
  directly from web.
- `RealtimeProvider` connects natively. It only works once the socket carries the
  native token **and** the absolute URL — both landed in C1.
- `expo-notifications` registers the device's Expo push token and posts it to the
  endpoint [[t-0009]] adds.
- Tapping a push deep-links to the right job, using the scheme registered in C0.
- Android: call `setNotificationChannelAsync` **before** scheduling or receiving
  anything. Android 8+ silently drops notifications with no channel — no error,
  no log.

**⚠️ Needs a development build.** Remote push was removed from Expo Go in SDK 53;
local notifications still work there, remote does not. Local
`npx expo run:android` covers it.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
