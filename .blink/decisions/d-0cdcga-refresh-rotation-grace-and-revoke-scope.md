---
id: d-0cdcga
title: "Refresh rotation: a 15s one-token-deep grace window, session-scoped revocation"
date: 2026-08-29
status: accepted
tags: [backend, auth, security]
---

Three load-bearing security choices made while fixing [[t-0cd55z]]. They were
living only in code comments; the second review flagged that correctly.

## 1. A 15-second grace window on the previous token

`ROTATION_GRACE_MS = 15_000`, exported from `auth.sessions.repository.ts` and
parameterised into the SQL interval so JS and SQL cannot drift.

Rotation without a grace window logs honest users out. Several `/app` tabs
restoring after the 15-minute access token expires all refresh with the same
cookie; without leeway, every loser is indistinguishable from a replay.

**This matches how the identity vendors ship it.** Auth0 calls it the "Rotation
Overlap Period", Okta calls it `leeway` and caps it at 60 seconds; ~10s is the
commonly recommended value. Auth0's window is **one-token-deep** — only the
immediately-previous token is accepted, and the second-to-last still triggers
breach detection. Ours is the same depth: `previous_token_hash`, singular.

Started at 30s, tightened to 15s after the research: honest jitter is covered
well inside it, and the window an attacker could replay in is halved.

**The window is a safety net for network jitter, not a substitute for a client
lock.** Both vendors say so explicitly. Our web client's single-flight is
per-tab (module-scope promise), which is the other half of the same bug —
tracked as [[t-0cdbwh]] (Web Locks API). Native needs nothing: one JS context.

## 2. A grace hit returns an access token only

The losing racer gets a new access token and **no refresh token** — no rotation,
no refresh `Set-Cookie`.

The alternative, re-rotating on the grace arm, was implemented first and is
broken: two racers each receive a different refresh token, both land in one
cookie slot, and last-write-wins leaves ~50% of races holding a token that dies
when the window closes — at which point the next refresh destroys the session as
a replay. We cannot hand the loser the winner's token, because only hashes are
stored.

Returning access-only sidesteps it: the jar keeps exactly the winner's refresh
token whatever order responses land in, and N racers all succeed rather than
two. `AuthResult.refreshToken` is therefore optional.

**Contract for mobile C1 ([[t-0ccxkl]]): when the field is absent, keep the
stored refresh token.**

## 3. Revocation is session-scoped, and an unattributable replay revokes nothing

- Replay matching `previous_token_hash` past the window → delete **that session**.
  Other devices stay signed in. `deleteAllForUser` is gone from the refresh path.
- Replay matching neither hash → **401, revoke nothing.**

The second half is deliberate and was challenged in review before being kept. A
token matching neither hash is already worthless; revoking on it would turn any
long-dead leaked token into a per-user log-out-everywhere primitive. The cost is
a missed breach *alarm* in the narrow case where the victim rotated twice between
theft and replay — the attributable branch still catches the common one-rotation
case.

## Accepted cost: one forced logout at deploy

bcrypt hashes cannot be converted to SHA-256, so every existing session dies when
this ships. Chosen over a dual-verify transitional branch (self-identifying
formats made it possible — bcrypt starts `$2`, SHA-256 is 64 hex chars) because
the storage shape was changing anyway and the transitional branch would have to
be remembered and deleted later.
