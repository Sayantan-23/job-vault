---
id: t-0cgtgo
title: "d-0cdcga names a stale logout contract — amend it, and drop the inert body send"
status: done
milestone: m-0cc02t
created: 2026-08-31T08:41:55Z
updated: 2026-09-01T10:05:00Z
estimate: XS
decisions: [d-0cdcga]
tags: [auth, mobile, docs]
---

[[d-0cdcga]] tells every future session that **native logout must send
`{ refreshToken }` in the body or logout fails closed and deletes every session
on all devices**. That was true when it was written and is not true now. It was
carried verbatim into the C1 dispatch ([[t-0ccxkl]]), which is exactly the cost
of leaving it: the lane implemented a contract the server does not have.

`ba787fe` ("token kinds, session-bound logout, CAS rotation") moved logout to
the session id:

- `backend-express/src/modules/auth/auth.controller.ts:69-75` calls
  `authService.logout(requireUserId(req), req.user?.sid)` and reads no body. The
  route has **no `validate()` schema**, so `{ refreshToken }` is inert.
- `backend-express/src/modules/auth/auth.service.ts:144-147` —
  `if (sessionId) deleteById(...) else deleteAllForUser(userId)`.

**The hazard is real; its trigger is different.** The fail-closed
`deleteAllForUser` path fires on a **missing `sid` on the access token**, not a
missing body. `signAccessToken` mints `sid` into every access token, so the thing
protecting a user's other devices is the token, not the request body.

**Done when**
- `d-0cdcga` carries an amendment stating the above: logout is session-bound via
  `sid`, the body field is inert, and the fail-closed path is an absent `sid`.
- The mobile client's `{ refreshToken }` body send and its test are **dropped**
  (they encode a contract the server does not have) — or kept with a comment
  saying why, if the route is expected to gain a schema.
- A grep for the old wording across `.blink/` and `docs/` finds no other copy
  still asserting the body contract.

---

**Closed 2026-09-01.** All three:

- `d-0cdcga` carries "Amendment 2026-09-01 — logout is session-bound via `sid`,
  not via a body field".
- `mobile/src/lib/auth.ts` `logout()` posts to `/api/auth/logout` with **no
  body**, and `auth.test.ts` asserts exactly that (`toHaveBeenCalledWith` with a
  single argument), replacing the test that asserted the body.
- The only other live copy of the old wording was `CLAUDE.md`'s "Next" bullet —
  corrected in the same commit. `progress.md:600` also states it, but as the
  narrative of *how the stale contract was caught*, which stays true.
