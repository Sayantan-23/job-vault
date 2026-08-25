# Saved Answers Library — Design

**Date:** 2026-08-25
**Status:** Approved (brainstormed + approved in-session)
**Follow-on slices:** `t-0c5uc8` (extension surfacing), `t-0c5wyz` (global search)
**Decisions:** `d-0c5wyy` (Postgres FTS, for the search slice)

## Problem

Application forms ask the same open-ended questions over and over — "why are you
leaving your current role?", "describe your responsibilities", "what are you
looking for?". JobVault generates résumés and cover letters but has nowhere to
keep these, so the user re-composes each one from scratch, slightly differently
and usually slightly worse, on every form.

This is the same category of work JobVault already owns end to end: reusable
written content. It is a third document type in an existing product, not the
first step toward a form-filling product.

## What this is not

**Form facts are deliberately out of scope** — notice period, current/expected
CTC, years of experience, work authorization, relocation, availability. They
were designed, then cut. The rule that decides it:

> Store it when composing costs more than retrieving.

| | Compose | Retrieve | Verdict |
|---|---|---|---|
| Notice period | ~2s, memorized | ~15s (open app, find, copy, switch back) | storage loses |
| "Why are you leaving your current role?" | 3–5 min, re-composed each time | ~15s | storage wins ~15× |

Short facts fail the test: the user already knows them, so storage swaps typing
for a slower copy-paste. Browser autofill covers name/email/phone/address
natively. And facts only pay off in a product that *submits forms* — a survey of
the category confirms the correlation exactly: Simplify and Huntr store facts and
autofill forms; Teal stores none and has no autofill. JobVault does not submit
forms.

Mobile cuts the same way: thumb-typing a 1500-character essay is the worst
version of the task, so app-switching to copy one beats it easily — while typing
"30 days" on a phone is trivial and leaving the app to fetch it is not.

## Competitive position

No job tracker has a user-curated, server-stored answer library:

| Tool | Reusable answers | Where |
|---|---|---|
| Simplify | Yes — "Unique Questions" | Extension popup only, **saved in that browser alone**; reuses on *exact* question-text match; AI answers paywalled |
| Huntr | No | Autofills from a saved profile |
| Teal | No | No autofill at all |

Server-stored, editable in a real editor, available on every device, AI-drafted
without a paywall beats the closest competitor on every axis. Exact-match reuse
is the specific weakness to beat later (`t-0c5uc8`) — ATS wording varies too much
for it.

## Decisions (with reasoning)

1. **Two fixed length variants per question — short and long — measured in
   characters, not words.** ATS fields enforce character limits (`max 1500
   characters`); none enforce word counts, so a word count is a number the user
   has to translate. Two columns on one row beat a parent/child variant model:
   no join, no variant UI, and "one short, one longer" is the whole requirement.
2. **No `job_id`.** A job-pinned answer pollutes the reusable list, which is the
   entire product. Job context is a *generation-time input*, not a stored field.
   Job-specific questions ("why do you want to work at Acme?") need company
   research to answer well and are tracked separately as `t-0c5tmx`. Adding a
   nullable `job_id` later is a one-column migration with no data loss.
3. **No tags or categories.** At 20–40 answers, search beats taxonomy, and any
   category list invented now would be wrong. Loopio — who run answer libraries
   at thousands-of-entries scale — report that shallow-but-tagged beats deep
   nesting and that *maintenance*, not structure, is the failure mode.
4. **`last_used_at`, stamped on copy.** It is the sort key that makes retrieval
   feel fast (recently used first), it is Loopio's "evolve loop" for free, and
   `t-0c5uc8` needs exactly this signal to rank answers on a form page.
5. **One AI call returns both variants.** A single structured `{short, long}`
   response costs one Gemini round-trip and one rate-limit slot instead of two,
   and the two variants stay consistent with each other because they came from
   one generation.
6. **Generated drafts are never persisted automatically.** The generate endpoint
   returns a candidate; the user edits and saves. Same stage-then-commit flow as
   cover-letter refine.
7. **Flat nav entry, no vault hub.** Two of three competing trackers give
   documents no top-level nav; Huntr has a unified Documents hub but buries it
   under Account Settings, and its real access path is job-linked documents —
   evidence that nobody browses a vault. A hub of three tabs is three lists
   behind an extra click. Grouping the sidebar is deferred entirely, by the
   owner's call.
