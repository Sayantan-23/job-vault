---
name: blink:setup
blink_version: 0.5.2
description: Use when asked to set up, align, adopt or audit Blink tracking in a project — "set up blink", "align this project to blink", "is blink wired up", "migrate our TODOs into blink", "adopt this repo". Surveys what tracking already exists, reports it, and on confirmation converts it into the Blink content directory.
---

# Blink setup

Aligns job-vault to Blink: checks what is already true, reports it, and —
**only after you confirm** — writes the difference.

This skill reads first and writes second. It never writes anything during the
survey, and it asks exactly once, with the whole findings table on screen, before
it writes anything at all.

## Before anything: is there a tracker?

Look for `blink.json` at the project root.

**If it is missing, stop.** Say so, and say that `blink init` comes first —
this skill aligns a project to a tracker, it does not create one, and
half-configuring a project that has no content directory produces instructions
pointing at a directory that does not exist. The command is:

    blink init .

If `blink` is not on PATH — Blink may be run from a checkout rather than
installed — the same command is `node <blink-checkout>/dist/cli/index.js init .`,
and every `blink …` below has the same substitution. Ask for the checkout path
rather than guessing at one.

If `blink.json` is present, read it: `contentDir` names the content directory,
and everything below is relative to that rather than assuming `.blink/`.

## Phase 1 — survey (read only)

Answer every check. Do not fix anything yet.

1. **Config and content.** Does `blink.json` parse, and does the directory it
   names exist with the five entity subdirectories?
2. **Validation.** Run `blink validate`. Record the error and warning counts and
   the first few messages verbatim.
3. **Always-loaded instructions.** Does `AGENTS.md` exist, and does it contain a
   `<!-- blink:begin -->` block? Same question for `AGENTS.md`. A file that exists
   without the block is the common case and the one that matters — the contract
   is installed but nothing loads it.
4. **Block currency.** If a block is present, check two things: (a) does its
   begin marker carry a version stamp (`<!-- blink:begin v0.5.2 -->`)
   matching the running version? (b) does the block body still match what this
   version of Blink generates? A marker from a prior version or a block that
   predates the `backlog`/`planned`/`paused` lifecycle is confidently wrong.
5. **Skills.** For each Blink skill directory, check two things: presence and
   version currency. Read the `blink_version:` field from each `SKILL.md`
   frontmatter and compare it to the running version (`0.5.2`).

   Original three (must be present):
   - `.Codex/skills/blink:tracking/SKILL.md`
   - `.Codex/skills/blink:setup/SKILL.md`
   - `.Codex/skills/blink:sync/SKILL.md`

   Four new skills added in this version (report if missing):
   - `.Codex/skills/blink:project/SKILL.md`
   - `.Codex/skills/blink:design/SKILL.md`
   - `.Codex/skills/blink:pause/SKILL.md`
   - `.Codex/skills/blink:resume/SKILL.md`

   A present-but-stale skill is a `stale` finding; a missing skill is a
   `missing` finding. Both block the agent from the current contract.

5a. **Unused capability.** For each installed skill, check whether the project
    has adopted it. Two detectors (report-only, no action proposed):
    - `blink:design` present but no `docs/design` doc exists and no design
      decisions are in `.blink/decisions/` → suggest creating one.
    - `blink:project` present but the tracker has no milestones beyond
      example/placeholder entries → suggest running `/blink:project`.

6. **Legacy Blink artifacts.** Is `.Codex/skills/blink-tracking/` there — the
   un-namespaced directory Blink wrote before skills were prefixed `blink:`?
   This is a **different kind of finding** from the one below and needs saying
   differently: it is not a competing system somebody chose, it is Blink's own
   older output, and it now sits beside `blink:tracking` stating a contract
   that predates the `backlog`/`planned` lifecycle. Two copies of Blink's own
   contract, one of them wrong, is the exact failure this tracker exists to
   prevent. `blink init` reports it and deliberately does not remove it;
   removing it is this skill's job, under **Legacy cleanup** below.
7. **Agents.** Does `.Codex/agents/` define anything? An empty roster is not an
   error — it means every task's `owner` is a bare string nobody matched.
