---
id: t-0cugqj
title: "C9.2 — Master Profile editor screen & section sub-editors"
status: done
milestone: m-0cc02t
owner: Antigravity
created: 2026-09-07T23:05:00Z
updated: 2026-09-07T23:28:45Z
estimate: M
blocked_by: [t-0ccxks]
decisions: [d-0cugq2]
tags: [mobile, expo, profile]
---

Spec §4.8 and [[d-0cugq2]]. Full-screen Master Profile editor screen on mobile.

**Done when**
- Route `/profile` exists in `mobile/src/app/profile/index.tsx` (or `/profile.tsx`)
  under the root protected Stack.
- Header carries screen title, back button, and "Save" action with saving/saved feedback
  and error banners.
- Six touch-adapted sections:
  1. Basics: Name, email, phone, location, and links list with add/edit sheet.
  2. Summary: Multiline Textarea.
  3. Experience: Card list of roles with an `EditExperienceSheet` modal for adding/editing
     role, company, employment type, location, start/end dates, current toggle, and bullet points.
  4. Projects: Card list with an `EditProjectSheet` for project name, role, tech stack, links, bullets.
  5. Skills: Category groups with item chip tags and add/remove affordances.
  6. Education: Card list with an `EditEducationSheet` for degree, school, field of study, dates, grade.
- Save commits to `PUT /api/profile` via `useUpdateProfile` with inline client validation.
