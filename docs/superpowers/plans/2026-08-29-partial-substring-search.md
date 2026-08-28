# Partial (Substring) Matching in Global Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This plan is self-contained. Do not ask the user anything.** Every open
> question in `t-0cbm48` has been answered below, on measured evidence. Execute
> it top to bottom.

**Goal:** two characters find anything that contains them. `reac` finds *React*,
`gine` finds *Engineer*, `in` finds the jobs whose titles contain it. Raised by
the user against the shipped feature: *"it is not about only match from first, it
should be a proper partial match."*

**Architecture:** three non-overlapping rank bands in the one `UNION ALL` that
already exists. Prefix matching is added **inside** the existing FTS band as a
second tsquery OR'd into the first; infix matching is a new middle band using
`ILIKE` over the short identifying columns each source already declares. No
migration, no new dependency, no frontend change, no new file.

**Tech Stack:** Express 5 + Drizzle + PostgreSQL 16, Vitest against real Postgres.

**Tracker:** `t-0cbm48` · decision `d-0c5wyy` (Postgres FTS, not a search engine)

**Branch:** `search-partial-match`, cut from `develop`.

---

## Why the design in `t-0cbm48` changed

That task file specified four bands (FTS · word-start substring · mid-word
substring · trigram) plus a `coverage` ranking function plus client-side
highlighting in `search-result-row.tsx`. Measured against the live seeded DB on
2026-08-28, two of those premises were wrong:

1. **Substring-on-short-fields does not fix the motivating example.** `react`
   appears in **zero** title/company/name/question columns and in 16
   `jobs.snapshot_markdown` bodies. Bands 2–3 run on short fields only (correctly
   — `%in%` over body text matches everything), so `reac` would still have found
   nothing. Prefix FTS (`reac:*`) is what fixes it, and it works over bodies
   because that is exactly what FTS is for.
2. **Prefix hits highlight for free.** `ts_headline` marks whatever the tsquery
   matched, so feeding it the prefix query highlights `React` in the snippet with
   no client change. Complication 5 in the task file (substring hits render
   title-only) then applies **only** to infix-on-short-field hits — where the
   match is in the title, which is already on screen. No frontend work.

So: prefix folds into the existing FTS band, infix becomes one new band, and the
word-start/mid-word split and `coverage` function are dropped as unmeasured
precision. Ceiling recorded in a `ponytail:` comment, upgrade path named.

---

## Evidence (measured 2026-08-28 against the running dev DB — do not re-derive)

Jobs table, per query term:

| term | plain FTS | **combined (plain \|\| prefix)** | ILIKE on title/company | trigram > 0.3 |
|---|---|---|---|---|
| `r` | 0 | 0 (single char, client-gated anyway) | 16 | 0 |
| `re` | 0 | **16** | 4 | 0 |
| `rea` | 0 | **16** | 0 | 0 |
| `reac` | 0 | **16** | 0 | 0 |
| `react` | 16 | 16 | 0 | 0 |
| `eng` | 0 | **16** | 16 | 0 |
| `gine` | 0 | 0 | **16** | 0 |
| `engin` | 16 | 16 | 16 | 0 |
| `in` | 0 | 0 (stopword) | **16** | 0 |

Read it as: the prefix query carries `re`/`rea`/`reac`/`eng`; the substring band
carries `gine` and `in` (a stopword, so FTS returns an empty tsquery — no error,
no rows). Neither alone is sufficient; both together cover every column of that
table. `engin` matched before only because English stemming reduces *engineer* →
`engin` — a stem collision, not prefix matching.

Headline check, `reac` against a body containing React (sentinels shown as
brackets): `- Strong TypeScript / [React] / Node.js`.

Ranking check with the new middle band (`gine`, top 3): `Software Engineer,
Growth` 1.111 · `Product Engineer` 1.100 · `Product Engineer` 1.100.

---

## File Structure

| File | Change |
|---|---|
| `backend-express/src/modules/search/search.repository.ts` | `tsQuery()` gains the prefix arm; new `substringMatch()`; `branch()` grows a third band |
| `backend-express/src/modules/search/search.repository.test.ts` | Four new cases (below) |

**No other file is touched.** Not the migration folder (`pg_trgm` is already
installed by `0014`), not the schema, service, controller or router, not
`search-result-row.tsx`, not `use-search.ts` (already gated at 2 characters,
which is the floor this plan targets).

---

## Task 1: prefix matching inside the FTS band

`plainto_tsquery` matches whole lexemes, so `reac` is the lexeme `reac`, which is
not `react`. OR in a prefix query built from the same words. Both arms feed one
`tsQuery()`, which `branch()` and the outer `ts_headline` already call — so
prefix hits get ranked and highlighted with no other edit.

**Files:** Modify `backend-express/src/modules/search/search.repository.ts`

- [ ] **Step 1: Write the failing tests**

