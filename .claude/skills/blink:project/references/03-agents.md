---
name: blink:project
blink_version: 0.5.2
description: Agent roster review — reads existing agents and task owners, proposes minimal roster deltas (add/retire/retool), then writes agent files and a decision on confirmation.
---

# Agent roster review

Use for subcommand `agents`. Reviews the current roster against how the
project actually works, proposes the minimal delta, and writes only on
confirmation. Never overwrites a user-authored agent without explicit consent.

## Read first

1. **`.claude/agents/`** — every `.md` file; read `name` and `description`.
   An empty directory is a valid starting state.
2. **Task `owner` values** — `grep -r "^owner:" .blink/tasks/` — what
   names are in use? Each is a claim about an agent that should exist.
3. **`orchestration` field** in `.blink/project.md` — which tier?
   (Tier definitions are in `/blink:tracking`; cite, do not restate.)
4. **Fan-out** — how many open tasks exist? How many run in parallel?

## Propose deltas

Build a table of proposed changes (add / retire / retool):

    | Agent               | Change  | Reason                             |
    |---------------------|---------|------------------------------------|
    | blink-orchestrator  | add     | no dispatcher in .claude/agents/   |
    | blink-ui-builder    | retool  | Write needed for new UI layer      |
    | old-prototype       | retire  | all its tasks are done             |

Never overwrite an existing user-authored agent. The `/blink:setup` rule
applies verbatim: if `.claude/agents/` has definitions, report what is there
and ask before changing anything.

Ask once with the full delta table on screen.

## Write on confirmation

- **Add**: create `.claude/agents/<name>.md` with `name`, `description`,
  `tools`, and a body describing scope and what the agent must not do.
- **Retire**: add a body note "retired <date>: tasks done; no new work
  assigned." Never delete the file.
- **Retool**: edit only the `tools` field and note the change in the body.

Then write a decision: `.blink/decisions/d-NNN-agent-roster.md`
recording the roster shape, the tier it serves, and each agent's constraints.
Id continues the existing sequence.

Run `blink validate`. Print what changed.

## Do not

- Do not overwrite a user-authored agent without explicit confirmation.
- Do not add agents that duplicate an existing role.
- Do not touch task or milestone files — this page is roster-only.
- Do not write the decision before confirmation.
