---
id: t-0016
title: Extension release process + Chrome Web Store listing
status: backlog
created: 2026-06-22
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [extension, release, deferred]
---

A documented release process — pin the key ([[t-0012]]), version bump,
`npm run build`, zip `dist/` — plus a Web Store listing: icons ([[t-0013]]),
screenshots, privacy policy, and a host-permission justification.

**Why.** Development uses load-unpacked. Real distribution needs store review
and a stable id.

**Trigger.** When the extension is shared beyond the developer's own browser.

**Verified 2026-08-25:** still open. `extension/README.md` documents load-unpacked
and id pinning, and says release/packaging is deferred.