8. **Copy happens from the list row, not from an editor.** One click, no
   navigation. This is the feature; everything else is maintenance of it.

## Data model — migration `0013`

New table `question_answers` in `backend-express/src/db/schema/question-answers.ts`,
re-exported from `index.ts`:

```
question_answers
  id            uuid PK defaultRandom
  created_at    timestamptz NOT NULL default now
  updated_at    timestamptz NOT NULL default now
  user_id       uuid NOT NULL FK → users.id ON DELETE CASCADE
  question      varchar(500) NOT NULL
  answer_short  text NULL          -- aims ≤ 500 chars (tight ATS fields)
  answer_long   text NULL          -- aims ≤ 2000 chars (essay fields)
  last_used_at  timestamptz NULL   -- stamped on copy; the list's sort key

indexes: idx_question_answers_user_id
```

Both variant columns are nullable — an answer may have only one. "At least one
non-empty" is enforced in Zod rather than a DB `CHECK`: it is a request-shape
rule at the trust boundary, and unlike `cover_letters`' job XOR it guards no
invariant that other code depends on.

No `tsvector` column and no GIN index. Per `d-0c5wyy`, the search slice computes
full-text at query time over a `user_id`-filtered set of roughly a hundred rows.

## API

```
GET    /api/answers            list, ordered last_used_at DESC NULLS LAST, updated_at DESC
POST   /api/answers            { question, answerShort?, answerLong? }
PATCH  /api/answers/:id        partial; rejects an empty patch
DELETE /api/answers/:id
POST   /api/answers/:id/used   stamps last_used_at; returns { data: { id, lastUsedAt } }
POST   /api/answers/generate   { question, personaId, jobId?, instructions? } → { short, long }
```

- `authMiddleware` on every route; every query `userId`-scoped; `{ data }` success
  envelope; `validate(schema)` on bodies; `AppError` codes for not-found and
  ownership misses.
- `GET /api/answers` returns **full bodies, unpaginated**. Copying happens from
  the list row, so the text has to already be on the client; and at 20–40 rows
  per user there is nothing to paginate.
- No `GET /api/answers/:id`. The `?answer=<id>` slideover reads from the list
  query that the page has already fetched, so a single-item endpoint would serve
  no caller.
- `POST /:id/used` exists rather than folding into `PATCH` because it is not a
  user edit: it must not bump `updated_at` or collide with an in-flight edit.

**Zod** (`answers.schema.ts`):

- `question` — trimmed, 1–500 chars
- `answerShort` — trimmed, max 1000 chars (the ≤500 target is UI guidance, not a
  hard limit; the cap only stops a pasted novel)
- `answerLong` — trimmed, max 5000 chars
- `CreateAnswerSchema` `.superRefine` — at least one variant non-empty
- `UpdateAnswerSchema` — partial, same rules, rejects `{}`
- `GenerateAnswerSchema` — `question` required, `personaId` uuid required,
  `jobId` uuid optional, `instructions` optional max 500

## Backend module — `src/modules/answers/`

Standard layering `router → controller → service → repository → schema` with
co-located `.test.ts`. Controller never imports Drizzle; service never touches
`req`/`res`; repository returns plain objects.

**Generation** (`answers.service.ts`):

1. Load the persona, confirm ownership. Load the job if `jobId` was given,
   confirm ownership.
2. `assertWithinRateLimit(userId)` — **after** ownership is confirmed, so a bad
   id cannot spend the user's hourly budget. Matches the comment already at
   `cover-letters.service.ts:39` and `resumes.service.ts:29`.
3. `geminiService.generateStructured` against a `{ short, long }` JSON schema.
4. `aiUsageRepository.recordUsageEvent(userId, 'answer_generate')` on success.
   `countRecentGenerations` already sums `ai_usage_events` alongside résumés,
   cover letters and résumé parses, so this lands in the shared hourly limit with
   no change to the limiter.
5. Return the candidate. **Nothing is written to `question_answers`.**

**Prompt** (`answer.prompt.ts`), mirroring `buildCoverLetterPrompt`: takes the
persona's `ProfileContent`, the question, an optional job and optional
instructions. Instructs plain prose — no markdown, since the destination is a
plain `<textarea>` in someone else's form. Character budgets are stated in the
prompt: short ≤ 500 characters, long 1200–2000.

## Frontend

**Route:** `src/app/app/answers/page.tsx` + `loading.tsx`, plus a matching entry
in `route-skeletons.tsx`. Nav: one item in `NAV`
(`components/layout/app/sidebar-nav.tsx:11`) — the mobile speed-dial renders from
the same array, so it needs no change.

