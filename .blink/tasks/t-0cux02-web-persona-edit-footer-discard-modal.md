---
id: t-0cux02
title: "Move persona edit save/cancel to footer and prompt discard on cancel or outside click"
status: done
milestone: m-01
owner: Antigravity
created: 2026-09-08T23:44:00Z
updated: 2026-09-08T23:46:00Z
estimate: S
tags: [web, personas]
---

In web persona edit sheet (`EditPersonaSheet`):
1. Move Save and Cancel buttons from slideover header to slideover sticky footer.
2. Allow clicking outside (or Escape or Cancel button) to close the slideover.
3. If the user has made any edits (draft is dirty), show the discard changes confirmation modal (`ConfirmDialog`: "Discard unsaved changes?") matching mobile app behavior before discarding and closing.
