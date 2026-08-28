---
id: t-0cbm48
title: Partial (substring) matching in global search
status: backlog
created: 2026-08-28T00:00:00Z
updated: 2026-08-28T00:00:00Z
estimate: M
decisions: [d-0c5wyy]
tags: [search, backend, frontend]
---

Two characters should find anything that contains them — **anywhere in the
word, not only at the start**. Raised by the user against the shipped feature
([[t-0c5wyz]]): "it is not about only match from first, it should be a proper
partial match."

## Why it does not work today

`plainto_tsquery` matches **whole lexemes**. `"reac"` becomes the lexeme
`reac`, which is not `react`, so it returns nothing. `"engin"` only appears to
work because English stemming reduces *engineer* → `engin` — a stem collision,
not prefix matching. Live counts on seeded data: `r:0 · re:3 · rea:0 · reac:0 ·
react:9`.

## Complications

1. **FTS structurally cannot do infix.** It can prefix-match
   (`to_tsquery('reac:*')`), which fixes `"reac"` → *react*. It can never match
   `"gine"` → *engineer*, because the index stores lexemes, not character
   positions. Proper partial matching therefore means `ILIKE '%q%'` or trigram —
   a second matching engine running alongside FTS, not a tweak to the query.

2. **It is a third ranking signal, and blending two already broke once.** The
   current two-band rank exists *because* `greatest(ts_rank, similarity)` mixed
   scales differing by ~10× and inverted the ordering (fixed in `5a474ea`). A
   third band needs its own non-overlapping range. Same technique, but this is
   the part that takes care — the matching itself is easy.

3. **Two characters is where noise is worst.** `in` is a substring of engineer,
   marketing, working, point, interview. Over ~100 rows across five tables a
   2-char infix query can match nearly everything, and the per-type cap of 5
   then returns 20 essentially arbitrary rows. Partial search is only worth
   having if the ranking puts the right rows on top.

4. **Body text turns (3) into a collapse.** `snapshot_markdown` is a whole job
   description, so `%in%` matches every job in the account. Substring matching
   must run on the **short identifying fields only** — `jobs.title`,
   `jobs.company`, `generated_resumes.title`, `cover_letters.title`,
   `personas.name`, `question_answers.question` — with FTS continuing to cover
   the long bodies, which is what it is good at.

5. **Substring hits get no highlight.** `ts_headline` marks lexemes the tsquery
   matched, so a substring-only hit emits no `\x02` sentinel — and the rule
   added in `8174954` returns a `null` snippet when no sentinel is present.
   Those rows would show a title and nothing else. Needs client-side
   highlighting of the raw substring, a small addition to the existing parity
   splitter in `search-result-row.tsx`.

6. **Known performance ceiling, not a blocker.** `ILIKE '%q%'` cannot use a
   B-tree index. At ~100 rows per user that is the same unindexed scan
   [[d-0c5wyy]] already accepted. The upgrade path is a GIN `gin_trgm_ops`
   index, which *does* accelerate `%…%` — so the ceiling has a known fix and
   this does not close it.

## Design

Four bands, non-overlapping, highest first — extending the two-band `case`
already in `search.repository.ts`:

| Band | Match | Rank |
|---|---|---|
| 1 | FTS (exact / stemmed), incl. bodies | `2.0 + ts_rank` |
| 2 | Substring at a word start (`"engin"` in *Engineering*) | `1.0 + coverage` |
| 3 | Substring mid-word (`"gine"` in *Engineer*) | `0.5 + coverage` |
| 4 | Trigram fuzzy (typos) | `similarity` scaled into `0..0.5` |

`coverage` = matched length ÷ field length, so `"eng"` scores better against
*Engineer* than against a 90-character title. Bands 2 and 3 run on the short
fields listed in complication 4 only. Band 4 keeps the existing `> 0.3` floor.

## Open question

**At exactly two characters: full infix, or prefix-only with infix from three?**
Two-char infix is where the noise of complication 3 is worst. The user asked
for two, so the default is full infix at two with the ranking carrying the
load — but this is worth one look at real results before committing to it.

## Depends on

[[t-0c5wyz]], shipped. Touches `search.repository.ts` (bands + the substring
predicates), `search-result-row.tsx` (highlighting band 2/3 hits), and the
repository tests.
