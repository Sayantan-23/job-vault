---
id: t-0024
title: Side-by-side compare for cover-letter refine proposals
status: backlog
created: 2026-06-16
updated: 2026-08-25T12:30:00Z
estimate: S
tags: [frontend, documents, polish]
---

When the `/app/cover-letters/[id]` editor route is wide enough, show the
original letter and the proposed rewrite side by side instead of toggling
between them.

**Verified 2026-08-25:** still open. `cover-letter-proposal.tsx:41` is a single
toggle — "Show original" / "Show proposed", or "Show diff" / "Show clean" for
grammar fixes. The route already splits at `xl`, so the width exists to use.
