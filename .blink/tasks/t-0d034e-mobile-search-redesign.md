---
id: t-0d034e
title: "Mobile search redesign — floating palette / header morph & smart empty state"
status: backlog
milestone: m-0cc02t
created: 2026-09-10T18:24:00Z
updated: 2026-09-10T18:24:00Z
estimate: M
tags: [mobile, expo, search, design]
---

## Context & Rationale

Task [[t-0ccxkt]] implemented the foundational full-screen mobile search experience (`mobile/src/app/search.tsx`) hitting `GET /api/search` with live debounced querying across 5 entity types (Jobs, Contacts, Resumes, Cover Letters, Answers), filter chips, and snippet highlighting.

While functional, a standard full-page route on mobile can feel disjointed compared to modern mobile command palettes and the web app's elevated ⌘K modal. This task tracks the future visual and UX redesign of mobile search.

## Design Concepts Explored

### Option 1: Floating Frosted Sheet Palette (Apple Spotlight / Linear Mobile Style)
- Instead of pushing a full standard screen route, open search as an elevated modal or top-anchored sheet over a blurred backdrop using `expo-blur` (`BlurView`).
- Floating search bar card with glassmorphism border (`rgba(255,255,255,0.08)` / `hairline`), elevated subtle drop shadow.
- Results appear in a floating pill/card stream directly beneath the search input.
- Tapping outside or swiping down dismisses the palette smoothly back to whatever screen the user was on.

### Option 2: In-Place Header Expansion / Morph
- When tapping the search icon in `AppHeader`, avoid a hard route push.
- The header title fades out while the search input springs open horizontally across the header bar using Reanimated layout animations.
- Filter chips dock immediately beneath the sticky header with subtle entrance stagger.
- The background content dims with an animated overlay as search results populate.

### Option 3: Grouped Editorial Bento / Surface Cards
- Replace flat list separators with distinct grouped bento surfaces for each entity category:
  - Jobs card with company logo monogram, status pill, and highlighted snippet.
  - Documents card with preview thumbnail badge and metadata.
  - Answers card with question text and target response preview.
- Dynamic filter chips showing live match count badges, e.g., `All (8)`, `Jobs (3)`, `Resumes (1)`, `Answers (4)`.

### Option 4: Smart Idle & Empty State
- When query is empty:
  - Display "Recent Searches" chips (persisted in `AsyncStorage` / zustand store).
  - Quick-jump suggestions: "Recent Applications", "Saved Answers", "Latest Résumé".
- Smooth keyboard handling with `KeyboardAvoidingView` or `react-native-keyboard-controller` ensuring zero layout jumps when keyboard appears.

## Acceptance Criteria
- Choose and implement the approved redesign concept.
- Preserve full functionality: debouncing (200ms), 5 entity type filtering, deep-linking into jobs, contacts, vault documents, and auto-opening the Answer sheet.
- Maintain smooth 60fps animations and full dark/light theme fidelity.
