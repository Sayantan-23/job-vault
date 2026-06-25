# App redesign — Editorial workspace shell (de-dashboard)

> Status: **PLAN — awaiting review.** Date: 2026-06-25. Branch: `app-editorial-shell-redesign`.
>
> Scope: the authenticated `/app/*` surface only. No backend changes, no API contract changes, no new data. This is a **frontend re-pointing** of the existing app from "monitor a pipeline" (KPI cards, top utility bar, dense table, bordered widgets) to "a calm place to work on applications" (dissolved sidebar, in-content editorial headers, grouped borderless lists). Public `(web)` pages and `(auth)` are out of scope except the shared serif-font swap.
>
> Reference artifact: `docs/mocks/redesign-shell.html` (interactive Before/After + Light/Dark toggles) and the rendered `docs/mocks/shot-*.png`. The "After" state is the target.

---

## 1. Goal

Make the app stop reading as an admin dashboard while keeping the minimalist-ui design system (warm-stone, muted-indigo, flat, hairlines, Geist + Geist Mono) **intact**. The diagnosis (from the surface audit) is that the dashboard feel comes from **framing and chrome**, not the visual style:

1. A standalone **Dashboard page that is a 5-KPI stat-card grid**.
2. A **two-sided frame**: bordered sidebar + bordered top **utility toolbar** (search / filter / view-toggle / Add / notification bell).
3. **Full-weight bordered cards everywhere** (`rounded-xl border border-border bg-card`) turning content into widgets.
4. A **dense uppercase data-grid** for the jobs list.

We fix the framing, not the palette.

## 2. Locked decisions (from brainstorming + mock review)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Keep the left sidebar**, but dissolve it into the canvas: same background as content, no right border (hairline at most), no logo cell, no section dividers, lighter nav items. | The rail itself isn't a dashboard tell (Linear/Things/Notion all have one). Its *weight* is. The board needs width + fast switching across 6 destinations, so a rail beats top-nav. |
| 2 | **Remove the global top utility bar.** Page title becomes an **in-content editorial heading**; page actions go inline beside it. | The bordered toolbar stacked above content is the strongest back-office gesture. Content should open directly on the canvas. |
| 3 | **Drop the standalone Dashboard page.** `/app/jobs` becomes the home. Stats survive as **one quiet inline text line** (reusing `GET /api/dashboard/stats`), surfacing only the actionable signal ("N going quiet"). | A KPI-grid landing frames the product as "watch numbers." Jobs-as-home frames it as "work on applications." |
| 4 | **Editorial serif = Newsreader**, replacing **Instrument Serif** as the single editorial face (app + auth). Used **sparingly** — page headings and empty states only. | Chosen over Instrument Serif (more body, less overexposed), Fraunces, and a sans-display option after a side-by-side render. Serif is the biggest single lever toward the document feel. One serif across the app keeps the brand coherent. |
| 5 | **Jobs list → grouped borderless list** in the `document-list` idiom already in the codebase, grouped by attention ("Needs your attention" = stale + ghosted; "In progress" = the rest). Status chips + ghost meters preserved verbatim. | Reuses an existing editorial pattern the user prefers; grouping by *what needs action* (not by status columns) is itself an anti-dashboard reframe. |
| 6 | **Notifications** moves from a header bell into a quiet **sidebar nav item** with an unread dot. | Removes the last admin-utility from the (now-deleted) top bar. |
| 7 | **Keep the Kanban board.** Just quiet it (hairline columns, de-emphasised count badges). No structural board change. | The board is legitimate product UI; the goal is "calm workspace," not "remove all structure." |
| 8 | **Frontend-only.** `GET /api/jobs` and `/api/dashboard/{stats,kanban}` already filter/sort/paginate server-side (Slice 5). No backend, DB, or contract change. | De-risks the slice entirely to the Next app. |

### Out of scope (explicitly deferred)
- Résumé/Cover-letter **workspace** layouts (already editorial). Only their card-grid library rows get the hairline sweep in 9d.
- Public `(web)` redesign, Google OAuth, email reminders (separate backlog).
- Any new sort/filter *capability* — we restyle the existing controls, preserving server-side behavior.

---

## 3. Work breakdown (4 parts, commit per task, TDD where behavior is testable)

Visual-only changes are verified by RTL **structure/behavior** tests (role/text/aria, conditional rendering, grouping logic, redirect) plus a Docker smoke pass for fidelity — we don't snapshot pixels.

### 9a — Foundations (tokens, type, shared primitives)
1. **Serif swap.** `app/layout.tsx`: replace `Instrument_Serif` next/font with `Newsreader` (`variable: '--font-newsreader'`, opsz axis). `styles/globals.css`: `--font-serif: var(--font-newsreader)`. Remove the Instrument import + class. *Test:* none (font wiring) — verified in smoke.
2. **Hairline divider token.** `styles/app/theme.css`: add `--hairline` (lighter than `--border`, e.g. light `oklch(0.95 0.003 75)`, dark `oklch(0.30 0.006 75)` or a low-opacity `--border` mix) for list-row dividers; bridge in `@theme inline`. Keep `--border` for genuine separators. *Test:* none.
3. **`PageHeading`** (`components/layout/app/page-heading.tsx`) — content-column header: serif `<h1>` (`font-serif`), optional muted description, optional `actions` slot (right-aligned, inline), optional `back` affordance (ports the existing `PageHeader` `back` prop). Lives *inside* the scroll column, generous top spacing, no border. *Test (RTL):* renders heading text as `role=heading`; renders actions; back link present when `back` set.
4. **`InlineStats`** (`components/dashboard/inline-stats.tsx`) — a single muted text row: `<b>N</b> tracked  ·  N interviewing  ·  N going quiet` (the "going quiet" segment tinted `--ghost-ghosted`), mono numerals, wide-gap separators (no dot-spam). Consumes the existing `useDashboardStats`. *Test (RTL):* renders the three figures from a stats fixture; "going quiet" carries the ghost class; handles zero/loading.

