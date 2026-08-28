---
id: d-0c9ovf
title: Answer matching runs locally on bigrams, not on embeddings
status: accepted
date: 2026-08-27
created: 2026-08-27T12:18:52Z
updated: 2026-08-27T12:18:52Z
tags: [extension, answers, ai]
---

## Context

Surfacing saved answers ([[t-0c5uc8]]) only pays if the right answer floats to
the top of a screening question. Question wording varies between applicant
tracking systems, so the match cannot be an equality check.

This is the gap in the category's best product. Simplify reuses a saved answer
only on an exact question-string match, and its own documentation apologises
for it: *"The wording has to match exactly. Similar questions with slightly
different phrasing are treated as separate questions."* No other surveyed
product stores reusable open-ended answers at all.

## Options

1. **Exact string match** — what Simplify does. Rejected: it is the known
   weakness we are trying to beat, not a baseline to copy.
2. **Local Dice coefficient over character bigrams** — no dependency, runs in
   the popup, roughly fifteen lines.
3. **Server-side `pg_trgm` similarity** — a new endpoint plus
   `CREATE EXTENSION pg_trgm`, which is [[t-0c5wyz]]'s migration, not this
   slice's.
4. **Embeddings via Gemini** — semantically correct, but adds an AI call per
   popup open, spends the rate limit derived in slice 6, and puts a network
   round trip in front of a UI that has to feel instant.

## Decision

Option 2. Dice over character bigrams of the normalised question, computed in
the popup. Above ~0.45 a row is marked as a match; below, answers still list,
just unmarked.

## Consequences

- Zero dependencies, zero backend change, zero migration. `GET /api/answers`
  and `POST /api/answers/:id/used` already exist and are enough.
- **Known ceiling, stated rather than hidden.** Bigrams catch rewording and
  typos — *"Why do you want to work at Acme?"* scores high against a saved
  *"Why do you want to work at this company?"*. They do **not** catch
  semantically equivalent but lexically different phrasings: *"Why are you
  interested in this role?"* scores low. No cheap local algorithm does.
- The upgrade path stays open and additive: server-side embeddings behind the
  same ranking interface, once there is evidence that near-miss phrasings are
  what users actually hit. The code carries a `ponytail:` comment naming this.
- **Revisit when** users report the ranking missing obvious matches, or when
  [[t-0c5wyz]] lands `pg_trgm` anyway and a server-side option gets cheaper.