8. **Competing tracking.** Search the repository for anything already holding
   project state. Unlike the previous check, these are systems somebody chose on
   purpose, and they hold real work that has to be carried across rather than
   discarded. Look for at least:

   | Found | What it really is |
   |---|---|
   | `docs/project/STATE.md` | A project overview plus a live task list |
   | `docs/project/progress/*.md` | Phase files whose checkboxes are task statuses |
   | `docs/project/30-decisions.md` | ADRs — one decision file each |
   | `docs/project/40-debt.md` | Open risks; each row has a severity |
   | `docs/project/10-requirements.md`, `20-architecture.md` | Docs (`type: spec`) |
   | `TODO.md`, `BACKLOG.md` | Unchecked items are `backlog` tasks |
   | `SESSION-HANDOFF.md` | A doc (`type: note`), not a task |
   | `docs/**/plans/*.md`, `docs/**/specs/*.md` | Docs (`type: spec`) |
   | `.github/ISSUE_TEMPLATE`, an issues export | Out of scope — report it, convert nothing |

   The first five are the artifacts of the `weloin:project-setup` family and
   they duplicate `.blink/` almost field for field, so they are the ones
   worth converting properly.

## Phase 2 — report

Print one table. Every row is a finding, its kind, and the single action you
would take. Nothing else.

The **kind** column is load-bearing, because the four kinds mean different
things to the person reading. `missing`/`stale` is Blink not being wired up
correctly. `legacy` is Blink's own older output that should not still be there.
`competing` is a system somebody built on purpose, holding work that has to
survive. `unused capability` is a report-only suggestion: an installed skill the
project has not yet adopted — no action is proposed and no confirmation is asked.
Never file a `legacy` row under `competing`: it invites "leave it, we use that",
which is the wrong answer for a file Blink itself wrote.

    | Check                      | Kind               | Action                                 |
    |----------------------------|--------------------|----------------------------------------|
    | blink.json                 | ok                 | —                                      |
    | .blink/ structure   | ok                 | —                                      |
    | blink validate             | 2 errors           | fix t-0007 (bad status), t-0011 (dup)  |
    | AGENTS.md block            | missing            | append the Blink block                 |
    | AGENTS.md block            | stale              | replace what is between the markers    |
    | blink:tracking skill    | stale              | run blink init to update               |
    | blink:pause skill       | missing            | run blink init to install              |
    | .Codex/skills/blink-tracking/ | legacy        | superseded by blink:tracking; remove |
    | agents defined             | none               | offer the 5-agent roster               |
    | blink:design skill      | unused capability  | no docs/design doc — suggest creating  |
    | docs/project/STATE.md      | competing          | 14 tasks, 3 decisions → convert, pointer |

Then say what you will **not** do, because that is the part people are worried
about: nothing outside `.blink/`, `AGENTS.md`, `AGENTS.md` and
`.Codex/` is modified; every converted source file stays where it is; and the
only thing ever removed is a legacy Blink artifact that is byte-identical to
what an older Blink wrote.

## Phase 3 — ask, once

Ask for confirmation now, with the table above it. Offer the roster as a separate
yes/no in the same question, because it is the one thing here that is a matter of
taste rather than alignment. Do not ask again per file.

## Phase 4 — apply

### Instruction blocks

Create `AGENTS.md` and `AGENTS.md` if absent, append the marked block if the
file exists without one, replace only what is between the markers if a stale
block is there. Never touch a line outside the markers — these files hold other
people's rules.

### Skill updates

For stale or missing skills, run:

    blink init .

This rewrites only what Blink owns (version-stamped skills, marked blocks,
`SCHEMA.md`). Files Blink owns but that have been hand-edited since init wrote
them get outcome `kept` — for each `kept` file, show a diff of what init would
have written and ask whether to overwrite. Never silently discard a human edit.

### Legacy cleanup

Only `.Codex/skills/blink-tracking/` qualifies, and only under all three of
these conditions.

1. **The replacement is really there.** `.Codex/skills/blink:tracking/SKILL.md`
   exists and its frontmatter reads `name: blink:tracking`. Check this by
   reading the file in this run, not by having written it earlier in this run.
2. **Nobody edited the old one.** `blink init` wrote it and, as far as history
   shows, nothing has touched it since:

       git log --oneline -- .Codex/skills/blink-tracking/SKILL.md
       git status --porcelain -- .Codex/skills/blink-tracking/SKILL.md

   One commit and a clean status means it is Blink's own output, unmodified.
   More than one commit, uncommitted changes, or no git at all means you cannot
   tell — and then you **leave it alone**, say why, and suggest the owner delete
   it themselves once they have checked their edits are not needed. Discarding
   somebody's local edit to save them one stale file is a bad trade.
