---
id: t-0cb5xk
title: Rich-text answer fields in the extension insert as plain textContent
status: backlog
milestone: m-01
created: 2026-08-28T07:41:07Z
updated: 2026-08-28T07:41:07Z
estimate: S
tags: [extension, answers, risk]
---

`content/answer-insert.ts` handles a `[contenteditable]` target by setting
`el.textContent` and dispatching `input`. That is right for a plain
contenteditable div and wrong for a rich-text editor — Draft.js, ProseMirror
and Slate own their own document model and revert a raw `textContent` write on
the next render.

**This is the same failure the textarea path was built to avoid:** the box looks
filled, and the application submits empty.

**Why it shipped unverified.** Browser verification against live Greenhouse
(React 17), Ashby (React 17) and Lever (jQuery) confirmed the textarea path
works — React's `onChange` fires once with the full string, indistinguishable
from Playwright's `.fill()`. None of those three forms contained a single
`[contenteditable]` node, so the branch could not be exercised. It was left as
written rather than swapped for an untestable alternative on already-merged
code.

**The fix, when an ATS with a rich-text answer box turns up:**
`document.execCommand('insertText', false, text)` on a focused editor. It is
deprecated but remains the reliable path for these editors, because it routes
through the same beforeinput/input pipeline their model listens to. Keep the
`textContent` write as the fallback for plain contenteditable, and guard the
call — jsdom does not implement `execCommand`, so the existing unit test needs
the fallback to stay reachable.

**How to trigger it:** find an application form whose open-ended answer field is
a rich-text widget rather than a `<textarea>`, insert into it, then read the
form's own state (not the DOM) to see whether the text survived.

Related: [[t-0c5uc8]] shipped the surface; the ceiling is recorded as a
`ponytail:` comment at the branch itself.
