---
name: blink:resume
blink_version: 0.5.2
description: Use when resuming paused tasks — "resume t-0042", "unpark the auth work", "start t-0010 again".
---

# blink:resume

Resume one or more paused tasks in job-vault's tracker (`.blink/`).

## Resolve each argument

Same lookup as `blink:pause`: exact task id, else title substring. Ambiguous
match → list candidates (id + title) and ask. No match → report and stop.

## Guard the transition

Legal entry to `in_progress` or `planned`: from `paused` only. The full
transition map is in `.blink/SCHEMA.md`. A task at any other status
is skipped with a note.

## Choose the target status

Default: `in_progress` — the task is picked back up now.
`planned` — when the user says "not yet" or "just unpark it"; work is not
starting immediately.

## Write the changes

For each task that passes the guard, set:

```yaml
status: in_progress   # or planned — see above
updated: <now, as an ISO timestamp with a zone — 2026-08-14T10:30:00Z>
```

**Remove `paused_reason` entirely** — it belongs to the paused state only.
If resuming to `in_progress` and the user names an owner, set `owner`;
otherwise leave the existing `owner` field as-is.

## Report and validate

One summary line per task:

    resumed t-0042 "Auth flow refactor" → in_progress (owner: Codex)

Then run `blink validate`. Exit 0 means clean; fix any error before
reporting done.
