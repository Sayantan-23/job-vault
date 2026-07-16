# Referral Outreach Tracking (Slice 9) — Design

**Date:** 2026-07-16
**Status:** Approved (brainstormed + approved in-session)

## Problem

Emailing or messaging someone at a company to ask for a referral is a core part of applying, but JobVault only tracks the application itself. Users need to record, per job: who they reached out to, whether that person replied, and the outcome (referred / declined / ghosted) — including reaching out to an alternative person when the first one goes silent. Later, referral email/message generation will sit alongside résumé and cover-letter generation and will target these contact records.

## Decisions (with reasoning)

1. **Separate table, not jsonb on `jobs`.** Contacts are entities with independent lifecycles (each has its own status machine, individually mutated), not a document edited as a whole (`personas.data` is the jsonb case). A table gives explicit per-contact mutation semantics (clean AUTO timeline events without array diffing), a trivial future follow-up sweep query, and FK targets for future email generation. Per-user ownership is irrelevant to this choice — reminders and timeline events are also per-user tables.
2. **One free-text `contact` field** (name / email / LinkedIn URL / any combo). The app never sends emails — generation later only drafts text the user copies out, so no machine ever needs a parsed address. `channel` stays as an optional enum; `role` dropped.
3. **Outcome-aware status enum** `NO_RESPONSE → HEARD_BACK → REFERRED | DECLINED` (not enforced as a state machine — the user edits status freely). Knowing who actually referred vs declined feeds future email generation, and "ghosted by referrer" is on-brand.
4. **No `heardBackAt` or other event timestamps on the row.** AUTO timeline events record *when* each status change happened; the table holds only current state.
5. **Outreach never touches the job's `ghostDays` / `lastActivityAt`.** The ghost meter tracks employer signal; a referrer replying is not the employer responding. Contact ghosting is its own `NO_RESPONSE` state.

## Data model — migration `0012`

New table `job_contacts` in `backend-express/src/db/schema/job-contacts.ts`, re-exported from `index.ts`:

```
CONTACT_CHANNELS  = ['EMAIL', 'LINKEDIN', 'OTHER']                      → pgEnum contact_channel
CONTACT_STATUSES  = ['NO_RESPONSE', 'HEARD_BACK', 'REFERRED', 'DECLINED'] → pgEnum contact_status

job_contacts
  id             uuid PK defaultRandom
  created_at     timestamptz NOT NULL default now
  updated_at     timestamptz NOT NULL default now
  user_id        uuid NOT NULL FK → users.id  ON DELETE CASCADE
  job_id         uuid NOT NULL FK → jobs.id   ON DELETE CASCADE
  contact        varchar(500) NOT NULL     -- free text: name / email / LinkedIn / combo
  channel        contact_channel NULL      -- optional
  status         contact_status NOT NULL default 'NO_RESPONSE'
  reached_out_at timestamptz NOT NULL default now  -- editable (retroactive logging)
  notes          text NULL

indexes: idx_job_contacts_user_id, idx_job_contacts_job_id
```

Const arrays are the single source of truth for both the Postgres enums and the Zod schemas (same pattern as `JOB_STATUSES`).

## API — mirrors reminders' dual-router pattern

```
GET    /api/jobs/:jobId/contacts     list for a job, ordered reached_out_at DESC
POST   /api/jobs/:jobId/contacts     { contact, channel?, reachedOutAt?, notes? }
PATCH  /api/contacts/:id             partial: { contact?, channel?, status?, reachedOutAt?, notes? }
DELETE /api/contacts/:id
```

