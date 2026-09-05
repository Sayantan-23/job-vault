---
id: m-0cc02t
title: JobVault Mobile — React Native + Expo
status: active
order: 2
start: 2026-08-28
created: 2026-08-28T00:00:00Z
updated: 2026-09-05T00:22:00Z
summary: A native iOS/Android companion to the web app, built on Expo, reusing the existing TypeScript data layer. Capture-first, not a port of every screen.
tags: [mobile, expo]
---

The second milestone after the Express/Next rebuild ([[m-01]]). Framework
choice and its consequences are recorded in [[d-0cc01s]]; the page-by-page
scope analysis is
`docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md`.

**The thesis.** The mobile app is not a port of the eleven `/app/*` routes. Its
reason to exist is the two things a phone does that a laptop cannot: **capture
a job the moment you see it** (share-sheet intent from LinkedIn, a browser, or
a WhatsApp forward — the mobile counterpart to the Chrome extension) and
**answer a question while you are standing in front of the application form**
(the saved-answers library, with copy-to-clipboard). Everything else on the
phone is triage: read state, nudge state forward, get notified.

Authoring surfaces — the profile editor, persona editing, résumé generation,
cover-letter refinement — stay laptop work and appear on mobile as read/copy
at most. Building a 881-line profile editor for a 390px screen would be the
single most expensive way to add the least value.

**Ordering.** Foundation and auth gate everything. After auth lands, the
Answers, Cover-letters and Profile chunks are independent of the Jobs chunk and
of each other, so they can run in parallel; Capture, Reminders and Search all
depend on Jobs being real first.

**Where it stands (2026-08-29).** Scoping is done, every architectural decision
is settled — framework [[d-0cc01s]], auth transport [[d-0cc1x6]],
component/styling split [[d-0cc24z]], repo structure [[d-0cc2vk]], platform
order [[d-0cc2w5]] — and the chunk list in §6 of the spec is now thirteen
`planned` tasks with their dependencies wired through `blocked_by`, so the waves
derive rather than being written down. Navigation is settled too ([[d-0cd3wr]]): four
tabs — Jobs · Answers · Vault · Activity — in an anchored full-bleed bar with the
add-job FAB raised clear above it. **No open questions remain.**

No code written yet. Two wave-1 tasks are pure backend and runnable immediately;
the third, C0, waits on three commands only the user can run (they need a browser
login — see §8 of the spec). Run it with `/blink:execute m-0cc02t`.

**Not in scope.** The public `(web)` marketing surface, the Chrome extension,
and offline-first sync (a read cache is in scope; conflict resolution is not).
