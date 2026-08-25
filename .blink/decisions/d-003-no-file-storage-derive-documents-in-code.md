---
id: d-003
title: No file storage — AI emits structured JSON/Markdown, the app derives the documents
status: accepted
date: 2026-06-05
updated: 2026-08-25T12:30:00Z
tags: [ai, documents, architecture]
---

## Context
Slice 6 was originally specified as "file storage + AI": Cloudinary uploads,
server-side PDF rendering, a LaTeX toolchain in the backend image.

## Options
- **Render on the server** — a `.tex`/PDF toolchain in the backend container,
  files in Cloudinary. Heavy image, a storage bill, and an asset lifecycle to
  manage for documents that are regenerated constantly.
- **Let the AI emit text and own the formatting in code** — Gemini returns
  structured JSON (`ResumeContent`) or Markdown; the app derives everything from
  it deterministically.

## Decision
Re-scope Slice 6: no file storage. A golden-tested pure deriver turns
`ResumeContent` into `.tex` (Copy / Open in Overleaf), and react-pdf renders the
same content to PDF **client-side**. Cover letters take the same route through a
shared Markdown parser feeding both the HTML preview and the PDF.

## Consequences
Zero backend rendering toolchain and no storage provider. The tradeoff is no
audit trail of uploaded source files (see [[r-003]]) and PDF generation that
cannot run in CI — covered by unit tests on the derivers plus live smokes.
