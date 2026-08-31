---
id: t-0cgtgp
title: "MarkdownProse — the 16th primitive, and which renderer it uses"
status: backlog
milestone: m-0cc02t
created: 2026-08-31T08:41:55Z
updated: 2026-08-31T08:41:55Z
estimate: S
blocked_by: [t-0ccxkm]
tags: [mobile, expo, ui]
---

C2 ([[t-0ccxkm]]) shipped **15 of 16** primitives. `MarkdownProse` is the gap.

Spec §2 names `react-native-markdown-display`. It is **not installed** — non-font
dependencies were outside the C2 lane's file ownership, so the lane stopped and
declared it rather than reaching across. That was correct.

What already exists: `mobile/src/components/ui/markdown-prose.ts` holds
`repairSplitBold` (the only logic in the web sibling) with its tests, and the file
header carries resume instructions.

**This is a decision before it is a task.** `react-native-markdown-display` last
released ~2021, so whether it survives React 19 is unverified. Three ways out:

1. install it and finish the primitive as specced;
2. pick a maintained renderer instead and diverge from the spec deliberately;
3. defer the whole thing to C8 ([[t-0ccxkr]]), which is the first chunk that
   actually renders markdown — nothing before it needs this.

**Done when** the choice is recorded as a decision, and either the primitive
renders on our tokens with a section in `/gallery`, or this task is dropped in
favour of C8 with the reason written down.
