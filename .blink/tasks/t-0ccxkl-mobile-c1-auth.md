---
id: t-0ccxkl
title: "C1 — Mobile auth: secure-store, api-client port, login/register"
status: done
milestone: m-0cc02t
created: 2026-08-29T07:15:35Z
updated: 2026-09-01T23:25:00Z
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

---

**2026-09-01 — the two gaps the wave left are closed; only device verification
is outstanding.**

- **Root session gate.** `src/app/_layout.tsx` gates `(tabs)` and `(auth)` with
  `Stack.Protected guard`, expo-router's own mechanism: a false guard removes
  those routes from the tree and navigates a user standing on one away, so
  signing in or out needs no imperative navigation. `useAuth` no longer calls the
  router at all. `gallery` sits outside both guards on purpose — a primitives
  pass should not need an account.
- **Session state.** `src/lib/session.ts` — `loading | signedOut | signedIn` over
  `useSyncExternalStore`, module scope so `api-client` can invalidate it from
  outside React when a refresh fails. Boot calls `hydrateSession()`, which asks
  `/api/auth/me` rather than trusting a stored token: a token can be expired or
  its session revoked from another device.
- **Logout has a UI.** `src/components/account-menu.tsx` behind the header
  avatar, mirroring the web's `layout/app/account-menu.tsx`. Profile and Settings
  are omitted until those screens exist. `AnchoredPopoverClose` gained an optional
  `onPress` (the web gets this from Radix `asChild`, which RN has no equivalent of).
- **The `lib/auth-form.tsx` stub is deleted.** The two screens now sit on
  `Button` / `Input` / `Label`, and their bodies moved to
  `components/auth/{login,register}-form.tsx` with thin route files — the web's own
  split, and load-bearing here: a `*.test.tsx` under `src/app/` is swept into
  expo-router's `require.context` and **fails `expo export`**, which is how this
  was found.
- **Logout sends no body** ([[t-0cgtgo]]).

Gates green: 23 suites / 66 tests, `eslint .` clean, `tsc --noEmit` clean,
`expo export --platform android` bundles.

**Still open:** the device pass (see the run record) — and one behaviour only a
device can confirm, that flipping the guard actually navigates rather than leaving
a blank stack.


**Closed 2026-09-01 after the emulator pass.** The Android emulator reached the
login screen, accepted the seeded account, entered the guarded Jobs shell, opened
the avatar menu, showed the signed-in identity, and signed out back to login.
The server session count dropped to zero after logout. The remaining gallery
screenshot sweep is intentionally paused at the user's request and belongs to
C2's visual gate, not this auth task.
