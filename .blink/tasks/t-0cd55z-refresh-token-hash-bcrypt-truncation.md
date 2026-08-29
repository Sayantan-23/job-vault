---
id: t-0cd55z
title: "Refresh-token reuse detection does not fire — bcrypt truncates at 72 bytes"
status: backlog
created: 2026-08-29T09:05:00Z
updated: 2026-08-29T09:05:00Z
estimate: S
tags: [backend, auth, security]
---

**Severity: high. Affects the web cookie path as well as native, and is live in
production today.** Found by lane [[t-0ccxkj]] during run `x-0cd4o7`; the core
claim was reproduced independently before this file was written.

`hashSecret` stores refresh tokens with **bcrypt**, which truncates its input at
**72 bytes**. A refresh JWT is ~171–188 chars, and two tokens issued for the same
user share their first 72 bytes — the header plus the start of the payload. Every
field that distinguishes them (`iat`, `exp`, the signature) sits *past* the cut.

Reproduced in the backend container:

```
tokens differ:        true   (len 171)
first 72 bytes equal: true
bcrypt.compare(b, hash(a)): true      <-- should be false
sha256 collide:       false           <-- the fix
```

**Consequence.** Rotation stops revoking anything. Rotate RT1 → RT2, then replay
RT1: the live stack returns **HTTP 200** where it must return 401 and revoke the
family. A stolen refresh token stays valid after the legitimate client rotates,
which is the exact attack reuse-detection exists to stop.

**Why the tests miss it.** `auth.service.test.ts` compares against the literal
`'a-different-token'`, whose first 72 bytes genuinely do differ. The assertion
passes and proves nothing about two real JWTs.

**Done when**
- Refresh tokens are hashed with **SHA-256**, not bcrypt. They are already
  high-entropy signed tokens, so bcrypt's work factor buys nothing here — it is
  the wrong primitive for this input, not merely a mis-tuned one.
- Leave password hashing on bcrypt. Passwords are low-entropy and under 72 bytes;
  only the token path changes.
- A regression test that hashes **two real JWTs for the same user** and asserts
  they do not compare equal. The literal-string test is what let this ship.
- Reuse-detection test drives the live path: rotate, replay the old token, expect
  401 + family revoked.

**Migration cost — this is the reason it is not a drive-by fix.** Changing the
hash invalidates every stored `refreshTokenHash`, so **every user is logged out**
on deploy. That is a release-timing decision, not an implementation detail. The
cheap mitigation, if a mass logout is unacceptable: keep a `hash_alg` column,
verify old rows with bcrypt and write new ones with SHA-256, then drop the bcrypt
branch after the 7-day refresh window has fully rolled over.

Do not fold this into a mobile chunk — it is not mobile work, and it needs its
own deploy decision.
