---
id: t-0c5wyz
title: Global search — expanding command palette over Postgres FTS
status: planned
created: 2026-08-25T11:23:24Z
updated: 2026-08-28T00:00:00Z
estimate: L
decisions: [d-0c5wyy, d-0cbc74]
tags: [search, frontend, backend]
---

One search across jobs, résumés, cover letters, personas and saved answers,
opened from a trigger beside the notification bell.

**Its own slice, after the answer library.** It touches five entity types, adds
two deep-link routes and one new page route, and only becomes worth having once
there is enough content to lose track of.

**Backend.** `GET /api/v1/search?q=` → one `UNION ALL` over the five tables,
user-scoped, `ts_rank` for ranking, `pg_trgm` `similarity()` for typo
tolerance, `ts_headline` for snippets, `LIMIT` per type. Computed at query
time; the only migration is `CREATE EXTENSION pg_trgm`. Reasoning in
[[d-0c5wyy]].

**Interaction.** The trigger sits beside the bell in the floating cluster at
`app-shell.tsx:44`. Clicking it expands one `position: fixed` element from a
44px circle into a card centred on the content column, roughly 76px from the
top; the trigger rides along inside the card and lands at its right edge, its
icon cross-fading from search to close. Results appear below, grouped by type,
debounced.

**Mechanics, no new dependencies.**
- Morph: `width` / `transform` / `border-radius` over ~300ms on
  `cubic-bezier(0.22, 1, 0.36, 1)`. A `fixed` element cannot inherit the sticky
  cluster's position, so on open read the anchor's `getBoundingClientRect()`
  into `--jv-search-x/y` — about 15 lines, and it stays correct when the rail
  collapses or the scrollbar width changes.
- Results panel: `grid-template-rows: 0fr → 1fr` for auto-height without
  measuring.
- `motion-reduce:` disables all of it, per the existing `animate-jv-*`
  conventions.
- Combobox semantics are not optional: `role="combobox"`, `aria-expanded`,
  `aria-controls`, `aria-activedescendant`, a listbox of results, arrow-key
  navigation, Enter to select, Escape to close.

**Known cost.** `width`/`height` transitions are not compositor-accelerated.
One element for 300ms is fine; noted rather than pretended away.

**Routing a result.**

| Type | Target | State |
|---|---|---|
| Job | `/app/jobs?job=<id>` | exists |
| Cover letter | `/app/cover-letters/<id>` | exists |
| Answer | `/app/answers?answer=<id>` | exists |
| Résumé | `/app/resumes?resume=<id>` | **exists** |
| Persona | `/app/personas?persona=<id>` | build — ~10 lines |

**Scope correction, verified 2026-08-28.** The paragraph this replaces claimed
résumés needed a new `/app/resumes/[id]` route and therefore absorbed [[t-0021]].
That premise is wrong: `resume/resumes-page-client.tsx:11` already reads
`?resume=<id>` and passes it to the workspace as `initialResumeId`, with a
comment saying exactly why ("résumés have no per-id route, so they open in the
list"). A résumé hit links there and needs no new code.

[[t-0021]] is therefore **not absorbed and not a dependency** — the résumé route
split and the `lg`→`xl` breakpoint move stay independent polish, on their own
task. This drops the slice from L to M.

Personas are the only missing deep link: `personas-workspace.tsx:23` holds the
edited persona in local `useState`, so `?persona=<id>` is URL→that state and the
existing `EditPersonaSheet`.

**Shell.** The morph is built over Radix `DialogPrimitive` rather than as a
free-standing `fixed` element, and the origin is read off whichever trigger was
clicked so the desktop cluster and the mobile header both work. Reasoning and
the free fallback in [[d-0cbc74]].

**Conflict to resolve first.** `Cmd/Ctrl+K` is already bound on `window` by the
jobs search field (`components/jobs/search-input.tsx:37`), so it fires on every
page that mounts it. The palette takes the chord and the jobs field gives it
up.

**Depends on** the answer library existing.
