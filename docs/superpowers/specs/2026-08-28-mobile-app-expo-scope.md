# JobVault Mobile — scope analysis (React Native + Expo)

**Status:** scope agreed, chunks not yet planned
**Milestone:** `m-0cc02t` · **Decision:** `d-0cc01s`
**Date:** 2026-08-28

This is the surface-by-surface audit of the existing app and what mobile builds
for each. It stops short of per-chunk plans — those get written one at a time,
against the chunk list in §6.

---

## 1. The thesis

The mobile app is **not** a port of the eleven `/app/*` routes.

A phone does two things a laptop cannot, and both are things JobVault users do
constantly:

1. **Capture a job the moment they see it.** You are scrolling LinkedIn on the
   train. The Chrome extension is on your laptop. Today that job is lost or
   becomes a note-to-self. A share-sheet target fixes this — it is the mobile
   counterpart to the extension and the single strongest reason for the app to
   exist.
2. **Answer a question while standing in the form.** The saved-answers library
   ([[t-0c5xex]]) exists because application forms ask the same eight questions.
   On mobile that becomes: search, tap, copy, paste into the browser — a
   ten-second loop that on a laptop takes a context switch.

Everything else on the phone is **triage**: see where things stand, nudge a
status forward, respond to a reminder. Authoring stays on the laptop.

This ordering is what keeps the app small. The web app is ~7,600 lines of
feature components; a faithful port would be most of that again. The tiering in
§4 cuts it to roughly a third by refusing to rebuild editors.

---

## 2. What crosses over, and what does not

Audited against `frontend-next/package.json` and `src/`.

### Reused unchanged — the payoff

| Layer | Detail |
|---|---|
| 25 data hooks | `src/hooks/use-*.ts` — TanStack Query v5, zero DOM |
| API client | `lib/api-client.ts` incl. single-flight silent refresh (auth transport aside) |
| All types + Zod schemas | `src/types/*`, shared with the backend contract |
| Pure logic | `cover-letter-markdown.ts`, `resume-markup.ts`, the `.tex` deriver, `job-status.ts`, `dashboard-defaults.ts` |
| Realtime | `socket.io-client` works natively |
| Forms | React Hook Form + `@hookform/resolvers` are renderer-agnostic |

### Must be replaced — no native equivalent

| Web | Native | Where it bites |
|---|---|---|
| `motion` (Framer) | `react-native-reanimated` | Search-palette morph, sheet transitions |
| `@dnd-kit/*` | `react-native-gesture-handler` — or drop | Kanban drag (see §4.2) |
| `@react-pdf/renderer` | `expo-print` (HTML → PDF, on-device) | Résumé + cover-letter export |
| `react-markdown` | `react-native-markdown-display` | Cover-letter + answer preview |
| `@radix-ui/react-dialog` / `-popover` | `@expo/ui` `BottomSheet` / `Menu` (see §2.1) | Every drawer, sheet and menu |
| Tailwind classes | NativeWind | Mostly 1:1; no `hover:`, flex defaults to column, no CSS grid |
| App Router, `?job=` URL state, `proxy.ts` | Expo Router + navigation params | Deep-link scheme replaces query-param state |

`expo-print` keeps `d-003` (no file storage, derive documents in code) intact —
rendering happens on-device, nothing is stored server-side.

### 2.1 `@expo/ui` first — RESOLVED, see `d-0cc24z`

`expo-overview` and `expo-web-to-native` both carry an explicit rule: for sheets,
pickers, sliders, menus, toggles and segmented controls, reach for **`@expo/ui`**
before an RN built-in or a community library. It renders *real* SwiftUI on iOS
and Jetpack Compose on Android, and on SDK 56+ the universal components run in
Expo Go with no custom build. `@gorhom/bottom-sheet` is named as the thing it
replaces — an earlier draft of this spec recommended it, which was wrong.

**The tension.** `@expo/ui` makes screens look like the OS shipped them. JobVault's
identity is deliberately *not* OS-native: warm stone, flat muted indigo,
Instrument Serif headings, hairline borders, near-zero shadows (`d-006`,
`minimalist-ui`). A `@expo/ui` `List` renders as an iOS Settings screen, not as
our editorial list.