In `search.repository.test.ts`, add to the existing top-level `describe`:

```ts
it('matches a prefix of a word in a title', async () => {
  const results = await searchRepository.search(userId, TITLE_TAG.slice(0, 6))
  expect(results.some((r) => r.id === jobId)).toBe(true)
})

it('matches a prefix of a word in a body, and highlights it', async () => {
  const results = await searchRepository.search(userId, BODY_TAG.slice(0, 6))
  const hit = results.find((r) => r.id === jobId)
  expect(hit).toBeDefined()
  expect(hit?.snippet).toContain('\u0002') // START_SEL — the highlight sentinel
})
```

Run `npm run test -- search.repository` in `backend-express/`. Both must FAIL —
zero results — before Step 2. If they pass, the prefix arm is already in and this
task is a no-op; stop and report that.

- [ ] **Step 2: Add the prefix arm**

Replace `tsQuery` in `search.repository.ts`:

```ts
// plainto_tsquery matches whole lexemes, so `reac` never finds React. OR in a
// prefix query over the same words: `reac:*` does — in bodies too, which is
// where the substring band below deliberately cannot look. The words are
// rebuilt from the raw input rather than interpolated, because to_tsquery
// parses its argument as tsquery syntax and a stray `&` or `!` is a 500.
// A term of only punctuation yields no words; fall back to plainto alone
// rather than emitting to_tsquery(''), which is a syntax error.
function tsQuery(q: string): SQL {
  const words = q.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)
  if (words.length === 0) return sql`plainto_tsquery('english', ${q})`
  const prefix = words.map((w) => `${w}:*`).join(' & ')
  return sql`(plainto_tsquery('english', ${q}) || to_tsquery('english', ${prefix}))`
}
```

Notes for the implementer:
- `||` on two tsqueries is OR, and an empty tsquery on either side is absorbed —
  which is why a stopword term (`in`) yields an empty combined query that matches
  nothing instead of raising.
- `${prefix}` is a bound parameter like every other interpolation in this file.
  Confirm the generated SQL still shows `$n`, not a literal.
- Both arms stay `'english'`, so stemming is unchanged: `engineering:*` stems to
  `engin:*` before the prefix is applied.

- [ ] **Step 3: Run the suite**

`npm run test` in `backend-express/`. Expect the two new tests green.

**If an existing search test flips, read it before changing it.** The likely
cause is a fixture that previously matched only by trigram now matching by
prefix. The two-band ranking fixture is designed to survive this — `RANK_NEAR`
differs from `RANK_TAG` at character 7, so `RANK_TAG:*` cannot match it — but
verify rather than assume. Do not weaken an assertion to make it pass; if a test
genuinely conflicts with prefix matching, stop and report it.

**Commit:** `feat(search): find prefixes, so "reac" finds React`

---

## Task 2: the substring band

FTS cannot match an infix at all — it indexes lexemes, not character positions,
so `gine` → *Engineer* is structurally out of reach. That needs `ILIKE '%q%'`,
and it must run on the **short identifying columns only**: `%in%` against
`snapshot_markdown` matches every job in the account.

That column list already exists. `Source.trgm` is `[jobs.title, jobs.company]`,
`[generatedResumes.title]`, `[coverLetters.title]`, `[personas.name]`,
`[questionAnswers.question]` — precisely the fields the task file asked for.
**Do not add a sixth field to `Source`.**

**Files:** Modify `backend-express/src/modules/search/search.repository.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('matches a substring in the middle of a title', async () => {
  const results = await searchRepository.search(userId, TITLE_TAG.slice(4, 9))
  expect(results.some((r) => r.id === jobId)).toBe(true)
})

it('ranks an FTS hit above a substring-only hit', async () => {
  // BODY_TAG is an FTS hit on one job; nothing else can reach band 1 for it,
  // so an FTS hit must sort first. The same guarantee the two-band test makes
  // for trigram, now for the middle band.
  const results = await searchRepository.search(userId, BODY_TAG)
  expect(results.findIndex((r) => r.id === jobId)).toBe(0)
})
```

Run them. The first must FAIL before Step 2.

- [ ] **Step 2: Add `substringMatch` and the band**

Add beside `trgmSimilarity`:

```ts
// Infix, which FTS structurally cannot do (`gine` in Engineer). Runs on
// source.trgm — already exactly the short identifying columns — because
// '%in%' against a job description matches every job in the account.
// LIKE metacharacters are escaped: an unescaped '%' typed by the user would
// match every row.
function substringMatch(cols: AnyPgColumn[], q: string): SQL {
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`
  const tests = cols.map((col) => sql`${col} ilike ${like}`)
  return sql`(${sql.join(tests, sql` or `)})`
}
```

In `branch()`, add `const substr = substringMatch(source.trgm, q)` beside the
existing locals, then:

```sql
              case when ${vector} @@ ${query} then 2.0 + ts_rank(${vector}, ${query})
                   -- ponytail: similarity() as the within-band tiebreak is ~0 for
                   -- two-character terms, so their order inside the substring band
                   -- is effectively arbitrary. Upgrade to a coverage score
                   -- (matched length / field length) if that shows in real use.
                   when ${substr} then 1.0 + ${trgmSim}
                   else ${trgmSim}
              end as rank
         from ${source.table}
        where ${source.userId} = ${userId}
          and (${vector} @@ ${query} or ${substr} or ${trgmSim} > ${TRIGRAM_FLOOR})
