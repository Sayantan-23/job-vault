---
id: t-0012
title: Pin the extension key and lock the redirect allowlist
status: backlog
created: 2026-06-22
updated: 2026-08-25T12:30:00Z
estimate: S
tags: [extension, security, deferred]
---

Add a base64 `key` to `extension/manifest.config.ts` so the extension id is
stable across reloads, then put the resulting id in `PINNED_EXTENSION_IDS` in
`frontend-next/src/lib/extension-authorize.ts`.

**Why.** The connect handoff redirects to `https://<extension-id>.chromiumapp.org/`.
Until the id is pinned, the web app accepts **any** `*.chromiumapp.org` https
redirect — deliberately dev-only, and the loosest part of the extension auth
path.

**Verified 2026-08-25:** still open. `manifest.config.ts:9` carries the "add a
base64 key here" comment and no key; `extension-authorize.ts:8` reads
`const PINNED_EXTENSION_IDS: readonly string[] = []`, and the check at `:24` is
skipped while the array is empty.
