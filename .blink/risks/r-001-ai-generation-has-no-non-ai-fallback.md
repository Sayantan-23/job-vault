---
id: r-001
title: AI generation has no non-AI fallback (degraded mode)
status: accepted
severity: low
created: 2026-06-16
updated: 2026-08-25T12:30:00Z
tags: [ai, tradeoff]
---

## Impact
Résumé and cover-letter generation hard-require Gemini. With no `GEMINI_API_KEY`
(or AI disabled) they throw `SERVICE_UNAVAILABLE` — there is no template or
heuristic path that still produces a document.

Verified 2026-08-25: `resumes.service.ts:16` and `cover-letters.service.ts`
still open with `if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', …)`.

## Mitigation
Accepted by design: the product is AI-first and advertises AI generation, so a
degraded non-AI path is not expected. `GET /api/ai/status` lets the UI tell the
user AI is off rather than failing blind.

Revisit only if a no-key / offline degraded mode becomes a product requirement.