3. **Nothing else lives in that directory.** If it holds anything besides
   `SKILL.md`, report the extra files and stop.

When all three hold, remove the directory and say so in the summary as its own
line. When they do not, say which condition failed. Do not diff the old file's
prose against the new one to decide — the two are *supposed* to differ, because
the lifecycle wording changed; history is the honest test of whether a human was
involved.

### Adoption

The rule for every conversion:
**convert the work, keep the file, remove the competition.**

- Real work becomes an entity under `.blink/`. An unchecked TODO or an
  unstarted phase item becomes a task with `status: backlog`; a checked one
  becomes `status: done`; something described as in flight becomes
  `status: in_progress`. A debt row becomes a risk with a `severity` — carry the
  row's own high/medium/low across, and use `medium` when it says nothing. An
  ADR becomes a decision file, keeping its original context and consequences
  prose rather than a summary of it.
- **Counts are dropped, not copied.** A progress file that says "8/14 complete"
  or "57%" loses that number entirely. `.blink/SCHEMA.md` forbids writing
  a computed value: progress is `done / (total - dropped)` over the tasks, and a
  written-down copy is a second source of truth that starts drifting on the next
  commit.
- **The original file is not deleted.** Rewrite it to point at
  `.blink/` — a short paragraph saying this file used to hold the plan,
  that the plan now lives in `.blink/`, and the date it moved. Git keeps
  the old content, and anyone who lands on the old path is redirected instead of
  reading a stale list. Deleting it would lose the redirect, and leaving it
  intact would leave two answers to the same question.
- **Create referenced entities before the references.** A task with
  `blocked_by: [r-003]` written before `r-003` exists makes `blink validate`
  emit a dangling-reference warning on a repository that was clean a moment ago.
  Risks and decisions first, then the tasks that point at them.
- Ids continue the existing sequence; they never restart at `t-0001` when the
  directory already holds tasks.

### Agent roster — offered, never imposed

`blink init` does not write agent files, on purpose: a roster is a claim about
how a team works and a scaffold has no business making one. If
`.Codex/agents/` is empty and the roster was accepted, write these five.

| Agent | Tools | Why |
|---|---|---|
| `blink-orchestrator` | Read, Grep, Glob, Bash, Agent — **no Write, no Edit** | Owns the task lifecycle and dispatch. It cannot edit code, so its plan is carried out by someone whose job that is |
| `blink-core-builder` | Read, Edit, Write, Grep, Glob, Bash — **no Agent** | Server, CLI and format work. No `Agent` tool: a builder that can spawn builders makes the roster meaningless |
| `blink-ui-builder` | Read, Edit, Write, Grep, Glob, Bash — **no Agent** | The React app, same reason |
| `blink-reviewer` | Read, Grep, Glob, Bash — **no Edit, no Write** | Runs the gates and reads the diff. Read-only so that a review finding is reported rather than quietly patched; it is the one that catches a status outside its enum |
| `blink-tracker-scribe` | Read, Edit, Write, Grep, Glob — scoped to `.blink/**` | Authors decisions and risks. Creates a risk file **before** any `blocked_by` points at it, so validation never sees a dangling reference |

Each is a `.Codex/agents/<name>.md` with `name`, `description`, `tools` and a
body saying what it does. Blink discovers them by their presence — nothing needs
registering — and matches them against task `owner` values.

If `.Codex/agents/` already has definitions, leave them alone entirely. Report
that a roster exists and move on; overwriting somebody's agents is not alignment.

## Finish

Run `blink validate`. Report the counts. **Zero errors is the bar** — if the
conversion introduced any, fix them before you report success, because a project
whose first experience of Blink is a red validate has learned that the tracker is
noise.

Then print what changed: files created, files rewritten to pointers, entities
added by type, and anything you found but deliberately did not convert.

With alignment complete and the tracker clean, offer: "Run `/blink:project` to
plan milestones and backlog tasks directly in the tracker."

## Do not

- Do not write anything during the survey.
- Do not ask file by file. One table, one question.
- Do not delete a source file. The single exception is an unmodified legacy
  `.Codex/skills/blink-tracking/`, under the three conditions above — and that
  is a file Blink wrote, not one anybody authored.
- Do not copy a percentage, a fraction or a count into any file.
- Do not overwrite agents, or anything outside the markers in `AGENTS.md` and
  `AGENTS.md`.
- Do not invent work. If a heading in an old plan describes no real task, say it
  was skipped and why; a tracker padded with converted noise is abandoned within
  a week.