**Resolved 2026-08-29 — split by role** (`d-0cc24z`). The OS owns momentary system
interruptions (date pickers, action and share sheets, context menus, alerts,
haptics); we own the content the user came for (job rows, answer cards, job
detail, buttons, chips, status pills, headers, empty states, the FAB and its
morph). Bottom sheets go to `@gorhom/bottom-sheet` — native gesture physics,
branded chrome — because `@expo/ui`'s sheet is a real
`UISheetPresentationController` and slides rather than morphing, which is
incompatible with the agreed FAB container transform.

The reason this is not the hard trade it looked like: "native feel" is three
separable things. Physics and input (`ScrollView`/`FlatList`/`TextInput` are
native views) and navigation transitions (`react-native-screens` under Expo
Router's native Stack) are both free and indifferent to styling. Only widget
chrome ever collided with the brand.

Note `@expo/ui` `List` is **not** virtualized — jobs and answers lists use
`FlatList`/`FlashList` regardless.

### The 16 UI primitives

`components/ui/` is hand-written on our own tokens (`d-006`), which makes this
a **re-implementation, not a migration** — but the API surface and token names
carry over verbatim, so each primitive is small. Fonts (Geist, Geist Mono,
Instrument Serif) load via `expo-font`. Dark mode is already first-class.

---

## 3. Open decisions — need sign-off before Chunk 0

These three shape everything downstream. Each is a real fork, not a default.

### 3.1 Repo structure — RESOLVED, see `d-0cc2vk`

- **(a) Sibling app, duplicated types.** Add `mobile/`, copy types across.
  Fastest to start; reintroduces exactly the divergent-contract failure mode
  that Expo was chosen to avoid.
- **(b) npm workspaces with `packages/shared`.** Types, Zod schemas, api-client
  and query hooks move to a shared package consumed by both `frontend-next/`
  and `mobile/`. Touches the Docker mounts, the Makefile and both tsconfigs.
**Resolved 2026-08-29 — (a) first, (b) on a named trigger.** `mobile/` starts
standalone with copied types. Workspaces get adopted the moment `api-client` needs
the injectable token provider from `d-0cc1x6` to serve both transports — the first
code with two genuine consumers.

Two findings made this safe to defer rather than risky. **Expo SDK 52+ configures
Metro for monorepos automatically** (the old `watchFolders`/`nodeModulesPaths`
config is now something to delete), and this repo is on npm, which avoids the
documented EAS Build/pnpm friction. The mechanics are not the obstacle.

The obstacle is Docker: Compose bind-mounts `./frontend-next:/app` with an
anonymous volume over `/app/node_modules`, and workspace hoisting puts
dependencies in a **root** `node_modules` outside that mount. Adopting workspaces
means changing Compose and the Makefile for the web app that is currently
shipping — not something to debug simultaneously with a first Metro setup.

### 3.2 Auth transport — RESOLVED, see `d-0cc1x6`

HTTP-only cookies (`d-002`) do not work in a native client.

- **Not** the extension's `X-API-Key` — those keys are long-lived and unrotated,
  wrong semantics for a user session.
- **Proposed:** a native mode on `/api/auth/login|register|refresh` that returns
  the token pair in the response body when the client asks for it, stored in
  `expo-secure-store`. Same JWT service, same rotation, same reuse-detection —
  only the transport differs. The api-client's single-flight refresh logic
  ports across as-is with the storage swapped.

### 3.3 Native screens vs DOM components — RESOLVED: native only, no webview

`expo-web-to-native` proposes a migration shape this spec did not consider: scaffold
the Expo shell, ship **every** web screen inside DOM components (`'use dom'`) on day
one, then "strangle" screens to native in value order. The app is shippable from the
first milestone.

Against the §4 tiering, this reframes T3. Instead of *"the profile editor is not on
mobile, link out to the web"*, the option becomes *"the profile editor ships in a
webview until it is worth nativizing"*.

- **For:** every surface exists from day one; the tiering becomes an ordering rather
  than an exclusion; no user ever hits a dead end.
- **Against:** each DOM screen carries a ~2 MB web runtime; and our pages are Next
  App Router with Server Components, which must be unwrapped into a client fetch plus
  a presentational component before they can move at all. That is real work on
  precisely the screens we decided were not worth the work.
**Resolved 2026-08-29: no webview anywhere.** DOM components are rejected outright,
not held as an escape hatch. T3 surfaces link out to the web app. If a T3 surface
turns out to be genuinely missed, it gets built natively or not at all.

### 3.4 `@expo/ui` vs our design system — RESOLVED, see §2.1 and `d-0cc24z`

**Styling layer: NativeWind**, tokens as CSS variables under the same names as
`frontend-next/src/styles/`. Unistyles 3 is faster and ships no components, but it
cannot run in Expo Go and would put a second styling idiom across the two clients.

### 3.5 Navigation model — ⚠️ PROPOSED — **ASK THE USER, DO NOT ASSUME**

Expo Router with a bottom tab bar. Proposed tabs: **Jobs · Answers · Timeline ·
Profile**, with search as a header action and notifications as a header badge.
The web app's icon rail and speed-dial do not translate.

**This has never been confirmed.** Put it to the user before building the tab
shell in C0 — which tabs, in what order, and whether Profile earns a tab at all
given it is read-only (§4.8). Building it and asking later means rebuilding.

---

## 4. Surface-by-surface

Tiers: **T1** ships first · **T2** ships after core · **T3** deferred or
read-only · **✕** not on mobile.

### 4.1 `/app/jobs` — the workspace · 2,134 LOC · **T1**

The home, and the largest surface. Web has Board⇄List behind a segmented
control, a filter toolbar, pagination, an add-job modal and a `?job=` drawer.

**Mobile builds:** a single scrolling **list** — no view toggle. Grouped by
status, infinite scroll replacing the pagination control. Filters collapse from
a five-control toolbar into a bottom-sheet filter with the same
`JobFilters` shape (`search`, `status`, `ghost`, `createdFrom/To`, `sortBy`,
`sortOrder`) so the existing `useJobs` hook is untouched. Ghost-day meter and
outreach badge carry over as-is — they are typographic, not interactive.

### 4.2 Kanban board · 292 LOC · **T3 / ✕**

Drag-and-drop across five columns is a bad phone interaction at any width, and
`@dnd-kit` does not run natively.

**Mobile builds:** nothing. Status changes happen through a status chip in the
job detail and a swipe action on the list row — both hit the same
`PATCH /api/jobs/:id/move`. Revisit a tablet board only if iPad becomes a
target.

### 4.3 Job detail (`?job=` drawer) · **T1**

Web composes eight sections: header, snapshot, details, reminders, timeline,
outreach, résumé launcher, cover-letter launcher.

**Mobile builds:** a full **screen**, not a sheet — there is not enough room for
a drawer over a list. Sections become collapsible blocks in the same order.
Résumé and cover-letter launchers degrade to read/copy links (§4.7). Outreach
contacts get native affordances the web lacks: tap-to-call, tap-to-email.

### 4.4 Add job · **T1**, and the share target is **T1-critical**

Web has a URL-paste form (Cheerio/Turndown scrape) and a manual form.

**Mobile builds:** both, entered from a **floating action button, bottom-right,
inset from both edges**, which morphs into the add-job surface via the same
container-transform animation as the web search palette (`d-0cbc74`). Decided
2026-08-29; revisitable. Plus the reason the app exists — an **Android/iOS
share-sheet target**. Share a URL from any app → JobVault opens with the URL
prefilled and the scrape already running against the existing
`POST /api/jobs/scrape`. Zero new backend work.

Note [[t-0010]] (async scrape + push) becomes materially more valuable here:
a slow scrape on mobile should not hold the UI.

### 4.5 Timeline · 162 LOC · **T1** · Notifications · 170 LOC · **T1**

Both are read-only feeds and port almost directly. `RealtimeProvider` works
natively once the socket carries the native token.

**The real work is push** ([[t-0009]]): `expo-notifications` + EAS, a device-token
table, and a delivery path in the notifications service. This is the largest
genuinely-new backend item in the milestone.

### 4.6 Answers library · 586 LOC · **T1** — highest value-per-line

Web has a list, a `?answer=`/`?new` slideover, dual-variant generation and copy
chips that stamp `last_used_at`.

**Mobile builds:** all of it. Small surface, and the copy-chip loop is *better*
on a phone than on a laptop because that is where the form actually is. Generation
reuses `POST /api/answers/generate` unchanged. The job-context picker
([[t-0c61ek]], wired end-to-end but with no UI sending `jobId`) is a natural
thing to finally land here.

### 4.7 Cover letters (499) + Résumés (1,163) · **T2, read/copy only**

Generation bars, the stage-then-commit AI refine flow with its diff view, and
the content editors are laptop work. Rebuilding the refine UI on a phone is
weeks for an interaction nobody wants at 390px.

**Mobile builds:** browse the library, read the rendered markdown, copy to
clipboard, share the PDF via `expo-print` + the native share sheet. No editing,
no generation, no refine.

### 4.8 Profile (881) + Personas (959) · **T3, read-only**

Six editor sections with bullet-list editors, chip inputs and month-year
pickers; personas add PDF résumé import and an item picker.

**Mobile builds:** a read-only profile summary and a persona list. Editing
links out to the web app. PDF import stays desktop — file-picking a résumé on a
phone is a rare path.

### 4.9 Global search · 510 LOC · **T2**

The morphing ⌘K palette over `DialogPrimitive` (`d-0cbc74`) does not port —
there is no ⌘K on a phone and the morph is Framer-specific.

**Mobile builds:** a full-screen search screen behind a header icon, hitting the
same `GET /api/search` across all five entity types, with the two-band ranking
unchanged. The Reanimated re-implementation of the morph is optional polish.
Note [[t-0cbm48]] (partial/substring search) is a backend fix that benefits both
clients — worth landing before mobile search ships.

### 4.10 Settings · 252 LOC · **T2, trimmed**

**Mobile builds:** theme toggle, account fields, logout, push-notification
preferences (new). API-key management for the Chrome extension stays web-only —
managing a desktop browser's keys from a phone is not a real workflow.

### 4.11 Auth · **T1**

Login and register screens. `google/callback` is a stub — [[t-0020]] (Google
OAuth) is still open and, if it lands, needs `expo-auth-session` on mobile.
`extension/authorize` is desktop-only. **✕** for the `(web)` marketing surface.

---

## 4.12 Internal layout of the Expo app

Per `expo-project-structure`, which lines up almost exactly with `frontend-next/`:

    mobile/
    ├── src/
    │   ├── app/          # Expo Router — routes ONLY, nothing else
    │   ├── screens/      # screen bodies the routes render; private parts colocated
    │   ├── components/   # reusable UI, kebab-case, one named export
    │   ├── hooks/
    │   ├── utils/        # tests colocated: format-date.ts + format-date.test.ts
    │   └── theme.ts
    ├── app.json
    ├── eas.json
    └── package.json

`@/*` aliases `./src/*`. Same kebab-case, same colocated tests, same `@/` alias as
the web app — the "consistency before novelty" rule is satisfied for free.

## 5. Backend work

Small, which is the point. Everything else is already REST and already
user-scoped.

1. **Native token transport** (§3.2) — new auth mode, no new tables.
2. **Push delivery** ([[t-0009]]) — device-token table, migration, Expo push
   send in the notifications service.
3. **Optional but recommended first:** [[t-0cbm48]] substring search,
   [[t-0010]] async scrape.

---

## 6. Proposed chunks

Dependency-ordered. `‖` marks chunks that can run in parallel.

| # | Chunk | Depends on | Notes |
|---|---|---|---|
| C0 | Foundation — repo structure, Expo scaffold, NativeWind + tokens + fonts, tab shell | — | Blocks everything |
| C1 | Auth — native token mode (backend), secure-store, api-client port, login/register | C0 | Blocks all data |
| C2 | UI primitives — the 16 `components/ui/` equivalents | C0 | ‖ with C1 |
| C3 | Jobs — list, filters sheet, job detail screen, status change | C1, C2 | The big one |
| C4 | Answers library | C1, C2 | ‖ with C3 |
| C5 | Capture — share-sheet target + URL scrape + manual form | C3 | |
| C6 | Reminders + timeline + notifications + **push** | C3 | Backend work inside |
| C7 | Search screen | C3, C4 | |
| C8 | Cover letters + résumés, read/copy | C1, C2 | ‖ with C3 |
| C9 | Profile + personas, read-only | C1, C2 | ‖ with C3 |
| C10 | Settings + polish — deep links, icons, EAS build, store release | all | |

Three parallel lanes open after C1/C2: **C3→C5→C7** (jobs spine), **C4**,
**C8/C9**. C6 joins the first lane once C3 lands.

---

## 7. Explicitly out of scope

- The public `(web)` marketing surface — all seven pages.
- The Chrome extension and its authorize flow.
- Offline-first sync. A TanStack Query read cache is in scope; write queuing and
  conflict resolution are not.
- Kanban drag, résumé/cover-letter generation and refine, profile and persona
  editing, PDF résumé import, API-key management.
- iPad / tablet layouts.


---

## 8. Start here — the next session

Everything below is settled. Nothing in this section needs a decision first.

### Settled decisions

**Still open — ask, never assume:** the tab shape (§3.5). Everything else below
is decided.

| Ref | What |
|---|---|
| `d-0cc01s` | React Native + Expo, not Flutter |
| `d-0cc1x6` | Native token auth in `expo-secure-store`; web keeps cookies |
| `d-0cc24z` | Native chrome for system moments, our tokens for content; NativeWind |
| `d-0cc2vk` | `mobile/` standalone; workspaces on a named trigger |
| `d-0cc2w5` | Android first, on a new `jobvault-mobile` EAS project |

### ⚠️ The user does steps 1–3 themselves

**Sayantan: this is your part. Do not expect the agent to have done it.**

The Expo project and the EAS link both need your own credentials and a browser
login, so they cannot be handed off:

```bash
cd /home/sayantan/Projects/job-vault
npx create-expo-app@latest mobile      # scaffold
cd mobile
npx eas-cli@latest login               # opens a browser — your account
npx eas-cli@latest init                # name it: jobvault-mobile
```

Do **not** reuse the `sayantan-expo` project id from `expo-prompt.md` — that is
onboarding boilerplate (`d-0cc2w5`). Say `jobvault-mobile` when `init` asks.

Once those three commands are done, the agent picks up from step 4.

### C0 — foundation, in order

1. `npx create-expo-app@latest mobile` at the repo root. **(user — see above)** Lay it out per
   `expo-project-structure` (§4.12): `src/app` routes-only, `src/screens`,
   `src/components`, kebab-case, colocated tests, `@/*` → `./src/*`.
2. `npx eas-cli@latest login` — **(user)** it opens a browser. Never ask for or
   type their credentials.
3. `npx eas-cli@latest init` — **(user)** name the project **`jobvault-mobile`**.
   Do *not* reuse `sayantan-expo` (`b8aecc62-4896-4f2c-86ab-d42d261adcba`).
4. NativeWind via the `expo-tailwind-setup` skill. Port the tokens from
   `frontend-next/src/styles/app/theme.css` under **the same names**, so the two
   clients share a vocabulary even while the code is duplicated.
5. Fonts — Geist, Geist Mono, Instrument Serif — through `expo-font`.
6. **⚠️ ASK FIRST:** the Expo Router tab shell. Jobs · Answers · Timeline ·
   Profile is a *proposal* (§3.5), never confirmed. Ask which tabs and in what
   order before building it.

Install native dependencies with `npx expo install`, never raw `npm install`.
**No EAS build without explicit approval** — 10–20 minutes each, against a
monthly quota.

### Which skills to load

`expo-overview` routes; it expects to be read before the leaf skills. Then
`expo-project-structure` (C0), `expo-tailwind-setup` (C0), `expo-router` (C0/C3),
`expo-design-system` (C2), `expo-ui` (C2), `expo-animation` (the FAB morph),
`expo-data-fetching` (C1/C3), `eas-app-stores` (C10).

### Known traps, already paid for

- **socket.io authenticates on the cookie at upgrade.** Native must pass
  `auth: { token }` in the handshake. The failure mode is realtime silently never
  connecting while every REST call works.
- **`authMiddleware` reads the `accessToken` cookie only** — it must also accept
  `Authorization: Bearer`.
- **Native refresh must be selected by input source, not a header.** See
  `d-0cc1x6`; a header-gated mode is an XSS-readable refresh token on the web.
- **`@expo/ui` `List` is not virtualized.** Jobs and answers use
  `FlatList`/`FlashList`.
- **`@gorhom/bottom-sheet` needs `GestureHandlerRootView` at the root** and an
  explicit background style, or it renders invisible.
- **`react-native-web` is incompatible with Turbopack.** Not needed here, but do
  not let a "universal components" idea back in without remembering it costs the
  web app's bundler.

### Worth landing first, on the web side

`t-0cbm48` (partial/substring search) has a written plan at
`docs/superpowers/plans/2026-08-29-partial-substring-search.md`. It is a backend
fix that benefits both clients — cheaper before mobile search (C7) exists than
after.
