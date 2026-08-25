---
id: t-0010
title: Async scrape endpoint + notify on completion (mobile share flow)
status: backlog
created: 2026-06-17
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [scraping, backend, deferred]
---

A `POST /api/jobs/scrape-async` that enqueues the scrape and notifies on
completion through the existing notification system, instead of holding the HTTP
request open for the render + AI chain.

**Why.** Mobile "share a URL → scrape" tolerates, even prefers, a background job
plus a push. The pipeline is already a pure, req/res-free service
(`scrapeUrl` / `createScrapeFallback`), so a worker can call it unchanged — a
drop-in, not a refactor. The synchronous endpoint stays for web, bounded by its
90s deadline.

**Trigger.** When the mobile app lands, or when web capture should stop
blocking.

**Verified 2026-08-25:** still open.
