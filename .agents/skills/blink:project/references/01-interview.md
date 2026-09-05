---
name: blink:project
blink_version: 0.5.2
description: New-project interview — up to ten questions, one at a time, then writes project.md, a docs/ spec, milestones, backlog tasks, and a decision per real choice.
---

# New-project interview

Use when the tracker is empty or near-empty and the directory has no existing
source code. Conducts the intake interview, then writes the first entity set.
Adaptive-skip applies from the first message: whatever the invoking message or
an existing file already answers is never re-asked.

## Before the first question

Read `.blink/project.md` if it exists. Read any `docs/` briefs. Note
what the invoking message contains — a message like "plan a CLI for converting
Markdown to PDF" has already answered purpose, scope and stack; confirm those
as a printed table and skip the corresponding questions.

## Question sequence (≤ 10, one at a time)

Ask only what remains unanswered. Stop at ten regardless.

1. **Purpose** — one sentence: what does job-vault do and why does it exist?
2. **Users** — who uses it, and what do they gain?
3. **Scope cut-line** — what is explicitly out of scope for v1?
4. **Stack** — language, runtime, key dependencies; any hard constraints?
5. **Constraints** — timeline, team size, licensing, compliance?
6. **Quality bar** — what does "done" mean: coverage target, performance SLO,
   browser support, accessibility level?
7. **Milestone shape** — slice by feature, by layer, or by deploy increment?
8. **Orchestration default** — inline, subagents, orchestrators, or ask each
   time? (Tier definitions are in `/blink:tracking`; cite, do not restate.)

After the last answer, print a filled-in summary table and ask for
confirmation before writing anything.

## Write on confirmation

Write in this order — referenced entities must exist before the files that
point at them:

1. **`.blink/project.md`** — title, `status: active`, `started`
   (today), the `orchestration` field if settled, a one-paragraph summary,
   Goals and Non-goals sections.
2. **`.blink/docs/<slug>.md`** — `type: spec` brief: purpose, users,
   scope cut-line, stack, constraints, quality bar.
3. **Decisions** — one `.blink/decisions/d-NNN-<slug>.md` per real
   choice the interview settles (stack, orchestration default, etc.). Ids
   continue the existing sequence; never restart at d-001.
4. **Milestones** — `.blink/milestones/m-NN-<slug>.md` for each
   milestone: `status: planned`, `order`, one-line `summary`. Settle scope
   before writing.
5. **Tasks** — `.blink/tasks/t-NNNN-<slug>.md` for first-milestone
   work items: `status: backlog`, pointing at their milestone. Ids continue
   the existing sequence.

## After writing

Run `blink validate`. Zero errors before calling this done. Print a created-
entity map: counts by type, decisions written, milestones with task counts.

## Do not

- Do not write before confirmation.
- Do not write a computed percentage or count into any entity file.
- Do not invent work. If the interview produced no clear task, say so and stop.
- Do not create ids that already exist in the directory.
