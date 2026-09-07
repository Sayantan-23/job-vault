---
id: t-0cugql
title: "C9.4 — Persona content editor & profile item picker"
status: done
milestone: m-0cc02t
owner: Antigravity
created: 2026-09-07T23:05:00Z
updated: 2026-09-07T23:32:55Z
estimate: M
blocked_by: [t-0cugqj, t-0cugqk]
decisions: [d-0cugq2]
tags: [mobile, expo, personas]
---

Spec §4.8 and [[d-0cugq2]]. Tailored persona content editing and item selection on mobile.

**Done when**
- Route `/personas/[id]` exists in `mobile/src/app/personas/[id].tsx` under the root protected Stack.
- Header carries persona title, back button, and "Save" action calling `useUpdatePersona`.
- Name input and summary editor.
- Mobile `PersonaItemPicker`: for Experience, Projects, Skills, and Education, displays
  master profile items with checkmark toggles to add or remove them from this persona.
- Picked items can be customized specifically for this persona using the sub-item sheets
  from [[t-0cugqj]] without modifying the underlying master profile.
- Unsaved changes dirty state protects against accidental exit.
