---
id: t-0cdbwh
title: "Web single-flight refresh is per-tab; use the Web Locks API"
status: backlog
created: 2026-08-29T12:20:00Z
updated: 2026-08-29T12:20:00Z
estimate: XS
tags: [frontend, auth, security]
---

`frontend-next/src/lib/api-client.ts:40` holds `refreshInFlight` in a module
scope, so the de-duplication is **per JS context — per tab**. Its own comment
claims more than it delivers:

> A single shared in-flight promise de-duplicates concurrent refreshes so token
> rotation never races

Two `/app` tabs are two contexts. Both 401, both refresh with the same cookie,
both race. That is the client half of the HIGH finding fixed server-side in
[[t-0cd55z]]; the 30-second grace window there is a **safety net for network
jitter, not a substitute for a client lock** — which is the explicit guidance
from both Auth0 and Okta.

**Fix — the standard one, and it is small.** Wrap the refresh in the Web Locks
API so the lock is held across every tab of the origin:

```ts
navigator.locks.request('auth-refresh', async () => { /* refresh once */ })
```

Keep the existing in-memory promise as the inner layer (it still de-duplicates
the many parallel 401s inside one tab, which is the common case and cheaper than
taking a lock). Web Locks is available in every browser this app supports;
`navigator.locks` is nonetheless absent in some non-secure contexts, so fall
back to today's behaviour rather than throwing.

**Also fix the comment.** It currently asserts a property the code does not have,
which is how the gap survived review this long.

**Mobile is not affected** and needs nothing: one JS context per app, so the
existing single-flight is sufficient. This is a browser-only problem.

**Done when** two `/app` tabs, both idle past the access-token expiry, can be
foregrounded together without either being logged out, and the comment matches
the code.
