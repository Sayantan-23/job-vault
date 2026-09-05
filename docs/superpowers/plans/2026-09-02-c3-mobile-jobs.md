# C3 — Mobile Jobs: list, filter sheet, detail screen, status change

> **For the coder agent:** implement task-by-task. Each task lists exact files, the
> sibling pattern to mirror, and the gates to run. No design decisions — they're
> made here. Colocated `*.test.tsx` beside each component (no snapshots). Repo
> root is `git rev-parse --show-toplevel`; all paths below are repo-relative.

**Blink:** task `t-0ccxkn`, milestone `m-0cc02t`. Spec
`docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §4.1–4.3, §8.

**Goal:** the Jobs tab stops being a `Placeholder` and becomes the spine of the
app: a grouped infinite list with a filter bottom-sheet, a full-screen job
detail, and status change via a chip + a row swipe — all reading the **existing
unchanged** backend.

**Architecture:** straight ports of web pure-logic (`job-status.ts`, `ghost.ts`,
`types/job.ts`, `types/filters.ts`, `query-keys.ts`) + a **new**
`useInfiniteJobs` hook (the web `useJobs` is offset-paginated `useQuery`; mobile
needs `useInfiniteQuery`). TanStack Query is not yet installed in `mobile/` —
C3 owns the install + provider. Filter state is **local React state** (the web's
URL-state model has no native equivalent); the `JobFilters` *shape* is unchanged
so the backend contract is untouched. Job detail is a **full-screen route**
`app/jobs/[id].tsx` rendered by the root `Stack` (tab bar hidden) — not a sheet
(spec §4.3). Status change uses `PATCH /api/jobs/:id` with `{ status }` via
`useUpdateJob` — **not** `/move` (that's kanban-only, requires `kanbanOrder`).

## Corrections to the task file (consistency-before-novelty)

The task file `t-0ccxkn` and spec §4.1–4.3 have three errors the web reference
caught. The plan follows the **web**, not the task file:

1. **List grouping is not "by status".** Web (`job-list.tsx:22`) does a two-bucket
   client-side partition: `Needs your attention` (ghosted AND status in
   `APPLIED|INTERVIEWING`) / `In progress`. Server order preserved inside each
   bucket (re-sorting would make the sort menu lie). Mobile mirrors this.
2. **Status change is `PATCH /api/jobs/:id` `{ status }`**, not `/move`. `/move`
   is kanban drag only. The detail status chip AND the row swipe both hit
   `useUpdateJob`.
3. **Drawer section order** (actual, `job-drawer.tsx:36–58`): Header → Details →
   **Outreach** → Snapshot → Reminders → Résumé launcher → Cover-letter launcher
   → **Timeline** → sticky Delete footer. Flat siblings, no config array.

## Reused unchanged (port verbatim — pure TS, no DOM)

| Web source | Mobile target | Notes |
|---|---|---|
| `src/types/job.ts` | `mobile/src/types/job.ts` | `Job`, `ScrapeResult`, `JobContact` |
| `src/types/filters.ts` | `mobile/src/types/filters.ts` | `JobFilters`, `GhostFilter`, `SortField`, `SortOrder`, `Paginated<T>`, `PageMeta`, defaults |
| `src/types/contact.ts` | `mobile/src/types/contact.ts` | `JobContact`, `ContactChannel`, `ContactStatus` |
| `src/lib/job-status.ts` | `mobile/src/lib/job-status.ts` | `JOB_STATUSES`, `JobStatus`, `STATUS_META`. **Adapt `STATUS_META[].className`** — verify `/10` opacity + `opacity-70` render in NativeWind; if not, replace with explicit token classes (`bg-primary/10` may need a `bg-secondary` fallback). Keep this in `lib/`, not `components/`. |
| `src/lib/ghost.ts` | `mobile/src/lib/ghost.ts` | `GHOST_ACTIVE_MAX`, `GHOST_STALE_MAX`, `ghostLevel`, `ghostLabel`, `GhostLevel`. Tokens `ghost-active`/`ghost-stale`/`ghost-ghosted` already exist in `global.css`. |
| `src/lib/query-keys.ts` | `mobile/src/lib/query-keys.ts` | `JOBS_KEY`, `jobKey`. **Add `jobsInfiniteKey(filters)`** — drops `page` (see Wave 1 Task 3). |
| `src/lib/queries.ts` | `mobile/src/lib/queries.ts` | `jobsListQuery` (the path builder). Mobile calls it from `useInfiniteJobs`. |
| `src/lib/filters.ts` | `mobile/src/lib/filters.ts` | `buildListQuery` (URL→query builder, the API-name mapping), `isListFiltered`. **Drop `parseFilters`** (URL→filters) — no URL state on native. Keep `buildListQuery` + `isListFiltered`. |

**Not ported:** `use-job-filters.ts` (URL state — replaced by local state),
`jobs-pagination.tsx` (replaced by infinite scroll), the board, `AddJobModal`
(that's C5).

## File structure — `mobile/src/`

All net-new. Routes stay thin (a test file under `src/app/` is bundled as a route
and breaks the Android bundle — `x-0cgq5d` log 2026-09-01). Real screens live in
`src/screens/` or `src/components/jobs/`; tests go beside the component.

```
src/
├─ app/
│  ├─ _layout.tsx                         MODIFY — wrap QueryClientProvider
│  ├─ (tabs)/index.tsx                    MODIFY — Placeholder → <JobsScreen/>
│  └─ jobs/[id].tsx                       NEW — thin route → <JobDetailScreen/>
├─ lib/
│  ├─ query-client.ts                     NEW — QueryClient (staleTime 30s, retry 1)
│  ├─ query-keys.ts                       NEW (port + jobsInfiniteKey)
│  ├─ queries.ts                          NEW (port jobsListQuery)
│  ├─ job-status.ts                       NEW (port + adapt STATUS_META)
│  ├─ ghost.ts                            NEW (port)
│  └─ filters.ts                          NEW (port buildListQuery + isListFiltered)
├─ types/
│  ├─ job.ts, filters.ts, contact.ts      NEW (port)
├─ hooks/
│  ├─ use-jobs.ts                         NEW — useInfiniteJobs + useJob + useUpdateJob + useDeleteJob (NO useCreateJob/useScrapeJob — C5)
│  └─ use-jobs.test.tsx                   NEW
├─ components/
│  ├─ ui/
│  │  ├─ card.tsx + .test.tsx             NEW primitive
│  │  ├─ badge.tsx + .test.tsx            NEW primitive (Pill — status + outreach)
│  │  └─ empty-state.tsx + .test.tsx      NEW primitive
│  ├─ ui/gallery.tsx                     MODIFY — add Card/Badge/EmptyState sections
│  ├─ jobs/
│  │  ├─ jobs-screen.tsx                  NEW — list + filter trigger + FAB-onPress
│  │  ├─ job-row.tsx + .test.tsx          NEW
│  │  ├─ ghost-meter.tsx                  NEW (port kanban/ghost-meter.tsx)
│  │  ├─ status-chip.tsx                  NEW (port kanban/status-chip.tsx)
│  │  ├─ outreach-badge.tsx               NEW (port — drop `hidden sm:flex`, always show)
│  │  ├─ filter-sheet.tsx + .test.tsx     NEW — Sheet with search/status/ghost/sort/created
│  │  ├─ job-detail-screen.tsx            NEW — full-screen, 8 sections
│  │  └─ sections/
│  │     ├─ job-detail-header.tsx         NEW (sticky)
│  │     ├─ job-details.tsx               NEW (status Select + notes)
│  │     ├─ outreach-section.tsx          NEW (tap-to-call/email via parseContact)
│  │     ├─ job-snapshot.tsx              NEW (port — MarkdownProse on snapshotMarkdown)
│  │     ├─ reminders-section.tsx         NEW (read-only list — no reminder CRUD in C3)
│  │     ├─ resume-launcher.tsx           NEW (read/copy link — §4.7)
│  │     ├─ cover-letter-launcher.tsx     NEW (read/copy link — §4.7)
│  │     ├─ timeline-section.tsx          NEW (read-only feed)
│  │     └─ job-detail-footer.tsx         NEW (sticky Delete → ConfirmDialog)
```

**File ownership for parallel lanes** (wave 2): Lane C owns `jobs-screen.tsx`,
`job-row.tsx`, `ghost-meter.tsx`, `status-chip.tsx`, `outreach-badge.tsx`,
`filter-sheet.tsx`, `app/(tabs)/index.tsx`. Lane D owns `app/jobs/[id].tsx`,
`job-detail-screen.tsx`, `sections/*`. Shared read of `STATUS_META` /
`useUpdateJob` (owned by Wave 1) — no collision.

## Gates (run before merge)

```
make typecheck
make lint
make test
npm --prefix mobile run typecheck
npm --prefix mobile run lint
npm --prefix mobile test
blink validate
```
Plus: `npx expo export` (the `expo export` gate catches route/test collisions jest
cannot — `x-0cgq5d` log 2026-09-01). Delete `mobile/.expo/cache/eslint` before
trusting lint (phantom `import/no-unresolved` — same run, 2026-09-01).

---

# WAVE 1 — foundation + primitives (two parallel lanes)

## Lane A — data foundation

### Task A1: TanStack Query install + provider
- `npx expo install @tanstack/react-query` (house rule: expo install, never raw npm).
- `mobile/src/lib/query-client.ts` — new QueryClient: `defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } }`. **Replace** the web's `refetchOnWindowFocus` concern: native wants no focus manager here (a later task may add `AppState` refocus — out of scope for C3; mark with `// ponytail: no AppState refocus — add if stale data bites`).
- `mobile/src/app/_layout.tsx` — MODIFY: wrap the root `Stack` in `<QueryClientProvider client={queryClient}>`. Keep `GestureHandlerRootView` outermost (it already wraps at line 45). Fonts + splash logic unchanged.
- Sibling pattern: the web `frontend-next/src/lib/query-client.ts` + `app/providers.tsx`.
- Gate: `npm --prefix mobile run typecheck` + `npm --prefix mobile test`.

### Task A2: Port pure-logic types + libs
- Port `types/job.ts`, `types/filters.ts`, `types/contact.ts`, `lib/job-status.ts` (adapt `STATUS_META` classNames), `lib/ghost.ts`, `lib/filters.ts` (drop `parseFilters`), `lib/queries.ts`, `lib/query-keys.ts` per the table above. Verify against NativeWind: write a tiny colocated `job-status.test.ts` asserting `STATUS_META` keys + that the `className` strings are non-empty.
- Gate: typecheck.

### Task A3: `useInfiniteJobs` + hooks
- `mobile/src/hooks/use-jobs.ts`:
  - `useInfiniteJobs(filters: Omit<JobFilters,'page'>)` — `useInfiniteQuery`:
    - `queryKey: jobsInfiniteKey(filters)` (drops `page`).
    - `queryFn: ({ pageParam = 1 }) => apiClient.getPage<Job>(jobsListQuery({...filters, page: pageParam, limit: 30}).path)`. Send `limit: 30` (backend accepts up to 100; web never sends it, stuck at 20).
    - `getNextPageParam: (last) => last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined`.
    - `select: (pages) => pages.pages.flatMap(p => p.data)` — flatten.
    - `placeholderData: keepPreviousData` (import from `@tanstack/react-query`).
  - `useJob(id)` — `useQuery`, port.
  - `useUpdateJob(id)` — `useMutation`, `PATCH /api/jobs/${id}` `{ status }`, invalidate `JOBS_KEY` + `jobKey(id)` + `setQueryData(jobKey(id), updated)`. **Mirror** the web invalidations (`use-jobs.ts:50`) minus the dashboard keys (no dashboard on mobile yet).
  - `useDeleteJob(id)` — port; on success invalidate `JOBS_KEY` + `router.navigate('/')` is the screen's job, not the hook's.
  - **No** `useCreateJob`/`useScrapeJob` — those are C5.
- `use-jobs.test.tsx` — assert: first page returned, `hasNextPage` true when `totalPages>1`, flatten selects concatenated rows, `useUpdateJob` invalidates `JOBS_KEY`. Mock `apiClient.getPage`.
- Sibling pattern: `frontend-next/src/hooks/use-jobs.ts`. Gate: `npm --prefix mobile test`.

## Lane B — missing primitives

### Task B1: `Card`, `Badge`, `EmptyState`
- `mobile/src/components/ui/card.tsx` — a `Card` (container with `bg-card border border-hairline rounded-md`). Sibling: web `components/ui/card.tsx` if it exists, else the existing `Select`'s `Sheet` styling.
- `mobile/src/components/ui/badge.tsx` — `Badge`/`Pill` with `variant` (default/secondary/outline/ghost-active/ghost-stale/ghost-ghosted). One component, variants — never override classes (`cn.ts` is not tailwind-merge, per the map).
- `mobile/src/components/ui/empty-state.tsx` — `EmptyState({ title, description, action? })`. Mirror web `job-list.tsx:98` two variants via props, not two components.
- Colocated `*.test.tsx` for each (behavioural, no snapshots). Add a section each to `gallery.tsx`.
- Gate: `npm --prefix mobile test` + lint.

---

# WAVE 2 — list+filters + detail (two parallel lanes, after Wave 1)

## Lane C — list + filter sheet

### Task C1: Row primitives
- `ghost-meter.tsx`, `status-chip.tsx`, `outreach-badge.tsx` — ports from
  `frontend-next/src/components/kanban/` and `jobs/`. `outreach-badge.tsx`:
  **drop** the web `hidden sm:flex` — always render (mobile is always narrow).
  Use the `ghost-active/stale/ghosted` tokens. `STATUS_META.className` adapted in
  A2.
- `job-row.tsx` — 2-column (title/company left; OutreachBadge→StatusChip→GhostMeter→shortDate right), wrapped in a `react-native-gesture-handler` `Swipeable` that reveals a single **advance-status** action (next status in `JOB_STATUSES` order) calling `useUpdateJob`. Tap row → `router.navigate(\`/jobs/${id}\`)`. Sibling: web `job-row` but as a `Pressable`, not a `div`.
  - `// ponytail: swipe reveals one action (advance status), not the full status picker — add per-status buttons if the single-action feels limiting`

### Task C2: Filter sheet
- `filter-sheet.tsx` — uses the existing `Sheet` (RN Modal, `d-0cc24z`). Fields, all binding to a local `JobFilters` state lifted into `JobsScreen`:
  - `search` → `Input` (with a clear button).
  - `status` → `Select<JobStatus>` with an "All" option (undefined).
  - `ghost` → `SegmentedControl<GhostFilter>` (all/active/stale/ghost — 4 values, icons optional).
  - `sortBy` → `Select<SortField>` (Title/Company/Ghost/Added — 4 of 5, web omits `updatedAt`).
  - `sortOrder` → `SegmentedControl<SortOrder>` (asc/desc).
  - `createdFrom`/`createdTo` → two date `Input`s (native `<input type="date">` is web; on RN use a simple text `Input` with placeholder `YYYY-MM-DD` and a `Select`-based picker is overkill — keep the text input, validate format is the backend's job). Mark `// ponytail: text date input, not a native picker — swap for @expo/ui DateTimePicker if entry friction bites`.
  - Reset button (clears to defaults), Apply is implicit (state is live; closing the sheet applies). Mirror web `use-job-filters.ts` default set.
- `filter-sheet.test.tsx` — assert fields reflect state and reset restores defaults.

### Task C3: Jobs screen
- `jobs-screen.tsx`:
  - Local filter state via `useState<JobFilters>` (defaults from `filters.ts`). **Divergence flagged**: not URL state.
  - `useInfiniteJobs(filters)` → `FlatList` (the precedent: `select.tsx:29`). `onEndReached` → `fetchNextPage`, `ListFooterComponent` = `RouteProgress` when `isFetchingNextPage`. `contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_INSET }}` (clears tab bar + FAB).
  - Grouping: two-bucket partition (`needsAttention` / `inProgress`), render as section headers (`Text` serif) + the flat rows. Second header suppressed when it's the only group (mirror `job-list.tsx`).
  - Empty state: `<EmptyState>` two variants via `isListFiltered(filters)` (Reset button vs "No jobs yet").
  - Skeleton: `Skeleton` rows when `isLoading && data.length === 0`.
  - Header & Action affordances: `AppHeader` renders clean `title` only (no leading action buttons, per `d-0cqv2p`). All screen actions (Filter jobs + Add job) live in the bottom-right floating `SpeedDial` FAB (`d-0cqv2p`), matching web mobile hamburger animation with darkened/blurred backdrop.
  - Realtime: `useEffect` → `connectSocket()` on mount, listen for job events, `queryClient.invalidateQueries({ queryKey: JOBS_KEY })` on `job:created|updated|deleted`. `disconnectSocket()` on unmount. `// ponytail: blunt invalidation on any job event — scope to the changed id if chatter bites`.
- `app/(tabs)/index.tsx` — MODIFY: `<Placeholder .../>` → `<JobsScreen/>`. FAB opens `SpeedDial` actions (Add job opens `EditJobSheet`, Filter jobs opens `FilterSheet`).
- Gate: full mobile gates.

## Lane D — job detail (full-screen route)

### Task D1: Route + screen shell
- `app/jobs/[id].tsx` — thin: `const { id } = useLocalSearchParams(); return <JobDetailScreen id={id}/>;`. Rendered by the root `Stack` (sibling of `(tabs)`), so **tab bar is hidden** — full screen. Set `options={{ headerShown: false }}` and render the screen's own header (back button + job title). Confirm the root `Stack` renders a `jobs` segment without a guard (it's under the `signedIn` gate implicitly via being a child — verify; if not, nest under `(tabs)` is wrong, keep at root and gate manually).
- `job-detail-screen.tsx` — `useJob(id)`. `ScrollView` with sticky header/footer as direct children (web `job-details.tsx:22` warns nested sticky un-pins). Eight sections in the corrected order. `RouteProgress` while loading. `paddingBottom: SCREEN_BOTTOM_INSET`.

### Task D2: Sections (mirror web order)
- `job-detail-header.tsx` (sticky) — title (serif), company·location, status `Select` (the chip — `useUpdateJob`), `sourceUrl` link.
- `job-details.tsx` — notes (`MarkdownProse` if web renders notes as markdown, else `Text`), location, salary range.
- `outreach-section.tsx` — list `JobContact`s. **Tap-to-call/email**: a `parseContact(contact, channel)` helper (regex email → `mailto:`, regex phone → `tel:`; else plain `Text`). `channel: 'EMAIL'` hints mailto. `// ponytail: regex-extract from free-text contact — structured fields would be better, backend change is t-0018-adjacent`. Endpoints: `GET /api/jobs/:jobId/contacts` (port `use-contacts.ts` read hook only — no create/edit/delete in C3).
- `job-snapshot.tsx` — `<MarkdownProse>{job.snapshotMarkdown}</MarkdownProse>` (renders for free per the map).
- `reminders-section.tsx` — read-only list (no reminder CRUD in C3; mark `// ponytail: read-only — CRUD is a later slice`).
- `resume-launcher.tsx` + `cover-letter-launcher.tsx` — read/copy links (§4.7: no editing/generation on mobile). Link to the web route URL or show "open on web" + copy. `// ponytail: degrade to a link — full reader is C7/C8`.
- `timeline-section.tsx` — read-only feed (`GET /api/jobs/:id/timeline` if that endpoint exists — verify; else note as blocker).
- `job-detail-footer.tsx` (sticky) — Delete button → `<ConfirmDialog>` → `useDeleteJob` → on success `router.navigate('/')`.

### Task D3: Realtime on detail
- Reuse the socket effect pattern from C3's jobs-screen: on `job:updated` for this `id`, `queryClient.invalidateQueries({ queryKey: jobKey(id) })`. Extract a `useJobSocket(id?)` hook if both screens need it — otherwise keep two small effects (`// ponytail: two effects over one hook — extract if a third screen needs it`).

---

## Verification before merge

1. `make gates` (full web suite — no web change, must stay green).
2. Mobile gates: typecheck + lint (after deleting `.expo/cache/eslint`) + `npm test` + `npx expo export`.
3. `blink validate`.
4. **Device screenshot** (the C2 wave shipped green gates but nothing was seen on a device until the emulator pass — `x-0cgq5d` log): Jobs list (empty + seeded), filter sheet, a job detail with outreach + snapshot, a status change round-trip. Run in a subagent that eyeballs the images; do NOT Read screenshots into the main thread.
5. Update `progress.md` — one line (narrative goes in `progress.md` mobile wave 3 section, but `progress.md` one-liner per the CLAUDE.md rule).
6. Close `t-0ccxkn` in Blink.

## Deferred (explicitly NOT in C3)

- Add-job + share-target (C5), kanban board (never — §4.2), reminder CRUD, résumé/cover-letter editing/generation (C7/C8), dark mode (`t-0cd9jx`), `AppState` refocus, structured contact fields.
