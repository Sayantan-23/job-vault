---
id: t-0c61ek
title: Answer generation — surface the job-context picker in the UI
status: backlog
created: 2026-08-25T12:59:08Z
updated: 2026-08-25T12:59:08Z
estimate: S
tags: [frontend, answers, ai]
---

`POST /api/answers/generate` accepts an optional `jobId` end to end — Zod
schema, ownership check, the `TARGET JOB` block in `buildAnswerPrompt`, and
tests — but no UI can send it. `GenerateAnswerControls` offers persona and
instructions only, so the design spec's "job context is a generation-time
input" is currently unreachable.

**Why it shipped that way.** The user deferred job-specific answers during
brainstorming ("we might skip the job only for now"), and the flagship case —
"why do you want to work at X" — needs company research, which is its own
deferred task. The backend path was built because the spec approved it and
because the extension slice is its natural first caller.

**What it needs.** A job select beside the persona select in
`components/answers/generate-answer-controls.tsx`, feeding `jobId` through
`AnswerDrawerBody`'s `onGenerate`. No backend work.

Related: the extension answer-surfacing slice (a job page is exactly where a
job-grounded answer is wanted) and the company-researched-answers concept.
