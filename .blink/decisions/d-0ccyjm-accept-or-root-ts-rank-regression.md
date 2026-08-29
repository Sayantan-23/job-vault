---
id: d-0ccyjm
title: Partial search keeps the plainto arm, accepting the OP_OR ts_rank regression
status: accepted
date: 2026-08-29
created: 2026-08-29T06:40:34Z
updated: 2026-08-29T06:40:34Z
tags: [search, backend]
---

## Context

Partial matching ([[t-0cbm48]]) added a prefix arm to the search tsquery so
`reac` finds *React*. It is OR'd onto the `plainto_tsquery` that was already
there:

```sql
(plainto_tsquery('english', q) || to_tsquery('english', 'reac:*'))
```

That OR changes the query's **root node** from `OP_AND` to `OP_OR`, and
Postgres `calc_rank` dispatches on the root: `OP_AND`/`OP_PHRASE` go to
`calc_rank_and`, which weights by `word_distance`; everything else goes to
`calc_rank_or`, which ignores proximity entirely. So multi-word queries lose
their adjacency boost. Single-word queries are unaffected — plainto already
produced a bare value node.

Found by adversarial review as PLAUSIBLE, then confirmed by measurement against
the seeded dev DB:

| term | rows | reordered | max shift |
|---|---|---|---|
| `software engineer` | 4 | 1 | 3 |
| `senior engineer` | 5 | 2 | 2 |
| `react typescript` | 16 | 0 | 0 |

`staff engineer` against "Staff Frontend Engineer" scored `0.4963` before and
`0.0827` after — a 6x drop, the proximity weighting disappearing.

## Decision

**Keep both arms. Accept the ranking regression and document it in the code.**

## Alternatives

**Drop the `plainto` arm, keep only `to_tsquery('a:* & b:*')`.** Restores the
`OP_AND` root and with it proximity ranking, on the reasoning that `w:*`
subsumes `w` under the same `'english'` config — both stem first, then the
prefix applies.

Rejected because it is not actually equivalent on recall. Plainto's tokenizer
emits **compound lexemes that the word-split loses**: an email `a@b.com` is a
single `email` lexeme to plainto, but the `[^\p{L}\p{N}]+` split produces
`a:* & b:* & com:*`, which never matches it. Same for URLs and other compound
token types. Trading a ranking nicety for a silent recall hole is the worse
side of the trade at this corpus size.

## Consequences

- Multi-word queries rank by OR-combination rather than adjacency. On ~100 rows
  per user the observed shifts are 2-3 positions; this matters more as the
  corpus grows.
- The reversal is a one-line change with a known cost, recorded above. If it is
  taken, the email/URL recall regression needs its own test.
- Documented in `search.repository.ts` above `tsQuery()` as a `ponytail:`
  comment naming the upgrade path, so the next reader does not rediscover it.

## Related

[[t-0cbm48]] · [[d-0c5wyy]] (Postgres FTS, not a search engine)
