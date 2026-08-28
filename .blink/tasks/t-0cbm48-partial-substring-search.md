---
id: t-0cbm48
title: Partial (substring) matching in global search
status: planned
created: 2026-08-28T00:00:00Z
updated: 2026-08-28T18:59:45Z
estimate: S
decisions: [d-0c5wyy]
tags: [search, backend, frontend]
---

Two characters should find anything that contains them — **anywhere in the
word, not only at the start**. Raised by the user against the shipped feature
([[t-0c5wyz]]): "it is not about only match from first, it should be a proper
partial match."

**Planned 2026-08-29. The executable plan is
`docs/superpowers/plans/2026-08-29-partial-substring-search.md`** — three
tasks, self-contained, every open question below already answered. Execute that;
this file is the why.

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
   Those rows show a title and nothing else.

6. **Known performance ceiling, not a blocker.** `ILIKE '%q%'` cannot use a
   B-tree index. At ~100 rows per user that is the same unindexed scan
   [[d-0c5wyy]] already accepted. The upgrade path is a GIN `gin_trgm_ops`
   index, which *does* accelerate `%…%` — so the ceiling has a known fix and
   this does not close it.

## Design (revised 2026-08-29 on measured evidence — supersedes the four-band version)

Two changes to `search.repository.ts`, ~15 lines, no migration, no new
dependency, **no frontend change**:

1. **Prefix folds into the existing FTS band.** `tsQuery()` ORs a
   `to_tsquery('reac:*')` arm onto the `plainto_tsquery` it already builds. That
   one function feeds both `branch()` and the outer `ts_headline`, so prefix hits
   are ranked *and highlighted* with no other edit.
2. **One substring band** — `ILIKE '%q%'` over `Source.trgm`, which is already
   exactly the short-field list complication 4 asks for. No new descriptor field.

| Band | Match | Rank |
|---|---|---|
| 1 | FTS — exact, stemmed or prefix, incl. bodies | `2.0 + ts_rank` |
| 2 | Substring in a short identifying column | `1.0 + similarity` |
| 3 | Trigram fuzzy (typos) | `similarity`, floored at 0.3 |

### What changed from the original design, and why

The first version specified four bands (splitting word-start from mid-word), a
`coverage` scoring function, and client-side highlighting in
`search-result-row.tsx`. Measured against the live DB, two premises were wrong:

- **Substring-on-short-fields does not fix the motivating example.** `react`
  appears in **zero** short columns and in 16 `snapshot_markdown` bodies, so
  `reac` would still have found nothing. Prefix FTS is what fixes it — and it
  reaches bodies, which the substring band deliberately cannot.
- **Prefix hits highlight for free**, which removes the frontend work entirely.
  Complication 5 then bites only on infix hits, where the match is in the title
  the row already shows.

Bands 2/3 of the old design collapse to one, ordered by the `similarity()`
already in the query; a `coverage` score goes in only if two-character results
prove arbitrary in use. The ceiling is marked with a `ponytail:` comment.

## Open question — answered

*Full infix at two characters, or prefix-only until three?* **Full infix from
two.** That is what was asked for, the banding carries the ordering, and the
evidence shows prefix alone leaves `gine` and `in` unmatched. Revisit only on
real results.

## Depends on

[[t-0c5wyz]], shipped. Touches `search.repository.ts` and its repository tests.
Nothing else.
