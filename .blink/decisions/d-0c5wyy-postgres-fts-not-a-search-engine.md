---
id: d-0c5wyy
title: Global search runs on Postgres full-text search, not a search engine
status: accepted
date: 2026-08-25
created: 2026-08-25T11:23:24Z
updated: 2026-08-25T11:23:24Z
tags: [search, infrastructure]
---

## Context

Global search across jobs, résumés, cover letters, personas and saved answers
wants to feel genuinely powerful — typo tolerance, ranking, highlighting — not
like a `LIKE` filter. Elasticsearch/OpenSearch was raised, on the evidence of
PetNest, a sibling project running OpenSearch in production without trouble.

The comparison does not carry over. PetNest's own `ADR-0014` records why it
chose OpenSearch: multi-type search with **cross-source ranking** over 16
services that each own a separate database, per-viewer privacy at **500K+ user
scale**, and OLTP load it did not want on transactional databases. It rejected
per-service Postgres FTS for exactly those three reasons.

None of them describe JobVault, which is one service, one database, and one
user. `WHERE user_id = $1` leaves roughly a hundred rows; a single `UNION ALL`
ranks across every table because they all live in the same database.

The cost is not the query, it is index sync. PetNest can afford it because NATS
JetStream already existed and search rode the bus for free — and it still paid
60 Go files, a dedicated 14th service, per-type mappings, tombstones, a
`create-indices` bootstrap and an OpenSearch container, plus re-emit backfill
commands and a runbook for the drift its ADR documents. JobVault has no durable
event bus; socket.io pushes notifications to a browser and is not a message log.
Sync here would be hand-rolled dual-writes from the service layer — the version
PetNest deliberately did not build, and the one that drifts silently until a
search result links to a deleted row.

## Options

1. **Postgres FTS** — `to_tsvector`/`ts_rank` for ranking and stemming,
   `pg_trgm` for typo tolerance, `ts_headline` for highlighted snippets.
2. **Elasticsearch / OpenSearch** — a container, an index per type, and a sync
   mechanism that does not exist yet.
3. **`ILIKE` only** — no ranking, no typo tolerance. Rejected: the point of the
   feature is that it feels good, and this does not.

## Decision

Postgres FTS, computed **at query time**: no stored `tsvector` column, no GIN
index, no full-text migration. Over a `user_id`-filtered set of about a hundred
rows this is sub-millisecond. `CREATE EXTENSION pg_trgm` is the only schema
change — one line, no table touched.

## Consequences

- Zero sync code. The searchable text is on the row the write already touched,
  so the index cannot drift from the data because there is no separate index.
- The upgrade path stays open in both directions and each step is additive: a
  stored generated `tsvector` plus a GIN index if query time ever becomes
  measurable, a real search engine after that. Choosing OpenSearch now would
  close the cheap path and open none.
- **Revisit when** JobVault goes multi-tenant, or search has to rank across data
  this database does not own, or FTS latency is measurable rather than
  hypothetical. `project.md` currently lists multi-tenant SaaS as a non-goal.
- No faceting, synonym dictionaries or custom analyzers. Nothing asks for them.
