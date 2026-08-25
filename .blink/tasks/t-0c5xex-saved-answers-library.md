---
id: t-0c5xex
title: Saved answers library — reusable application-question answers
status: done
created: 2026-08-25T11:32:57Z
updated: 2026-08-25T13:08:15Z
owner: claude
estimate: L
tags: [answers, ai, backend, frontend]
---

Store the user's answers to the open-ended questions application forms keep
asking — why you are leaving, what you were responsible for, what you are
looking for — in two length variants, with an AI draft path and one-click copy.

**Spec:** `docs/superpowers/specs/2026-08-25-saved-answers-library-design.md`.

**Shape.** `question_answers` (migration `0013`): `question`,
`answer_short`, `answer_long`, `last_used_at`. Variants are measured in
**characters**, not words, because ATS fields cap characters. An `answers`
module mirroring `cover-letters`, plus `POST /api/answers/generate` returning
both variants from one structured Gemini call, metered through the existing
`ai_usage_events` path. Frontend: `/app/answers`, a **dedicated `AnswerList`**
— the shared `DocumentList` could not be reused, its row is a fixed four-field
shape with no slot for interactive children — copy chips on the row, a
`?answer=` slideover.

**Form facts are cut, deliberately** — notice period, CTC, years of experience,
work authorization. Storage only pays when composing costs more than retrieving,
and those are memorized; browser autofill already covers the rest. They earn
their keep only in a product that submits forms, which this is not. Reasoning in
the spec.

**Ethics note ships with it.** Two placements, no page banner, no dismiss state.

**Followed by** [[t-0c5uc8]] (extension surfacing, where most of the value is)
and [[t-0c5wyz]] (global search). Job-specific answers stay out — [[t-0c5tmx]].

**Shipped 2026-08-25** on `slice-answers-library`, migration `0013`. Gates green
(680 backend + 609 frontend tests + production build), live-smoked on Gemini,
adversarially reviewed — five findings fixed (cross-record draft leak,
`.min(1)` on the draft schema, copy stamping before the clipboard write, an
unsurfaced delete error, and the question truncating at 390px). The `jobId`
generation path is built and tested but has no UI yet: [[t-0c61ek]].
