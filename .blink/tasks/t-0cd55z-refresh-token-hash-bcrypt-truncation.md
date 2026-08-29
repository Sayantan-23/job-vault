---
id: t-0cd55z
title: "Refresh-token reuse detection does not fire — bcrypt truncates at 72 bytes"
status: in_progress
created: 2026-08-29T09:05:00Z
updated: 2026-08-29T10:05:00Z
estimate: M
tags: [backend, auth, security]
---

**Severity: high. Affects the web cookie path as well as native, and is live in
production today.** Found by lane [[t-0ccxkj]] during run `x-0cd4o7`; reproduced
independently before this file was written.

## The bug

`hashSecret` stores refresh tokens with **bcrypt**, which truncates its input at
**72 bytes**. A refresh JWT is ~171 chars, and two tokens issued for the same
user share their first 72 bytes — header plus the start of the payload. Every
field that distinguishes them (`iat`, `exp`, the signature) sits *past* the cut.

```
tokens differ:        true   (len 171)
first 72 bytes equal: true
bcrypt.compare(b, hash(a)): true      <-- should be false
sha256 collide:       false           <-- the fix
```

Rotation therefore revokes nothing. Rotate RT1 → RT2, replay RT1: the live stack
returns **HTTP 200**. A stolen refresh token survives the legitimate client's
rotation, which is exactly what reuse detection exists to stop.

**Blast radius is refresh tokens only.** `hashSecret` is shared, but the other
two callers are safe and must keep bcrypt:
- API keys are `jv_` + 48 hex = **51 chars**, under the cut (`api-keys.service.ts`).
- Passwords are low-entropy and short; bcrypt is the correct primitive for them.

**Why the tests miss it.** `auth.service.test.ts` compares against the literal
`'a-different-token'`, whose first 72 bytes genuinely do differ. The assertion
passes and proves nothing about two real JWTs.

## The second bug this one is hiding

`users.refresh_token_hash` is a **single nullable column** — one refresh token
per user, overwritten by `issueTokens` on every login and every refresh.

Today two devices coexist only *because* the compare is broken. Verified against
the live stack: log in twice, then refresh with the older token → **HTTP 200**.

So fixing the hash in isolation **breaks multi-device**, and breaks it loudly:
mobile logs in → overwrites the hash → web's next refresh fails the compare →
reuse detection fires → hash cleared → **both** clients logged out. Mobile ships
into exactly this, so the two fixes travel together.

## Done when

**1. Hash.** New `hashToken`/`compareToken` in `auth.tokens.ts` using SHA-256 —
refresh tokens are already high-entropy signed values, so bcrypt's work factor
buys nothing; it is the wrong primitive, not a mis-tuned one. Compare with
`crypto.timingSafeEqual` on equal-length buffers: `bcrypt.compare` was
constant-time and a naive `===` on hex would regress that. Leave `hashSecret`
alone for passwords and API keys.

**2. Rollover — no migration and no `hash_alg` column needed.** The two formats
are self-identifying: bcrypt hashes start with `$2`, SHA-256 is 64 hex chars.

```ts
hash.startsWith('$2') ? compareSecret(token, hash) : compareToken(token, hash)
```

Each user rolls to SHA-256 at their next refresh, and the whole population is
rolled over within the 7-day refresh window with **zero forced logouts**. The
alternative is a hard cutover — clear every stored hash, log everyone out once,
hole shut immediately. Pick one; the dual-verify branch is deleted afterwards
either way.

**3. Sessions.** Replace the single column with a per-session table (one row per
device: token hash, user, issued/expiry, optional label), so web and mobile hold
independent refresh tokens. Reuse detection then revokes **the session**, not the
user. Logout deletes one row; "log out everywhere" deletes all of them.

**4. Tests that would have caught it.** Hash two real JWTs for the same user and
assert the hashes differ. Drive the live path: rotate, replay the old token,
expect 401 plus a revoked session. Assert two sessions coexist and that revoking
one leaves the other working.

Do not fold this into a mobile chunk — it is not mobile work, though C1 depends
on item 3 landing.
