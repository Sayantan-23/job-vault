---
id: t-0ccxkl
title: "C1 — Mobile auth: secure-store, api-client port, login/register"
status: paused
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-08-31T08:37:46Z
paused_reason: "Code landed on slice-mobile-c1-c2 (3619107), all seven gates green, but visually unverified: the device pass started and was stopped mid-scroll, having confirmed 3 of 5 opacity cases by exact pixel match. Two open items: d-0cdcga names a stale logout contract (logout is session-bound via sid; the { refreshToken } body is inert) and no root session gate exists yet in src/app/_layout.tsx."
estimate: M
blocked_by: [t-0ccxkj, t-0ccxkk]
decisions: [d-0cc1x6]
tags: [mobile, expo, auth]
---

Spec §2.2 and §3.2. Gates every data screen.

**Done when**
- `mobile/src/lib/api-base.ts` resolves the backend host **at runtime** so one
  build works on an emulator, a USB device and a Wi-Fi device with no
  per-machine config:

```ts
import Constants from 'expo-constants'
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  `http://${Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'}:3100`
```

  No backend change is needed for reachability — Compose maps
  `"${BACKEND_PORT:-3000}:3000"` with no `127.0.0.1:` prefix, so the API already
  binds all interfaces. Fallback for a device on another subnet:
  `adb reverse tcp:3100 tcp:3100`.
- `api-client.ts` ported from `frontend-next/src/lib/`. **Three lines change**,
  and the first is not about auth: `API_BASE = ''` → the absolute base above;
  `credentials: 'include'` (l.43) dropped; refresh reads the token pair from the
  body and stores it in `expo-secure-store`. The single-flight refresh *logic*
  ports unchanged — keep it, it is what stops rotation racing and tripping
  reuse-detection.
- `socket.ts` ported with **both** fixes: the absolute URL (`io(undefined, …)`
  connects to a page origin that does not exist natively) **and**
  `auth: { token }` in the handshake.
- Login + register screens; tokens in `expo-secure-store`, never AsyncStorage.

Skills: `expo-data-fetching`, `expo-router`.

---
*Cold-start: read `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8 first — it is written to be read with no other
context. Repo root is `git rev-parse --show-toplevel` (this repo is worked on
from two machines; never hardcode a home path).*