### 9b — Shell de-chrome
5. **Sidebar dissolve** (`app-shell.tsx`, `sidebar-nav.tsx`, `account-menu.tsx`): drop the sidebar `bg-card` + `border-r` (→ `bg-background`, hairline or none), remove the logo `border-b` cell (quiet wordmark only), remove the account `border-t`. Lighten nav item idle/active states per the mock. *Test:* nav renders all items; active state by pathname (existing behavior preserved).
6. **Nav changes** (`sidebar-nav.tsx`): remove the `Dashboard` entry; add a `Notifications` entry (icon `Bell`) wired to the existing unread count with a dot when `unread > 0`. *Test (RTL):* no "Dashboard" link; "Notifications" link present; dot shown only when unread > 0.
7. **Retire the top bar.** Migrate all **~14 `PageHeader` usages** to `PageHeading` inside each page's content column; delete the global bordered `PageHeader`. Remove `NotificationBell` from page actions (now in the rail). *Test:* per-page smoke + existing page tests updated to find the heading via `role=heading`.
8. **Home routing.** Make `/app/jobs` the home: locate the post-login / default `/app` landing (login form + any `app/app/page.tsx`) and point it at `/app/jobs`; turn `/app/dashboard` into a redirect to `/app/jobs` (back-compat), then delete `DashboardOverview`/`DashboardStats`/`StatCard` once nothing imports them. *Test (RTL/route):* visiting `/app/dashboard` redirects; default landing resolves to jobs.

### 9c — Jobs home & list
9. **Inline header on Jobs** (`jobs-workspace.tsx`): render `PageHeading title="Jobs"` + `InlineStats`; move the toolbar (`jobs-toolbar.tsx`) controls — search (⌘K), ghost filter, board/list toggle, Add job — into the `PageHeading` `actions` slot, de-chromed. *Test:* actions present; toggle switches view (existing behavior).
10. **`JobList`** (restyle `jobs-table.tsx` → borderless grouped list): two-line rows (title + muted `Company · Location`), right cluster = `StatusChip` + `GhostMeter` + short date, `--hairline` `divide-y`, subtle hover, no box. Group rows into **"Needs your attention"** (ghost level stale/ghosted on the current page) and **"In progress"** (rest); plain-case group labels with a mono count (no uppercase eyebrow). Drop the uppercase sort-header grid; expose sort as a small menu in the actions. Preserve server-side sort/filter/pagination wiring. *Test (RTL):* a fixture with mixed ghost levels splits into the two groups in order; rows link to `?job=<id>`; sort menu drives the existing sort param.
11. **Quiet the board** (`kanban-column.tsx`, `kanban-card.tsx`): columns → hairline + softer `bg-muted` fill; de-emphasise the mono count badge. No DnD/behavior change. *Test:* unchanged board tests pass.

### 9d — De-box sweep (polish; lower priority)
12. **Card-restraint pass**: soften `SettingsCard`, persona/résumé/cover-letter **library card grids**, dialogs/popovers from full `border` to `--hairline` + reduced fill, replacing boxes with whitespace where elevation isn't communicating hierarchy. Personas grid → optionally align to the borderless list. *Test:* existing component tests updated for class/structure only where they assert it.
13. **Empty states**: give Jobs/Personas/Résumés/Cover-letters an editorial empty state (serif line + one action), replacing any boxed placeholder.

### Verification (gating, before any merge ask)
- `frontend-next`: `npm run typecheck && npm run lint && npm run test && npm run build`.
- Docker smoke at `http://localhost:8080`: sign in → lands on Jobs (no dashboard), shell has no top bar/dissolved rail, list grouped + borderless, board still drags, notifications in rail, dark + light both clean.
- Update `progress.md` and `CLAUDE.md` "Current State". **Do not merge to master until the user says so** (branch + commits only).

---

## 4. Risks / watch-items
- **PageHeader migration is wide (~14 pages).** Mechanical but touch-heavy; do it page-by-page with the test suite green between commits. Candidate for a `Workflow` fan-out (one agent per page) if it drags.
- **Attention-grouping is per-page** (pagination): a job on page 2 won't pull into "Needs attention" on page 1. Acceptable for v1; note it, revisit if it confuses.
- **Serif swap is app-wide** (auth too): verify auth headings still look right in Newsreader before committing 9a.
- **Deleting `DashboardOverview`** — grep for every import (kanban/stats hooks may be shared) before removal; keep `useDashboardStats` (now feeds `InlineStats`).

## 5. Suggested order
9a → 9b → 9c, each gated green, smoke after 9b (shell) and 9c (home). 9d is independent polish and can land last or be dropped without blocking. Recommend orchestrating 9b task 7 (the PageHeader sweep) as a small `Workflow` if the per-page edits pile up.
