---
id: r-002
title: AI rate limiting is per-user hourly only
status: accepted
severity: low
created: 2026-06-16
updated: 2026-08-25T12:30:00Z
tags: [ai, tradeoff]
---

## Impact
AI generation and refine are throttled by a per-user hourly quota counted from
`ai_usage_events`. There is no per-IP burst control, no circuit breaker, and no
awareness of the upstream Gemini quota beyond a single transient retry.

Verified 2026-08-25: `ai.rate-limit.ts` counts `countRecentGenerations(userId, since)`
against `AI_RATE_LIMIT_PER_HOUR` and nothing else; `gemini.service.ts` retries once.

## Mitigation
Accepted: fine for a single-user product behind cookie auth. Becomes real on
multi-tenant or abuse-prone exposure, or when Gemini quota budgeting matters —
then add per-IP limiting and a breaker around the Gemini client.
