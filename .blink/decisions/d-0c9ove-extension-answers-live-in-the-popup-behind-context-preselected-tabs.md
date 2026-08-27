---
id: d-0c9ove
title: Extension answers live in the popup behind context-preselected tabs
status: accepted
date: 2026-08-27
created: 2026-08-27T12:18:52Z
updated: 2026-08-27T12:18:52Z
tags: [extension, answers, ux]
---

## Context

The extension popup did one thing: save the job on this page. Surfacing the
saved answer library ([[t-0c5uc8]]) gives it a second job, and a 360px popup
has to make both reachable without burying either.

A survey of the category — reading the shipped Simplify and Teal CRX bundles
rather than vendor copy — found two recurring patterns. Context detection
usually replaces navigation outright (Teal auto-routes by entity type,
Careerflow gates whether its icon appears at all). But every product with more
than one job still keeps a flat nav: Simplify, the category leader at 1M+
installs, runs a three-tab bar *and* branches into four context states inside
it. The products that dropped nav entirely are single-purpose.

## Options

1. **Tabs alone** — a persistent strip, user picks. Discoverable, but weights
   both jobs equally when the user is only ever doing one, and spends a tap.
2. **Context auto-switch alone** — no nav; the page decides the view. Best
   flow, worst discovery: a mode reachable only by accident is a mode most
   users never learn exists.
3. **Home list** — a launcher screen. Taxes every use of the popup with an
   extra click to serve discoverability once, and demotes the shipped
   one-click capture flow to two clicks.
4. **Tabs, context-preselected** — the strip from 1, the detection from 2.

## Decision

Option 4. A persistent two-tab strip whose active tab is chosen by page
context. It costs only the 38px strip: the feature is visible on day one, and
the correct tab is already active, so no tap is spent.

The detection is free. Reading the question off the page *is* the feature, so
that code is a prerequisite regardless of how navigation works.

The popup stays the only surface. An on-page overlay ([[t-0015]]) would need a
persistent content script and broad host permissions — an architectural change
and a Web Store review surface, not a UI addition. Simplify's inline per-field
"Generate with AI" pill, the most refined interaction in the survey, is
unreachable without exactly that.

## Consequences

- **Permissions are unchanged**: `activeTab` + `scripting`, `host_permissions`
  still scoped to the web-app origin. This keeps [[t-0012]] and [[t-0016]]
  cheap.
- One injected pass on popup open returns both the job data and the answer
  fields, because preselection needs both before either view renders. That
  hoists `CaptureView`'s on-mount load into `App.tsx`. The alternative is
  injecting twice on every open.
- The whole form is scanned, not just the focused field — a Workday or
  Greenhouse screening page stacks several open-ended questions, so one popup
  open replaces one per question.
- **Revisit when** the popup grows a third job. Simplify's three-tab bar is the
  observed ceiling for this shape; beyond that the strip stops fitting 360px.
