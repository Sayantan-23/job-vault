---
id: t-0cb3le
title: "Dialogs no longer select the first input's text on open"
status: done
milestone: m-01
created: 2026-08-28T06:34:26Z
updated: 2026-08-28T06:34:26Z
tags: [frontend, ui, a11y]
---

The sibling half of [[t-0c7ub1]]. `components/ui/dialog.tsx` carried the same
Radix `FocusScope` defect the sheet did: autofocus lands on the first tabbable
node with `select: true`, so when that node is a text input the whole value
comes up highlighted and one keystroke wipes it.

**Latent, not live — the note on [[t-0c7ub1]] overstated it.** `DialogContent`
has exactly two callers, and neither trips it: `add-job-modal.tsx` leads with
the "From URL" tab `<button>`, and `confirm-dialog.tsx` holds only buttons.
`select: true` is a no-op on anything that is not a text input. Sheets were
actively broken; dialogs were one text-first caller away from it.

Fixed anyway, because it is the same three lines and it pre-empts a confusing
bug in whichever dialog leads with a text field first.

Same fix as the sheet: a default `onOpenAutoFocus` that prevents Radix's
autofocus and focuses the panel itself, placed before the props spread so
callers can still override it.

Because no caller can exercise the defect, the regression test needs its own
fixture — `components/ui/dialog.test.tsx` renders a dialog whose first tabbable
IS a text input, and asserts nothing is pre-selected and that focus still lands
on the panel so the dialog is announced. Both assertions verified failing with
the fix reverted.

**This file was written after the work, not before it** — the change was three
lines decided in conversation. Recording it rather than backdating a lifecycle
it never had.
