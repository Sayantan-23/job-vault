---
id: t-0021
title: Résumé workspace — route split + xl breakpoint parity with the cover-letter editor
status: backlog
created: 2026-06-16
updated: 2026-09-05T00:22:00Z
estimate: S
tags: [frontend, documents, polish]
---

Bring `/app/resumes` in line with the cover-letter editor: move the split from
`lg` to `xl`, and adopt the route-split + side-rail pattern
(`/app/cover-letters/[id]`) if a dedicated editor route is wanted.

**Correction to the older note.** CLAUDE.md's claim that the résumé page "still
uses the old centered/stacked layout" is **wrong** and has been for a while:
`components/resume/resume-workspace.tsx:166` already uses `lg:grid-cols-2` with
a `lg:sticky` preview/actions column at `:170`.

**The real gap, verified 2026-08-25.** The breakpoint (`lg`, where the app rail
leaves too little width — the cover-letter editor splits at `xl` for exactly
that reason, per its own comment at `cover-letter-editor.tsx:130`) and the
absence of a `/app/resumes/[id]` route: `app/app/resumes/` holds only
`page.tsx` and `loading.tsx`, while cover letters have `[id]/page.tsx`.

**Re-verified 2026-09-05:** Still open in backlog. Citing commit `a96cae37` confirmed `?resume=<id>` was already functional and dropped `t-0021` from scope.

