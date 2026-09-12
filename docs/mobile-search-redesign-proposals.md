# Mobile Global Search Redesign Proposals

> **Status**: Design Proposals (Deferred for post-MVP / post-C5/C10 review)  
> **Related Task**: `.blink/tasks/t-0d034e-mobile-search-redesign.md`  
> **Current Baseline**: `t-0ccxkt` (`mobile/src/components/search/search-screen.tsx`)  
> **Author**: Antigravity  
> **Date**: 2026-09-12

---

## 1. Executive Summary & Problem Analysis

In Task `t-0ccxkt`, JobVault shipped a fully functional mobile search screen hitting `GET /api/search` with live 200ms debouncing across five entity types (Jobs, Contacts, Resumes, Cover Letters, Answers), STX/ETX highlight rendering, filter chips, and cross-screen deep-linking.

However, the current visual and interactive execution feels functional but uninspired:
1. **Context Severance**: Tapping search pushes a full-screen route (`/search`), entirely hiding the AppHeader and bottom navigation tab bar. It feels like navigating away to a new page rather than summoning a fast command utility.
2. **Thumb Ergonomics (Reachability)**: On modern tall phones (6.1" to 6.8"), placing the text input and filter pills at `insets.top + 8` forces awkward single-handed grip shifting.
3. **Empty Zero-Query State**: When empty, the screen displays a static magnifying glass icon with generic text, offering no utility before the user starts typing.
4. **Uniform Visual Weight**: All entity rows share the exact same list tile geometry with 16px icons in small squares, obscuring the distinct nature of jobs vs. interview answers vs. resumes.

---

## 2. Design Concepts

### Option 1: The "Thumb-First" Bottom Command Sheet (Ergonomic Focus)

Inspired by modern touch-first mobile interfaces (Arc Search, Apple Maps, Safari):

```
┌─────────────────────────────────────────┐
│ [Dimmed App Backdrop / Scrim]           │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ── (Grab Handle)                    │ │
│ │                                     │ │
│ │  JOBS (2)                           │ │
│ │  ┌───────────────────────────────┐  │ │
│ │  │ [G] Senior Frontend Engineer  │  │ │
│ │  │ Google · Mountain View        │  │ │
│ │  └───────────────────────────────┘  │ │
│ │                                     │ │
│ │  [All 4] [Jobs 2] [Answers 2]       │ │  <-- Filter pills docked above input
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ 🔍 Search JobVault...         ✕ │ │ │  <-- Search bar pinned to bottom
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │          VIRTUAL KEYBOARD           │ │  <-- Opens directly above keyboard
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

- **Mechanics**:
  - Tapping Search in `AppHeader` (or a future gesture) slides up an interactive bottom sheet using our `Sheet` / `BottomSheet` primitive.
  - The search input bar is docked at the **bottom of the sheet**, resting immediately above the native virtual keyboard.
  - Filter pills dock directly above the input box for effortless thumb switching.
  - Results scroll upward within the sheet body.
- **Pros**: Unbeatable one-handed ergonomics; natural swipe-down dismissal; keyboard and search bar form a single unified unit.
- **Cons**: Differs from traditional top-bar desktop command palettes.

---

### Option 2: The Floating Frosted Palette (Power-User / Spotlight Focus)

Direct mobile translation of the web app's ⌘K modal and Raycast / Apple Spotlight:

```
┌─────────────────────────────────────────┐
│ ///////////// FROSTED BLUR //////////// │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🔍 | Search applications, docs... │  │ <-- Frosted pill card with subtle glow
│  └───────────────────────────────────┘  │
│   [ All ]  [ Jobs ]  [ Answers ]        │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ JOBS                              │  │
│  │  Staff Product Designer           │  │
│  │  Figma · Interviewing             │  │
│  │ ───────────────────────────────── │  │
│  │ SAVED ANSWERS                     │  │
│  │  "Tell me about a conflict..."    │  │
│  │  Matched: "...resolved latency..."│  │
│  └───────────────────────────────────┘  │
│                                         │
│ /////////////////////////////////////// │
└─────────────────────────────────────────┘
```

- **Mechanics**:
  - Uses `expo-blur` (`BlurView`) to render a frosted backdrop over the active tab screen.
  - Renders a floating modal container (`rounded-2xl bg-card/95 border border-hairline shadow-2xl`) anchored slightly below the top safe area.
  - Fluid spring expansion as results populate.
  - Tap outside or swipe down to dismiss back to the exact current app state.
- **Pros**: Visually stunning glassmorphism matching JobVault's brand; direct conceptual parity with web ⌘K.
- **Cons**: Top input requires reach on large screens.

---

### Option 3: In-Place Header Expansion (Calm & Native Focus)

Inspired by iOS Settings, Apple Notes, and standard HIG search controllers:

```
State A (Idle Tab Header):
┌─────────────────────────────────────────┐
│ Applications                    🔍  🔔  │
└─────────────────────────────────────────┘

