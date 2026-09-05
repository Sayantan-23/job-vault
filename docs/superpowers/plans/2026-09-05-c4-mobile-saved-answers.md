# C4 — Mobile Saved Answers Library

> **For the coder agent:** implement task-by-task. Each task lists exact files, the
> sibling pattern to mirror, and the gates to run. Colocated `*.test.tsx` beside
> each component (no snapshots). Repo root is `git rev-parse --show-toplevel`;
> all paths below are repo-relative.

**Blink:** task `t-0ccxko`, milestone `m-0cc02t`. Spec
`docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §4.6.

**Goal:** The Answers tab stops being a placeholder and becomes a first-class mobile
companion tool: browse saved answers, search questions and answer text, one-tap
copy with haptic feedback to clipboard (stamping `last_used_at`), create/edit
via a bottom sheet with character counting, and generate dual-variant answers
with persona selection and the **job-context picker** (`t-0c61ek`).

---

## 1. Architecture & Design Decisions

1. **Native Clipboard & Haptics:**
   Uses `expo-clipboard` (`setStringAsync`) and `expo-haptics`
   (`notificationAsync(NotificationFeedbackType.Success)`).
   Copy chip shows a transient "Copied" feedback state for 2 seconds.
   `onCopied` invokes `useMarkAnswerUsed()` without cache invalidation to prevent
   rows jumping under finger.

2. **Job Context Picker (`t-0c61ek`):**
   `POST /api/answers/generate` accepts `jobId`. We fetch user jobs via
   `useInfiniteJobs()` and surface a clean job selector in `GenerateAnswerControls`
   alongside the persona selector, fulfilling `t-0c61ek`.

3. **List & Search:**
   Filtering is client-side instant search matching `question`, `answerShort`,
   and `answerLong`. Uses `FlatList` with `EmptyState` when empty.

4. **Sheet & Editor:**
   Create and edit operations open via the mobile `Sheet` primitive. Form shows
   character counts matching web targets: 500 characters for short, 2000 for long.
   AI generation section conditionally renders if AI is enabled and personas exist.

---

## 2. File Map

```
mobile/
├── package.json                          (expo-clipboard, expo-haptics installed)
├── src/
│   ├── app/(tabs)/answers.tsx            (replace Placeholder with <AnswersScreen />)
│   ├── types/
│   │   ├── answer.ts                     (port Answer, AnswerDraft, GenerateAnswerBody, AnswerBody)
│   │   └── persona.ts                    (Persona interface)
│   ├── lib/
│   │   ├── query-keys.ts                 (add ANSWERS_KEY, PERSONAS_KEY, AI_STATUS_KEY)
│   │   └── queries.ts                    (add answersQuery, personasQuery, aiStatusQuery)
│   ├── hooks/
│   │   ├── use-answers.ts                (useAnswers, useCreateAnswer, useUpdateAnswer, useDeleteAnswer, useMarkAnswerUsed, useGenerateAnswer)
│   │   ├── use-answers.test.tsx          (unit tests)
│   │   ├── use-personas.ts               (usePersonas)
│   │   └── use-ai-status.ts              (useAiStatus)
│   └── components/
│       └── answers/
│           ├── answer-copy-chip.tsx      (copy button + haptic + stamp)
│           ├── answer-copy-chip.test.tsx
│           ├── answer-row.tsx            (row presentation with chips & delete)
│           ├── answer-row.test.tsx
│           ├── generate-answer-controls.tsx (persona & job-context picker, AI trigger)
│           ├── generate-answer-controls.test.tsx
│           ├── answer-sheet.tsx          (create/edit bottom sheet + draft acceptance)
│           ├── answer-sheet.test.tsx
│           ├── answers-screen.tsx        (search, list, new answer trigger, delete confirm)
│           └── answers-screen.test.tsx
```

---

## 3. Implementation Plan

### Part 1: Data Layer & Hooks
- Create `types/answer.ts` and `types/persona.ts`.
- Update `lib/query-keys.ts` and `lib/queries.ts`.
- Implement `hooks/use-answers.ts`, `hooks/use-personas.ts`, `hooks/use-ai-status.ts`.
- Write tests in `hooks/use-answers.test.tsx`.

### Part 2: Components
- Build `AnswerCopyChip` with `expo-clipboard` & `expo-haptics`.
- Build `AnswerRow` supporting single/dual chips, relative time, row tap, and delete action.
- Build `GenerateAnswerControls` with persona selector, job context selector (`t-0c61ek`), instructions, and draft preview.
- Build `AnswerSheet` managing question, short, and long variants, draft acceptance, and save mutation.
- Add test suites for all components.

### Part 3: Screen & Tab Integration
- Build `AnswersScreen` combining clean `AppHeader` (no leading action, per `d-0cqv2p`), search input, `Animated.FlatList` with `useHideOnScroll`, empty states, bottom-right floating `SpeedDial` FAB ("New answer" action with darkened/blurred backdrop), and `ConfirmDialog` for delete.
- Wrap content in `bg-tab-bar` with `rounded-b-[20px] bg-background` shell matching `d-0cd3wr`.
- Update `app/(tabs)/answers.tsx` to render `<AnswersScreen />`.
- Add test suite for `AnswersScreen`.

### Part 4: Verification
- Mobile typecheck, lint, unit tests (100% pass), and `npx expo export`.
- Full project gates (`make typecheck`, `make lint`, `make test`, `blink validate`).
- Update task `t-0ccxko` to `status: done`.
