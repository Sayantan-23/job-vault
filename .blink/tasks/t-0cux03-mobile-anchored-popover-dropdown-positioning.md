---
id: t-0cux03
title: "Fix mobile AnchoredPopover positioning below trigger"
status: done
milestone: m-0cc02t
owner: Antigravity
created: 2026-09-08T23:56:00Z
updated: 2026-09-09T00:14:00Z
estimate: S
tags: [mobile, ui, navigation]
---

Fix dropdown popover opening on top of the trigger rather than below it in mobile app (e.g. AccountMenu avatar in AppHeader).

**Problem**
1. In `AnchoredPopoverTrigger`, the ref is attached to `Pressable` from `react-native-css/components`, which does not forward native element refs to the underlying host view. Consequently, `ref.current?.measureInWindow` never ran, leaving `anchor` state as `null`.
2. When `anchor` is measured on Android via `measureInWindow`, coordinates are returned relative to the content area below the non-translucent status bar (y excluded status bar height). However, `<Modal statusBarTranslucent>` renders from y=0 at the top of the physical display. This caused a vertical offset equal to `StatusBar.currentHeight`, positioning the dropdown over the header avatar.
3. Hook ordering violation in `AnchoredPopoverContent`: calling safe area hooks conditionally after `if (!open) return null` violated the Rules of Hooks.

**Done when**
- `AnchoredPopoverTrigger` attaches a reliable native `RNView` host ref with `collapsable={false}` to measure in window coordinates.
- Android status bar offset is added when placing against `<Modal statusBarTranslucent>`.
- Hook ordering is unconditionally called at top level using `SafeAreaInsetsContext`.
- The popover opens below the trigger rather than overlapping it.
- All tests pass on mobile.
