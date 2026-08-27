---
id: t-0c5uc8
title: Surface saved answers in the extension on application pages
status: planned
created: 2026-08-25T10:26:32Z
updated: 2026-08-27T12:18:52Z
milestone: m-01
estimate: L
decisions: [d-0c9ove, d-0c9ovf]
tags: [extension, answers, deferred]
---

Slice C of the answer-library work. Put the saved answer library inside the
extension popup so a screening question can be answered without leaving the
application form.

**Scope: answers only.** No form facts — notice period, CTC, years of
experience and work authorization were considered and cut, because storage
only pays when composing costs more than retrieving, and those are memorized.
Browser autofill already covers name/email/phone/address natively. Facts are
form data, and they earn their keep only in a product that submits forms.

**Why the extension is the payoff.** An answer in another browser tab costs a
tab switch, a scan and a copy on every question. On the form page it costs a
click. The extension already authenticates with `X-API-Key` and injects on
demand via `chrome.scripting`, so the runtime exists.

**Needs.**
- Popup tab listing the user's answers, searchable, sorted by `last_used_at`.
- Copy button per variant (short / long); stamp `last_used_at` through the API.
- Read the visible question text on the page and rank matching answers first.
  Simplify reuses a saved answer only on an *exact* question-text match, which
  is brittle — question wording varies between ATSs. Fuzzy matching is the
  differentiator worth building.
- One-click insert into the focused field, user-initiated.

**Autofill: partial yes, deliberately.** Three levels, and only two are worth
building:

| Level | Value | Risk | Verdict |
|---|---|---|---|
| Detect question → rank matching answers first | high | none | build |
| One-click insert into the focused field | high | low, user-initiated | build |
| Silent auto-fill of essay fields with no user action | low | high — a wrong 200-word answer submitted to a real employer | do not build |

The third is where Simplify sits (its "Autofill all fields with AI" toggle).
The failure mode is unrecoverable in a way the time saved does not justify.

**Known ceiling.** Desktop browser only. It does nothing for a job-board mobile
app, where the fallback stays the responsive web app plus system copy/paste.
State this rather than implying the extension covers every apply path.

**Depends on** the answer library existing (the web slice).

---

**Planned 2026-08-27.** Design spec:
`docs/superpowers/specs/2026-08-27-extension-answer-surfacing-design.md`.
Surface and navigation settled in [[d-0c9ove]], the ranking approach in
[[d-0c9ovf]]. Branch `slice-extension-answers` off `develop`.

Two refinements the spec adds over this file's original scope:

- **The whole form is scanned, not just the focused field.** A screening page
  stacks several open-ended questions; scanning all of them is one popup open
  instead of one per question.
- **Insert is conditional.** A row shows Insert only when it has a target
  field; with no field detected the row offers copy alone. A dead Insert
  button is worse than no Insert button.
