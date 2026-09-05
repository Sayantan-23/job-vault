---
name: blink:pause
blink_version: 0.5.2
description: Use when putting work on hold — "pause t-0042", "put the auth work on hold", "park these three tasks".
---

# blink:pause

Put one or more tasks on hold in job-vault's tracker (`.blink/`).

## Resolve each argument

Each argument is an exact task id (e.g. `t-0042`) or a title substring.
Match against `.blink/tasks/*.md` frontmatter:

1. **Exact id** — use it.
2. **Substring match** — exactly one file matches → use it; more than one →
   list candidates (id + title) and ask the user to pick before writing
   anything. Never guess.
3. **No match** — report the argument and stop.

## Guard the transition

Legal entries to `paused`: `in_progress` or `blocked` only. The full
transition map is in `.blink/SCHEMA.md` — read it; do not restate
it here. A task at any other status is skipped with a note.

## Require a reason

If the invoking message carries no reason, ask for one before writing
anything. `paused_reason` is required; a task paused without context is
unresumable.

## Write the changes

For each task that passes the guard, set:

```yaml
status: paused
paused_reason: <the reason supplied>
updated: <now, as an ISO timestamp with a zone — 2026-08-14T10:30:00Z>
```

Do not touch any other field. Body prose belongs to the user.

## Report and validate

One summary line per task:

    paused t-0042 "Auth flow refactor" — standing by for design sign-off

Then run `blink validate`. Exit 0 means clean; fix any error before
reporting done.
