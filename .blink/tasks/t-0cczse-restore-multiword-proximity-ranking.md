---
id: t-0cczse
title: Restore multi-word proximity ranking in global search
status: backlog
created: 2026-08-29T07:08:01Z
updated: 2026-08-29T07:08:01Z
estimate: S
decisions: [d-0ccyjm, d-0c5wyy]
tags: [search, backend, ranking]
---

Multi-word searches no longer favour documents where the words sit **close
together**. Shipped knowingly with partial matching ([[t-0cbm48]]); the choice
and its reasoning are [[d-0ccyjm]]. This is the task to undo it.

## What broke, and why

`tsQuery()` ORs a prefix arm onto the plain query so `reac` finds *React*:

```sql
(plainto_tsquery('english', q) || to_tsquery('english', 'reac:*'))
```

Postgres `calc_rank` dispatches on the query's **root node**: `OP_AND` /
`OP_PHRASE` go to `calc_rank_and`, which multiplies in a `word_distance` factor;
everything else goes to `calc_rank_or`, which ignores proximity completely. The
`||` makes the root `OP_OR`, so every multi-word query silently left the
proximity-aware path. Single-word queries are unaffected — plainto already
produced a bare value node.

Measured on seeded dev data 2026-08-29:

| term | rows | reordered | max shift |
|---|---|---|---|
| `software engineer` | 4 | 1 | 3 |
| `senior engineer` | 5 | 2 | 2 |
| `react typescript` | 16 | 0 | 0 |

`staff engineer` against "Staff Frontend Engineer" scored `0.4963` before the
change and `0.0827` after — the adjacency boost disappearing.

**Not urgent.** At ~100 rows per user the shifts are 2-3 positions. It gets
worse as the corpus grows, and it is invisible until someone compares against
the old behaviour — which is exactly why it is written down here.

## Ways out, best first

None of these are measured yet. Measure before picking.

### A. Rank with `ts_rank_cd` instead of `ts_rank` — leading candidate

`ts_rank_cd` scores by **cover density** — how tightly the matched lexemes sit
in the *document* — rather than by walking the query tree. It should therefore
be indifferent to the `OP_OR` root that broke `ts_rank`.

- Matching is untouched, so recall does not move at all. Only the `case` arm
  in `branch()` changes: `2.0 + ts_rank(...)` → `2.0 + ts_rank_cd(...)`.
- **Band-safe.** `ts_rank_cd` is not bounded by 1.0 the way `ts_rank` is, but
  the bands only require band 1 > band 2: band 1 is `2.0 + rank` (≥ 2.0 for any
  non-negative rank) and band 2 is `1.0 + similarity` (≤ 2.0). Ordering holds
  however large the rank grows.
- Open question to measure: `ts_rank_cd` returns 0 when the lexemes share no
  cover, which can behave differently from `ts_rank` on single-word and
  prefix-only hits. Check those cases explicitly, not just the multi-word ones.

### B. Drop the `plainto` arm, keep only `to_tsquery('a:* & b:*')`

Restores the `OP_AND` root directly, on the reasoning that `w:*` subsumes `w`
under the same `'english'` config — both stem first, then the prefix applies.

**This is the option [[d-0ccyjm]] rejected, and the reason still stands:**
plainto's tokenizer emits compound lexemes the word-split loses. An email
`a@b.com` is a single `email` lexeme to plainto, but `[^\p{L}\p{N}]+` splits it
into `a:* & b:* & com:*`, which never matches it. Same for URLs and other
compound token types. Taking this route means accepting a silent recall hole and
writing the regression test that pins it.

### C. Two ranking expressions, one matching expression

Keep the OR'd query for `where` (recall unchanged, compound tokens still work)
and rank with `greatest(ts_rank(v, plainto), ts_rank(v, prefix))`. The plainto
arm keeps its own `OP_AND` root, so an adjacent exact match gets its proximity
boost back; prefix-only hits fall through to the second term.

- Both terms are `ts_rank`, so the scale is unchanged and the bands still hold.
- Costs two extra `ts_rank` calls per band-1 row. Irrelevant at this size, worth
  re-checking if the corpus grows.

## Done when

- Multi-word adjacency demonstrably beats scattered matches again, with a test
  that fails against the current expression.
- `reac` → *React*, `gine` → *Engineer* and `in` still behave — the partial
  matching tests stay green.
- Whichever route is taken, its own cost is measured and written into
  [[d-0ccyjm]] as a follow-up, not left in the commit message.

## Related

[[t-0cbm48]] (partial matching, shipped) · [[d-0ccyjm]] (the trade-off) ·
[[d-0c5wyy]] (Postgres FTS, not a search engine)
