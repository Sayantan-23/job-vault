---
id: t-0c5tmx
title: Company-researched answers for "why do you want to work at X"
status: backlog
created: 2026-08-25T10:11:21Z
updated: 2026-08-25T10:11:21Z
estimate: L
tags: [answers, ai, deferred]
---

For job-specific screening questions — "why do you want to work at Acme?",
"why this role?" — have the model research the company first and write an
answer grounded in what it finds, instead of producing the generic enthusiasm
a persona alone can support.

**Why.** The answer library deliberately stores only reusable answers: a
job-pinned answer pollutes the list that makes the feature fast. But this one
question shape is genuinely repetitive *in form* while being unanswerable
without company knowledge, so it needs its own path rather than a row in the
library.

**Needs.** A research step ahead of generation — the job's frozen description
is already stored and is the cheapest grounding source; anything beyond it
means web access the backend does not have today, so decide between
description-only grounding and adding a fetch/search capability. Then a
generate path that takes a `jobId`, and a decision about whether the result is
persisted at all (a nullable `question_answers.job_id` is a one-column
migration if it is).

**Trigger.** Once the reusable answer library is in daily use and the
"why this company" question is the remaining hand-written one. Deliberately
out of scope for the answer-library slice — recorded there as the reason
`job_id` was left off the table.

**Risk.** Grounding on the job description alone tends to produce answers that
mirror the posting back at the company, which reads worse than a plain honest
answer. Worth prototyping before committing.