State B (Search Active):
┌─────────────────────────────────────────┐
│ [←] ┌──────────────────────────────┐ ✕  │  <-- Header title fades; input stretches
│     │ Search jobs, answers, vault… │    │
│     └──────────────────────────────┘    │
│ [All (5)] [Jobs (2)] [Answers (3)]      │  <-- Pills glide down
├─────────────────────────────────────────┤
│ [Live Filtered Result Stream]           │
└─────────────────────────────────────────┘
```

- **Mechanics**:
  - Avoids opening any modal or pushing a new route.
  - Tapping Search in `AppHeader` triggers an animated layout transition: title fades, search bar expands horizontally to fill the header bar, and a cancel/chevron button appears.
  - Current screen contents cross-fade into search results or in-place filtered items.
- **Pros**: Zero context shift; feels native and deeply integrated.
- **Cons**: Higher animation complexity across tab screens.

---

## 3. Interior Presentation Improvements (Universal to all options)

### A. Rich Zero-Query (Idle) State
Instead of an empty icon and helper text when query length is 0:
1. **Recent Searches**: Tap-to-search pills with a clear history action.
2. **Quick Action Jumps**:
   - ⚡ *Interviews scheduled* (filtered job list)
   - 📄 *Default Résumé* (opens A4 viewer)
   - 💬 *Saved Answers library*
3. **Recently Touched Items**: Quick access to the last 2 applications interacted with.

### B. Grouped Category Bento Cards
Replace generic list divider rows with tailored category cards:
- **Jobs**: Monogram company logo, job title, status chip (`Interviewing`, `Applied`), location, and highlighted snippet.
- **Answers**: Serif quotation mark (`“`), bold question title, and an inset callout box containing the answer preview.
- **Documents**: Mini document silhouette with format tag (`ATS RESUME`, `COVER LETTER`) and target job pill.
- **Dynamic Counters on Filter Chips**: `All (7)`, `Jobs (3)`, `Answers (4)`. Chips with 0 hits are dimmed or hidden.

---

## 4. Evaluation Matrix

| Criterion | Option 1: Bottom Sheet | Option 2: Frosted Palette | Option 3: Header Morph |
| :--- | :--- | :--- | :--- |
| **Thumb Reachability** | ⭐⭐⭐⭐⭐ (Best) | ⭐⭐⭐ | ⭐⭐⭐ |
| **Visual Elegance** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (Best) | ⭐⭐⭐⭐ |
| **Web ⌘K Parity** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ (Best) | ⭐⭐⭐ |
| **Implementation Effort** | Medium (uses `Sheet`) | Medium (Modal + `BlurView`) | High (custom header transitions) |
| **Gesture Naturalness** | Swipe down to close | Tap outside to close | Tap Back to close |

---

## 5. Next Steps

Work on this redesign is deferred until core MVP capabilities are completed:
1. Finish `t-0ccxkp` (**C5 Capture** — share target, URL scraping, quick create form).
2. Finish `t-0ccxku` (**C10 Release & Settings** — app icons, splash screen, EAS configuration).
3. Revisit `t-0d034e` to select and implement the preferred search UX.