**Hooks:** `src/hooks/use-answers.ts` — `useAnswers`, `useCreateAnswer`,
`useUpdateAnswer`, `useDeleteAnswer`, `useMarkAnswerUsed`, `useGenerateAnswer`.

**Components** (`src/components/answers/`). Every styled element is its own
component — no inline styled markup:

- `AnswerList` — the shared `DocumentList` from `components/documents/`, same as
  cover letters and the résumé library.
- `AnswerListRow` — question as the row title; `AnswerCopyChip` per present
  variant showing its character count; relative last-used on the right.
- `AnswerCopyChip` — `S` / `L` chip that copies and fires `useMarkAnswerUsed`.
  Reuses `components/documents/copy-button.tsx` behaviour.
- `AnswerDrawer` — `?answer=<id>` slideover, same URL-driven pattern as jobs'
  `?job=`; `?new` opens it empty. An answer is short, so it does not earn a
  dedicated route the way a cover letter does.
- `AnswerEditor` — question field, two textareas with live character counts,
  save, and confirm-gated delete via the existing `useConfirm`.
- `GenerateAnswerControls` — persona picker, optional job picker, optional
  instructions, Generate.
- `AiDraftNote` — the ethics note, below.

**Filter:** reuse `components/jobs/search-input.tsx` (already takes a
`placeholder` prop) for client-side filtering of the loaded list.

**Copy does not re-sort the list.** `useMarkAnswerUsed` is fire-and-forget and
deliberately does **not** invalidate the list query — invalidating would reorder
rows under the user's pointer mid-click. The new order appears on the next load.

**Reused shared components:** `NoPersonasHint` when the user has no personas,
`MutationErrorAlert` for failures including `RATE_LIMITED`, `ConfirmDialog` via
`useConfirm` for delete. Generation is hidden when `GET /api/ai/status` reports
AI disabled.

**Empty state:** editorial serif, matching the app shell.

## The ethics note

Placed at the two moments of choice, never as a page banner — a page-level
banner earns banner-blindness within a week.

**Always visible, beneath the Generate button:**

> Drafts are a starting point. The answer that gets you hired is the one that
> sounds like you.

**On a generated draft, before it is saved:**

> **Make it yours before you save it.**
>
> A draft can't know why you actually left, what you actually shipped, or how
> you'd say it out loud — and you will say it out loud, in the interview. Cut
> what isn't true, add what only you know, keep your own voice.

Written to persuade rather than to disclaim: it names a consequence the user
cares about (you will be asked about this) instead of asserting a duty, avoids
moral vocabulary entirely, and points at what a model structurally cannot supply
— the user's own reasons and specifics — rather than claiming AI output is bad.
It matches what Loopio found running answer libraries at scale: *repurpose, don't
reuse*; a stored answer is a head start that frees you to tailor.

**No dismiss state.** Nothing is persisted and there is nothing to remember: the
one-liner is quiet enough to live there permanently, and the longer note only
exists while a draft does.

## Testing

**Backend** (Vitest, real Postgres for repository tests): schema validation incl.
the at-least-one-variant refinement and the empty-patch rejection; repository
ownership scoping and the `last_used_at` ordering with `NULLS LAST`; service
generation ordering — ownership before rate limit, usage event only on success,
nothing persisted; controller envelopes and error codes.

**Frontend** (Vitest + RTL): list renders both copy chips with character counts;
copying calls the used-mutation and does **not** invalidate the list; the drawer
opens and closes from `?answer=`; the editor rejects saving with both variants
empty; the ethics note renders in both positions; `NoPersonasHint` shows with no
personas and generation is absent when AI is disabled.

**Manual:** browser pass at 1440 / 1024 / 390 per the repository's UI rule.

## Out of scope

- Form facts — cut above, with reasoning.
- Job-pinned answers and company-researched "why do you want to work at X" —
  `t-0c5tmx`.
- Extension surfacing on application pages — `t-0c5uc8`, the slice where most of
  this feature's value is realised. Its known ceiling: desktop browsers only, so
  a job-board mobile app falls back to the responsive web app and system copy.
- Global search across all document types — `t-0c5wyz`, which also builds
  `/app/resumes/[id]` (absorbing `t-0021`) and `/app/personas?persona=`.
- Sidebar grouping and a unified vault surface — deferred by the owner.
