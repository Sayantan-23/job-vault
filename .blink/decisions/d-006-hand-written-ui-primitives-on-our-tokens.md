---
id: d-006
title: Hand-written UI primitives on our tokens; Radix only for overlay behavior
status: accepted
date: 2026-06-01
updated: 2026-08-25T12:30:00Z
tags: [frontend, design-system]
---

## Context
The rebuild needed a component layer. The default move is the shadcn CLI, which
generates components carrying their own styling assumptions.

## Decision
Primitives are hand-written in `src/components/ui/` against our own tokens
(warm-stone base, flat muted-indigo accent, hairline borders, near-zero
shadows). Radix is used only where overlay *behavior* is genuinely hard —
`@radix-ui/react-dialog` behind our dialog and sheet.

## Consequences
Any styled element becomes a component; inline styled markup is not accepted in
review. Themes stay swappable per route group (`(web)` vs `app`) because every
component reads tokens rather than literal colors.