```

The bands, all non-overlapping because `ts_rank` and `similarity` are both 0..1:

| Band | Match | Rank |
|---|---|---|
| 1 | FTS — exact, stemmed or prefix, incl. bodies | `2.0 + ts_rank` |
| 2 | Substring in a short identifying column | `1.0 + similarity` |
| 3 | Trigram fuzzy (typos) | `similarity`, floored at 0.3 |

The FTS base moves `1.0` → `2.0`. The existing two-band test asserts a
*relative* order, so it keeps passing; confirm rather than assume.

- [ ] **Step 3: Run the suite**

`npm run test` in `backend-express/`. All four new tests green, nothing else red.

**Commit:** `feat(search): match substrings in titles, not only whole lexemes`

---

## Task 3: verify and land

- [ ] **Step 1: Gates**

`make gates` from the repo root — typecheck + lint + both suites + production web
build. Backend test count should be 700 (696 + 4).

- [ ] **Step 2: Ground-truth SQL check**

Stack up (`make up`). This is the query that produced the evidence table:

```bash
docker compose exec -T postgres psql -U "$(grep -E '^DB_USER=' .env | cut -d= -f2)" \
  -d "$(grep -E '^DB_NAME=' .env | cut -d= -f2)" -q -c "
with q(q,p) as (values ('reac','reac:*'),('gine','gine:*'),('in','in:*'))
select q.q,
  count(*) filter (where to_tsvector('english', concat_ws(' ',j.title,j.company,j.snapshot_markdown))
                         @@ (plainto_tsquery('english',q.q) || to_tsquery('english',q.p))) as fts_band,
  count(*) filter (where j.title ilike '%'||q.q||'%' or j.company ilike '%'||q.q||'%') as substring_band
from q cross join jobs j group by q.q order by q.q;"
```

Expect `reac` → 16 / 0, `gine` → 0 / 16, `in` → 0 / 16 on the seeded demo data.

- [ ] **Step 3: Browser smoke — delegate to a subagent, do not read screenshots in the main thread**

Log in as `demo@jobvault.app` / `demo1234` at http://localhost:8080, open the
palette with ⌘K, check four terms. The subagent reports pass/fail in text:

| Type | Expect |
|---|---|
| `reac` | Job results, snippet shows **React** highlighted |
| `gine` | Jobs whose titles contain *Engineer*, title-only rows (no snippet) — correct, not a bug |
| `in` | Results appear at all (before this change: none) |
| `react` | Unchanged from today — no regression on the exact-match path |

- [ ] **Step 4: Record and land**

1. Append the shipped notes to the **Global Search** section of `progress.md`
   (the existing `## Global Search (on slice-global-search, 2026-08-28)` block)
   under a `### Partial matching (2026-08-29)` sub-heading. One line per point;
   detail lives here, not in `CLAUDE.md`.
2. `CLAUDE.md`: fold partial search into the Global Search bullet as a
   follow-up, and drop it from the **Next:** line, which then leads with Google
   OAuth (`t-0020`).
3. `.blink/tasks/t-0cbm48-partial-substring-search.md`: `status: done`, bump
   `updated`. Run `blink validate` if the CLI is available (it was not on
   2026-08-29 — `command not found`; hand-check against `.blink/SCHEMA.md` if it
   is still missing).
4. Merge `search-partial-match` into `develop` with a summary commit, matching
   the `Merge slice-global-search: …` style.

---

## What this plan deliberately does not do

- **No word-start / mid-word band split, no `coverage` function.** Ordering
  inside the substring band is the `similarity()` already computed in the query.
  Add coverage when two-character results are observably arbitrary — the
  `ponytail:` comment names the upgrade.
- **No client-side substring highlighting.** Prefix hits highlight via
  `ts_headline`; infix hits matched in the title, which the row already shows.
- **No GIN `gin_trgm_ops` index.** `ILIKE '%q%'` cannot use a B-tree, so this is
  an unindexed scan — the same one `d-0c5wyy` already accepted at ~100 rows per
  user. `pg_trgm` is installed, so the index is available the day it measures.
- **No mode switch at two vs three characters.** The task file left this open;
  the answer is full infix from two, because that is what was asked for and the
  banding carries the ordering. Revisit only on real results.
- **No new entity types.** `job_contacts` being unsearchable is a separate gap,
  untracked, out of scope here.
