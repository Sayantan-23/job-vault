# Plan — Timeline page + Settings page (the two 404'ing sidebar links)

**Goal:** Make the app feel complete by resolving the two dead links surfaced in the 2026-06-16 audit:
1. **`/app/timeline`** — a user-scoped global activity feed across all jobs (the sidebar "Timeline" link currently 404s).
2. **`/app/settings`** — a real settings page (the account-menu "Settings" link currently 404s).

Both come straight from `docs/deferred-tasks.md` (the global timeline feed) and the audit. Branch: `timeline-settings-pages`.

## Decisions

- **Timeline data:** new paginated `GET /api/timeline` (userId-scoped), each row **enriched with the job's title + company** via an inner join so a cross-job feed is legible. Reuses the per-job `findByJob` table; adds `findByUser`. Per-job endpoint untouched.
- **Timeline UX:** reuse `TimelineEntry` (add an optional `jobLink` prop) and `JobsPagination` (already prop-driven). Rows link to **`/app/jobs?job=<id>`** — that's where `JobDrawer` is mounted, so clicking opens the job. Page synced via `?page=`.
- **Settings = frontend-only.** No backend changes. Three sections:
  - **Appearance** — Light / Dark / System theme toggle. This requires a **new, self-contained theme system** (cookie + no-FOUC inline script, no `next-themes` dep) because the `.dark` wiring was never built (`theme.css:30` "wiring lands in Slice 1" — it didn't). Dark mode is fully styled but currently **unreachable**; this closes that gap.
  - **Account** — read-only email + name, "Edit profile →" link to `/app/profile`, Sign out.
  - **Notifications** — honest informational note: in-app delivery is on; email is upcoming (tracked in `deferred-tasks.md`). No fake toggles.
- **Theme persistence:** cookie only (`theme=light|dark|system`), readable across reloads. Backend `users.preferences.theme` cross-device sync is **deferred** (would force a server-side user fetch in the root layout / FOUC handling).
- **No password change** — needs a backend auth endpoint; deferred.

## Tasks (TDD, commit per group)

### A. Backend — global timeline endpoint
1. `timeline.schema.ts`: add `TimelineQuerySchema` (`page` ≥1 default 1, `limit` 1..100 default 50) + `TimelineQueryInput`.
2. `timeline.repository.ts`: add `findByUser(userId, limit, offset)` → `{ rows: GlobalTimelineEventRow[], total }` (inner join `jobs` for `jobTitle`/`jobCompany`, `desc(createdAt)`, `count()`); export `GlobalTimelineEventRow` type.
3. `timeline.service.ts`: add `listForUser(userId, query)` → `{ rows, total, page, limit }`.
4. `timeline.controller.ts`: add `listGlobal` → `{ data, meta: { total, page, limit, totalPages } }`.
5. `timeline.router.ts`: export `timelineGlobalRouter` (authMiddleware + `GET /` with `validate(TimelineQuerySchema, 'query')`).
6. `api-router.ts`: mount `'/timeline'`.
7. Tests: `timeline.repository.test.ts` (findByUser: ordering, pagination, total, enrichment, user-scoping), `timeline.router.test.ts` (`GET /api/timeline`: 401, 200+meta), `timeline.service.test.ts` (pagination passthrough).

### B. Frontend — timeline page
8. `types/timeline.ts`: add `GlobalTimelineEvent` (= `TimelineEvent` + `jobTitle`, `jobCompany`).
9. `query-keys.ts`: add `globalTimelineKey(page)`.
10. `hooks/use-global-timeline.ts`: `useGlobalTimeline(page, initialData?)` → `apiClient.getPage<GlobalTimelineEvent>('/api/timeline?page=&limit=50')`, `keepPreviousData`.
11. `components/jobs/timeline/timeline-entry.tsx`: add optional `jobLink?: { href; label }` → renders a small job link line. (Per-job callers unchanged.)
12. `components/timeline/timeline-feed.tsx` (`'use client'`): header + `<ol>` of entries + `JobsPagination` + empty/loading states; `?page=` synced via router.
13. `app/app/timeline/page.tsx` (server): SSR first page via `apiServer.getPage`, parse `?page=`, `<Suspense fallback={<TimelineSkeleton/>}>`.
14. `app/app/timeline/loading.tsx` + `TimelineSkeleton` in `route-skeletons.tsx`.
15. Tests: `use-global-timeline.test.tsx`, `timeline-feed.test.tsx`.

### C. Frontend — theme system
16. `lib/theme.ts`: `Theme` type, cookie name, `resolveTheme`, apply helper, the inline-script source string.
17. `components/theme/theme-script.tsx`: server component emitting the no-FOUC `<script>` (first child of `<body>`).
18. `components/theme/theme-provider.tsx` (`'use client'`) + `hooks/use-theme.ts`: context `{ theme, setTheme }`, applies `.dark`, writes cookie, listens to system changes in `system` mode.
19. Wire `ThemeScript` into `app/layout.tsx`; wrap `ThemeProvider` in `components/shared/providers.tsx`.
20. Tests: `use-theme.test.tsx` (toggles `.dark`, persists cookie, system follows matchMedia).

### D. Frontend — settings page
21. `components/settings/settings-section.tsx`: titled section wrapper (no inline styled markup).
22. `components/settings/settings-workspace.tsx` (`'use client'`): PageHeader + Appearance (SegmentedControl Sun/Moon/Monitor) + Account (email/name + profile link + Sign out) + Notifications note.
23. `app/app/settings/page.tsx` + `loading.tsx` + `SettingsSkeleton`.
24. Tests: `settings-workspace.test.tsx` (sections render; theme control switches theme).

### E. Gates + docs
25. Backend: `npm run typecheck && lint && test`. Frontend: `typecheck && lint && test && build`.
26. Update `progress.md` + tick the global-timeline item in `deferred-tasks.md`.
27. Adversarial read-only review pass (workflow), fix findings, re-gate.
