---
id: t-0d034e
title: "Mobile search redesign — floating palette / header morph & smart empty state"
status: backlog
milestone: m-0cc02t
created: 2026-09-10T18:24:00Z
updated: 2026-09-12T13:25:00Z
estimate: M
tags: [mobile, expo, search, design]
---

## Context & Rationale

Task [[t-0ccxkt]] implemented the foundational full-screen mobile search experience (`mobile/src/app/search.tsx`) hitting `GET /api/search` with live debounced querying across 5 entity types (Jobs, Contacts, Resumes, Cover Letters, Answers), filter chips, and snippet highlighting.

While functional, the current full-page route disconnects the user from their active screen, places the input outside comfortable one-handed thumb reach, and renders an empty zero-query state with uniform list rows.

Comprehensive architectural proposals, ASCII wireframes, and trade-off matrices are documented in `docs/mobile-search-redesign-proposals.md`.

## Summary of Proposals

1. **Option 1: "Thumb-First" Bottom Command Sheet (Ergonomic Winner)**:
   - Search bar docked at the bottom of a slide-up bottom sheet, resting directly above the virtual keyboard.
   - Filter chips directly above the input for effortless one-handed thumb interaction.
   - Natural swipe-down dismissal to return to the active screen.

2. **Option 2: Floating Frosted Palette (Web ⌘K & Raycast Parity)**:
   - Floating glass capsule with `expo-blur` backdrop overlay over the current screen.
   - Smooth downward spring expansion as search results arrive.
   - Tap outside or swipe down to dismiss without page navigation.

3. **Option 3: In-Place Header Expansion (Native HIG Focus)**:
   - Screen title smoothly fades as the search bar expands horizontally across `AppHeader`.
   - In-place filtered list with zero route transitions.

4. **Interior Enhancements (Universal)**:
   - **Smart Idle State**: Recent searches history, quick action jumps (interviews scheduled, ATS résumé), and recently touched applications.
   - **Tactile Bento Cards**: Distinct card treatments for Jobs (monogram avatar, status chip), Answers (editorial quote block), and Vault Documents (format pill).
   - **Live Counters**: Dynamic pill badges (`All (7)`, `Jobs (3)`, `Answers (4)`).

## Acceptance Criteria
- Review proposals with user after remaining core MVP tasks (C5 Capture `t-0ccxkp` and C10 Settings `t-0ccxku`) are finished.
- Implement the selected design direction.
- Preserve full functionality: debouncing (200ms), 5 entity type filtering, deep-linking into jobs, contacts, vault documents, and auto-opening the Answer sheet.
- Maintain smooth 60fps animations and full dark/light theme fidelity.
