---
name: blink:design
blink_version: 0.5.2
description: Prototype loop — user-gates a page inventory, scaffolds to the project stack or static HTML in prototype/, serves on localhost, iterates user-gated rounds with fixture-same-commit rule, delegates hi-fi to frontend-design if installed.
---

# Prototype — iterate until the user ships it

You are here because `.blink/docs/design.md` exists. Read it before
anything else. The palette, typography, device targets and accessibility bar are
already decided and are never asked again.

## Page inventory

Derive a table from the project's existing routes, views or screens (named in
docs, code, or the design doc) plus any gaps the design doc implies:

| Page / view | Entry point | Status |
|---|---|---|
| <name> | <route or file> | existing \| new |

Present the table and **stop**. Do not scaffold anything yet. Ask the user to
confirm or adjust — adding, removing or renaming a page before a file is written
costs nothing; doing it after costs a rename and a commit.

## Scaffold (after the user gates the inventory)

1. **Project has a dev server** — check `package.json` for a `dev` or `start`
   script. If found, scaffold pages into the project's own stack (the framework
   it already uses). Do not introduce a second framework.
2. **No dev server** — scaffold static HTML/CSS/JS into a `prototype/`
   directory at the project root. One `.html` per page, a shared
   `prototype/styles.css`, and a `prototype/data/` directory for fixture files.

Apply the design doc's palette, type scale and device targets from the first
file. Placeholders are fine; invented brand colours are not.

## Serve — print the URL

- **Project dev server:** `npm run dev` (or the named script). Note the port it
  binds; do not assume 3000.
- **Static prototype:**
  ```
  python3 -m http.server <port> --directory prototype
  ```
  If Python is unavailable:
  ```
  npx serve prototype --listen <port>
  ```

Pick an unused port (8080 is the safe default; try 8081, 8082 if taken). Print
the full URL — `http://localhost:<port>` — before asking the user to review.

**Kill the server when the session ends.** A dangling process is the one thing
this skill guarantees the user does not inherit.

## User-gated rounds

Each round follows this sequence — no shortcuts:

1. Say what changed and where to look (`http://localhost:<port>/<page>`).
2. **Wait for the user to review in their browser.** Do not proceed until they
   respond. Visual judgment is never automated.
3. Apply the feedback. Scope the changes to what was asked — do not refactor
   adjacent code or redesign unmentioned pages.
4. Update fixture data in the **same commit** as the UI change (see below).
5. Commit: `feat(prototype): <one-line description of the round>`. One commit per
   user-gated round — never batched.

## Fixture rule — same commit as the UI change

Any data the prototype displays — a list of items, a user profile, a metric —
must live in a fixture file (`prototype/data/` or the project's own fixture
directory), not in the component or template. Updating a fixture in the same
commit as the UI change that renders it is what keeps the two in step. A UI that
shows stale data teaches nothing; a prototype that teaches nothing is dropped.
Never hardcode data values in markup.

## Hi-fi pass — delegate when the skill exists

Check whether `.claude/skills/frontend-design/` exists.

- **Skill present** — after the user confirms the lo-fi structure is right, say
  "structure locked; delegating hi-fi pass to `/frontend-design`" and hand
  off. Do not replicate what that skill does inline.
- **Skill absent** — continue inline: tighten spacing, apply the type scale
  from the design doc, verify colour contrast meets the accessibility bar from
  `.blink/docs/design.md`, and test keyboard navigation on every
  interactive element before closing the round.

## Tracker updates

A round that ships is a task moving to `status: done`. Update the file, bump
`updated` to today, run `blink validate`. The tracker and the prototype stay in
step or neither is trustworthy.

## Do not

- Do not scaffold before the page inventory is user-gated.
- Do not re-ask design questions that `.blink/docs/design.md` already answers.
- Do not leave the server running when the session ends.
- Do not hardcode fixture data in markup or component files.
- Do not commit a UI change without the fixture data it depends on.
- Do not accept visual output without a human reviewing it in the browser.