- Mounted in `shared/api-router.ts` as `contactsJobRouter` at `/jobs/:jobId/contacts` and `contactsRouter` at `/contacts` (deep paths fall through `jobsRouter`'s single-segment `/:id`, same as reminders).
- `authMiddleware` on all routes; every query userId-scoped; `{ data }` success envelope; `validate(schema)` on bodies; `AppError` codes for not-found/ownership misses.
- Zod: `CreateContactSchema` (`contact` 1–500 chars trimmed, `channel` optional enum, `reachedOutAt` optional ISO datetime, `notes` optional), `UpdateContactSchema` = partial + `status` enum; reject empty patch.

## Backend module — `src/modules/contacts/`

Standard layering: `router → controller → service → repository → schema` with co-located `.test.ts`. Controller never imports Drizzle; service never touches `req`/`res`; repository returns plain objects.

**AUTO timeline events** (via existing `timelineService.addAutoEntry`):

| Trigger                    | Title                              |
| -------------------------- | ---------------------------------- |
| create                     | `Reached out to {contact}` (channel in description when set) |
| status → `HEARD_BACK`      | `Heard back from {contact}`        |
| status → `REFERRED`        | `{contact} referred you`           |
| status → `DECLINED`        | `{contact} declined to refer`      |
| delete                     | *(no event — noise)*               |

Events fire only when `status` actually changes to that value (compare against the previous row inside the service).

## Badge counts

`GET /api/jobs` (jobs repository list query) and `GET /api/dashboard/kanban` each gain two aggregate fields per job via a LEFT JOIN / subquery count:

- `outreachCount` — all contacts for the job
- `outreachReplies` — contacts with `status != 'NO_RESPONSE'` (heard-back / referred / declined all imply a reply)

Frontend types `Job` and `KanbanCard` extended with both fields. No new endpoint.

## Frontend

Naming: API/table say **contacts** (entity); UI says **Outreach** (feature). Deliberate.

- **`components/jobs/outreach/outreach-section.tsx`** — new JobDrawer section between Reminders and the Résumé launcher, `border-t border-border pt-5` wrapper like siblings. Contact rows: contact text (truncate), small status chip, mono relative date, overflow menu (mark heard back / referred / declined, edit, delete). Delete gated by the existing `useConfirm` ConfirmDialog (entity-delete convention). Inline add form: text input (placeholder communicates "name, email, or LinkedIn") + optional channel select + Add button. Editing opens the same inline form pre-filled. Empty state: one muted line.
- **`components/jobs/outreach/outreach-status-chip.tsx`** — own chip component (statuses ≠ job statuses); muted tones per minimalist-ui: `NO_RESPONSE` stone, `HEARD_BACK` indigo accent, `REFERRED` positive-muted, `DECLINED` stone-dim.
- **`components/jobs/outreach-badge.tsx`** — shared by `JobRow` (job-list) and `KanbanCard`; renders `null` when `outreachCount` is 0/undefined. List variant: `✉ 3 · 1 replied` slotted before `StatusChip`. Card variant: lucide `Mail` icon + mono count beside the GhostMeter, accent tint when `outreachReplies ≥ 1`, `title` tooltip with the detail text. Every styled element is its own component — no inline styled markup.
- **`hooks/use-contacts.ts`** — TanStack Query: list by jobId + create/update/delete mutations; invalidates the job-contacts key **and** the jobs/kanban list keys so badges stay fresh. Mirrors `useReminders`.

## Testing

- **Backend:** schema tests (Zod), repository tests (real Postgres — CRUD, userId scoping, ordering), service tests (timeline emission on create + each status transition, no event on unchanged status/delete, ownership errors), router tests (auth, validation, envelopes). Jobs + dashboard repository tests cover the two count fields (zero, some, replies subset).
- **Frontend:** RTL tests for OutreachSection (list/add/edit/status change/delete-confirm), OutreachStatusChip, OutreachBadge (null at zero, reply tint, both variants); updated `job-list` and `kanban-card` tests for the badge slot.
- **Gates:** typecheck + lint + tests in both apps + Next production build; live smoke against the Docker stack; browser pass via playwright-cli at 1440/390.

## Deferred (recorded in `docs/deferred-tasks.md`)

- Follow-up nudge sweep ("no reply in 7 days" → notification) — cron ghost-sweep pattern exists; table shape (`status`, `reached_out_at`) is ready.
- Referral email/message generation (will FK a `contact_id`, like `cover_letters.job_id`).
- "Referrer ghosted you" filter in the jobs toolbar.
