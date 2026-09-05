---
id: t-0015
title: On-page overlay "Save to JobVault" button
status: backlog
created: 2026-06-22
updated: 2026-09-05T00:22:00Z
estimate: M
tags: [extension, deferred]
---

Inject a floating save button on recognised job pages instead of requiring the
user to open the popup.

**Why deferred.** More intrusive and more DOM-fragile than the popup, which
works everywhere. Worth it only if opening the popup turns out to be the
friction.

**Verified 2026-08-25:** still open — capture is popup-only.
**Re-verified 2026-09-05:** Still open in backlog. Citing commit `2749d5ea` explicitly excluded on-page overlay (`t-0015`) from scope.

