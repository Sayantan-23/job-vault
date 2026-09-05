---
id: t-0c7ub1
title: "Sheets no longer select the first input's text on open"
status: done
milestone: m-01
created: 2026-08-26T14:05:00Z
updated: 2026-09-05T00:22:00Z
tags: [frontend, ui, a11y]
---

Reported on `/app/answers`: opening an answer slideover highlighted the whole
question text.

Root cause is shared, not answers-specific: Radix `FocusScope` autofocuses the
first tabbable node with `select: true`, so `element.select()` fires whenever
that node is a text input — every `SheetContent` caller (job drawer, answers,
personas ×2, new cover letter).

Fix in `components/ui/sheet.tsx`: default `onOpenAutoFocus` that prevents
Radix's autofocus and focuses the panel itself (`tabIndex={-1}` from
FocusScope), so the dialog is still announced, Escape/Tab still work, and
nothing is pre-selected. Spread order leaves callers free to override.

Regression check: `answer-drawer.test.tsx` › "opens without selecting the
question text" (verified failing before the fix).

Not done: `components/ui/dialog.tsx` has the identical defect for modals —
separate call, left for the user to decide.

**This file was written after the work, not before it** — recorded in commit `14d64c78`.

