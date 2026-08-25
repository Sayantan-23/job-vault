# Agent instructions

<!-- blink:begin v0.5.2 -->
## Project tracking (Blink)

job-vault keeps its plan in `.blink/` — one markdown file per
entity, YAML frontmatter for state, body for prose. The field reference is
`.blink/SCHEMA.md`. Read it before writing anything there.

Keep it in step with the work — the file is written before the work, not after
it. Every status below is from the **task** enum, whose lifecycle is
`backlog` → `planned` → `in_progress` → `done`, with `dropped`, `blocked`
and `paused` as exits:

1. Planning work → a new task file in `.blink/tasks/` with
   `status: backlog`, pointing at its milestone; `status: planned` once it is
   planned and queued. Never edit the milestone: this format uses
   forward references only, so a milestone never lists its tasks.
2. Starting work → set that task's `status: in_progress`, set `owner`, bump
   `updated`.
3. Finishing → `status: done`. Never delete a file; abandoned work is `dropped`.
4. A real choice made → a decision file in `.blink/decisions/`, linked by
   id from the task that implements it.
5. Stuck → `status: blocked` with `blocked_by` naming a risk id; create the risk
   first if it does not exist.
6. After any write → run `blink validate`. It exits `0` when clean.
7. Unsure the board still matches reality → run `blink drift`. It reports where
   these files and git history disagree, splits what the evidence establishes
   from what only a human can answer, and never writes anything.
8. Pausing work voluntarily → `status: paused` with `paused_reason`; resuming
   returns it to `in_progress` or `planned`, never directly to `done`.

Statuses are fixed and validated; there is no per-project vocabulary, and each
entity type has its own enum. A milestone is `planned` | `active` | `done` | `dropped`
— there is no `in_progress` for one. `archived: true` on a `done` or `dropped`
task hides the card from active views. `.blink/SCHEMA.md` lists every enum.
<!-- blink:end -->
