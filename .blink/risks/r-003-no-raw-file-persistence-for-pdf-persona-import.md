---
id: r-003
title: No raw-file persistence for PDF persona import
status: accepted
severity: low
created: 2026-06-16
updated: 2026-08-25T12:30:00Z
tags: [personas, tradeoff]
---

## Impact
`POST /api/personas/parse-resume` extracts PDF text in memory (`multer` +
`pdf-parse`), structures it via Gemini and returns `content + rawText`. The
source PDF is never stored, so there is no audit trail of what was uploaded and
no way to re-parse an import after a prompt change.

Verified 2026-08-25: `personas.controller.ts` passes `req.file?.buffer` straight
into the service; nothing writes it anywhere.

## Mitigation
Accepted and intentional — the app has no file backend at all (see [[d-003]]),
storage is text/JSON only. Would need a storage provider before it could change.
