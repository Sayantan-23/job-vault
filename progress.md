# JobVault — Progress Tracker

> **Last Updated**: 2026-08-25
> **Legend**: `[ ]` Pending · `[-]` In Progress · `[T]` To Test · `[x]` Done · Items marked ⚡ are on the critical path
>
> **Stitch Design Project**: `projects/15863924105464026227` — [Open in Stitch](https://stitch.google.com/projects/15863924105464026227)
> **Design Style**: Glassmorphism (frosted glass light + matching dark theme) · Subtle animations · Nuxt UI v4

> **2026-07-05 — Legacy folders removed**: the original `backend/` (NestJS) and `frontend/` (Nuxt) reference stacks were deleted now that the Express/Next rebuild is self-sufficient. Original behavior/contracts remain readable via git history. Active code lives only in `backend-express/` + `frontend-next/` (+ `extension/`).

> **Open work lives in `.blink/`, not here** (moved 2026-08-25). This file is the
> **changelog**: what shipped, slice by slice, with commits. The backlog that used
> to be scattered through it — plus `docs/deferred-tasks.md` and
> `docs/polish-and-tech-debt.md` — is now one task file per item in
> `.blink/tasks/`, each re-verified against the code on 2026-08-25.

---

## Public Landing Redesign — v3 "The Vault Collage" (on `landing-page-redesign`, 2026-07-05)

> Plans: `docs/superpowers/plans/2026-06-30-public-pages-landing-redesign.md` (v1) + `2026-07-05-landing-page-deepening.md` (v2) + `2026-07-05-landing-v3-vault-collage.md` (v3). Branch NOT yet merged.
>
> **v3 (owner-driven overhaul after the v2 browser pass):** the drawn circuit/trace concept is **retired** — cohesion now comes from the reference-teardown model (tasteskill/floria/collectiveos/caveman): one warm canvas, one dark inversion with gradient seams, one uniform IO reveal choreography, faithful real-UI mockups, giant ghost wordmark texture. No animation library (Motion/GSAP evaluated and rejected; IO + CSS suffices). Executed via opus subagents, Fable advising.

- [x] v3 T1: demolition — spine, nav seed-trace, footer exit-trace, capture stubs, fork fan, converge, steps rail, hero chain choreography + dead CSS (about 1200 lines removed)
- [x] v3 T2: floating pill nav (page links FAQ/About/Contact/Login + Start free) + light footer with giant ghost JOBVAULT wordmark, link columns, honest "iOS and Android app in development." line; shared `BrandChip`
- [x] v3 T3: **vault-collage hero** — copy stack left, five faithful mini real-UI surfaces right (extension popup, résumé, letter, board column, phone frame + "Mobile · in development" tag) at graded depth with load stagger + floating stat badges; reusable `mini/` component family
- [x] v3 T4: one uniform `.reveal` fade-rise + `--i` stagger across every section (bespoke v2 choreography removed)
- [x] v3 T5: capture section — pixel-faithful 360px popup (TopBar wordmark, Captured-from badge, labeled fields, Save button; **no invented window chrome**) with a CSS-only capture→success beat; source pills one line
- [x] v3 T6: personas — real persona-card structure (name, edit/delete icons, counts line, summary, Generate résumé) + evenly spaced borderless doc list; no drawn fan
- [x] v3 T7: documents — true business-letter letter + single-column ATS résumé (shared mini sheets via `size` prop), TAILORED rubber stamp preserved, refine beat simplified to one CSS swap, exports row kept
- [x] v3 T8: dark Track band = the page's single theme flip — 150px gradient seams, ghost wordmark behind the board, real GhostMeter ticks (Clock/Timer/Ghost + mono days) with company·location lines, watchline type bump, eyebrow removed
- [x] v3 T9: capabilities section deleted (wire-era leftover); word-staggered serif interstitial "Every application, accounted for."; steps strip quieted (mono terms, hairlines between columns only); closing/FAQ verified
- [x] v3 T10+T11: copy pre-flight (zero em/en dashes rendered, 0 eyebrows, CTA-intent lock, mid-dot ration) + responsive/reduced-motion/no-JS audit at 390/720/1024/1440 (fixed hero mobile collapse + interstitial word spacing)
- [x] v3 T12: gates green — typecheck, lint, **539 tests**, production Docker build (`a154d47`); CDP + headless visual review
- [x] **v3.1 owner-feedback round (2026-07-06, commits `44e1362..583556e`)**: `motion` (framer-motion v12) adopted for scroll-linked effects; tactile background (paper-grain bump + hero atmosphere washes + shared `.viz-glow` indigo glows); hero collage rebalanced (266px popup, modern 200x412 phone with dynamic island, status bar, 4-row list + tab bar); how-it-works strip gains numbered chips + lucide icons + connector hairline (Floria pattern); capture beat reworked to a **card stack** (success card lands atop the still-visible capture card); dark Track band rebuilt as an **inset rounded panel** (28px radius, fog seams deleted, inner indigo glow, wordmark seated on the panel's bottom edge, motion scale-in entrance); interstitial scaled to statement size (`clamp(3.5rem,7.5vw,7rem)`); FAQ pluses now lucide `Plus` rotating 45 degrees; **closing CTA + footer merged into a dark finale** with the giant JOBVAULT wordmark band sitting between CTA and link columns (scroll drift via motion). Gates green (typecheck, lint, 539 tests, production Docker build).
- [x] **v3.2 second feedback round (2026-07-07, commits `f45983d..86b16d5`)**: hero headline swapped to "Applications go quiet. *Yours won't*."; background atmosphere bumped one notch (glow 18%, washes 8/9%, grain 0.055); collage restored to the original v3 composition (owner preferred it) while keeping the new card designs, phone widened to 214x441; capture section became an **interactive drag-to-flip deck** (`capture-deck.tsx`, motion drag + spring swap, 120px offset / 500 velocity threshold, "drag to flip" hint, CSS keyframe beat deleted, no-JS renders the stacked state). Gates green incl. production Docker build.

- [x] **Merged to master 2026-07-15** (merge `ea152f1`, `--no-ff`).

## Public Sub-Pages (on `public-pages` worktree branch off master, 2026-07-15 — **merged to master 2026-07-15**)

> The 5 ComingSoon stubs replaced + the missing `/cookies` route added (footer linked it → 404). Built by opus subagents (foundation+FAQ → about ∥ contact ∥ legal×3), Fable reviewing. All server components, zero client JS, no backend changes.

- [x] Foundation: `subpages.css` (`.subpage` frame, header block, mono meta, group label, hairline rule; flex `.shell` so the dark footer reaches the viewport bottom on short pages) + `SubpageHeader` (eyebrow / serif title with `<em>` accent / lede / meta) (`95a93a1`, footer fix `172928f`)
- [x] `/faq` — 16 Q&As in 5 mono-labeled groups (Product & pricing, AI & your data, Documents & export, Extension, Account), landing's `.faq-item` accordion reused, native `<details>`
- [x] `/about` — editorial story: problem prose → 01–05 system flow rows → 3 principle rows → what's-next + CTA (`75f2a58`; fixed inherited `section` padding)
- [x] `/contact` — frontend-only mailto channels (General / Bugs / Privacy & data → `support@jobvault.app` ⚠️ placeholder address, confirm before going live) + FAQ note (`1453e70`)
- [x] `/privacy` `/terms` `/cookies` — shared `LegalDoc`/`LegalSection` "filed document" layout (mono numbers, serif h2, hairlines); plain-language policies drawn from the real data model (bcrypt, Gemini transfer, 3 cookies incl. verified `sidebar`, no analytics/storage/payments); "Last updated · July 15, 2026" (`15a6b6e`)
- [x] Gates: typecheck, lint, 539 tests, production build (all 6 routes static). Browser pass at 1440/390 incl. FAQ open state (playwright).
- [x] **Owner-feedback round (2026-07-15, commits `3659dd2..0fb707d` + about):** web-research pass first (Stripe/Linear/Vercel/PostHog/37signals/Basecamp/iA legal+about+contact surveys, 2 opus agents). Legal/FAQ: **literal document titles** ("Privacy Policy"/"Terms of Service"/"Cookie Policy"/"Frequently asked questions."), left-align kept (survey: nobody centers legal), **"In short" mono summaries** on dense sections, privacy gains the missing standard sections (third-party services, data retention, your rights, children, intl transfers folded into security, contact closer — 11 total); governing-law omitted (no jurisdiction chosen). Contact: rebuilt as **centered oversized-email hero** (mono clamp headline mailto + micro reply-time line + secondary mailto row). About: rebuilt as **centered maker's letter + 4 numbered principles** (Basecamp × Linear Method; serif pull-quote mid-letter, mono signature, statement headline "Built by one person who got tired of the silence."). Gates + 1440/390 browser pass green.
- [x] **Round 2 (2026-07-15, `9f628dd` + `f76b41d`):** the landing's **dark closing finale (ClosingSection + footer) moved into WebShell** — every public page now ends with the CTA band + ghost-wordmark footer (owner's call; "Add to Chrome" repointed `/#extension`, landing page no longer renders its own closing). **About v2** at full `.wrap` width in the landing grammar: two-col header with the reused **mini letter-sheet artifact** (rotated, contact-shadow), letter set against a sticky **mono memo rail** (FROM/RE/DATE), pull-quote promoted to a **full-width interstitial statement**, principles as a **2×2 hairline grid**, page-owned closer deleted (global finale covers it). Gates + 1440/390 pass green.

## Mobile App Nav (on `worktree-mobile-app-nav`, **merged to master 2026-07-15**, merge `5e72dd7`, `--no-ff`)

> First step of the /app responsive sweep. Below `lg` (1024px) the 240px rail rendered at every viewport (~60% of a phone). Built by an opus coder subagent, Fable reviewing; verified in-browser (playwright) at 390/768/1440, light + dark. Frontend-only.

- [x] Rail hidden below `lg`; sticky mobile header (morphing hamburger → X in a soft accent circle, shared `BrandMark` + wordmark, `NotificationBell`, compact avatar-only `AccountMenu` opening downward)
- [x] Google-Keep-style speed-dial nav: 5 icon-disc + label-pill items cascading one-by-one (`--animate-jv-fab-item`, 40ms/item stagger, reduced-motion safe), active disc flat indigo (`border-transparent`)
- [x] Modal-style scrim (`bg-black/40` + blur, reused Sheet/Dialog treatment) dims the whole page *and* header — only the toggle stays above it; closes on outside tap, Escape (refocuses toggle), and route change
- [x] `AccountMenu` gains `compact` + `side` props; `NAV` exported from `sidebar-nav`; desktop ≥1024px pixel-unchanged
- [x] Gates: typecheck, lint, 545 tests (6 new), production build
- **Deferred →** remaining responsive areas (JobDrawer/sheets, board columns, résumé + cover-letter workspaces at narrow widths) — tracked as `t-0025` in `.blink/tasks/`.

### v1 + v2 history (superseded by v3)

- [x] v1: full landing in `(web)/` — warm theme, `landing.css`, WebNav/WebFooter, 6 sections + trace/reveal helpers (commit `ef4f567`)
- [x] v2 T1: dead CTAs wired (`/register`, `#extension`), eyebrows trimmed to budget (3)
- [x] v2 T2: rhythm pass — quieter baseline (2.5%/160px), `--sec-pad`, composed sections
- [x] v2 T3: hero chain recomposed — tighter geometry, 2px wires, fanned sheets, docked Applied card, enriched nodes
- [x] v2 T4: rubber-stamp TAILORED (turbulence erosion + pressure mask + bleed), refine demo (Humanize chip → strikethrough → replacement), exports row (PDF / LaTeX / Overleaf)
- [x] v2 T5: capture popup+pills as one unit with spine stub junctions
- [x] v2 T6: NEW personas fork section — persona node fans into 4 tailored-doc rows
- [x] v2 T7: dark band deepened — full board, freshness legend, watchline timeline strip (5 dated events, pulsing ghost alert)
- [x] v2 T8: capabilities as interactive wiring legend — per-row rail segments, honest mono facts, anchor links
- [x] v2 T9: how-it-works strip (Capture / Generate / Track terminals on one rail)
- [x] v2 T10: inline FAQ (4 native details/summary, honest answers, no /faq link)
- [x] v2 T11: **the connective spine** — one full-page wire threading every section, ink segment through the dark band, 7 junctions; nav seed-trace + footer exit-trace
- [x] v2 T12: mobile (390/720/940) + reduced-motion + no-JS + copy + a11y audit pass
- [x] v2 T13: gates green — typecheck, lint, **539 tests**, production Docker build; CDP-scrolled visual verification

---

## App Redesign — Editorial Workspace Shell (DONE — **merged to master 2026-06-25**, merge `0adb715`, `--no-ff`)

> Re-points the authenticated `/app` surface from a "dashboard" to a calm editorial workspace while keeping the minimalist-ui system intact (the dashboard feel came from framing/chrome, not the palette/type). Plan: `docs/superpowers/plans/2026-06-25-app-editorial-shell-redesign.md`. Approved mock: `docs/mocks/redesign-shell.html` (Before/After + Light/Dark). Frontend-only — no backend/API/DB change. Built + verified with workflows (build fan-out → 4-lens adversarial review → fix fan-out). 9 commits `afda7f8..154e216`.

- [x] **9a Foundations** — editorial serif swapped Instrument Serif → **Newsreader** (`--font-serif`); new `--hairline` divider token; new primitives `PageHeading` (in-content editorial header), `InlineStats` (quiet stat line), `AppPage` (centered editorial column).
- [x] **9b Shell de-chrome** — sidebar **dissolved** into the canvas (no panel fill/border/dividers/logo cell); the global bordered **top utility bar removed** (all 7 content pages migrated to `PageHeading` inside `AppPage`); **Dashboard KPI page deleted** → `/app/jobs` is home (`/app/dashboard` redirects, login lands on Jobs); **Notifications moved into the rail** (unread dot, routes to `/app/jobs?job=`).
- [x] **9c Jobs editorial home** — dense uppercase table → grouped **borderless `JobList`** ("Needs your attention" [gated to APPLIED/INTERVIEWING, server-sort-truthful, `<h2>` group labels] / "In progress"); inline `PageHeading` + `InlineStats` + relocated sort/status/date into a slim `JobsListControls` row; **board kept but quieted** (hairline columns, plain-case labels, de-emphasised counts); `PageHeader` + `JobsTable` deleted.
- [x] **9d De-box + polish** — settings/persona cards and the résumé/cover-letter `DocumentList` → hairlines (no boxes); **editorial serif empty states** (Jobs/Timeline/Personas); dead `NotificationBell` + `DashboardSkeleton` removed; route loading skeletons reworked to the borderless `AppPage` shape (no more top-bar flash).
- [x] **Gates green:** typecheck + lint + **513 tests** + **production build** (`docker build --target production`). Adversarial review surfaced 8 fixes (all applied); the prod build caught a layout `useSearchParams` Suspense break (fixed).
- [x] **Post-plan follow-ups** (same branch): single **centered 1240px app frame** (one content width, centered; sidebar in-frame) replacing the inconsistent per-page widths; **window-edge scrollbar** (`main` runs to the viewport edge, the sidebar carries the left gutter; thin on-theme `.app-scroll`); **collapsible icon rail** (240↔56px, content widens 1000↔1184, frame total constant; cookie-persisted + pre-paint, hover-revealed right-edge handle). Mock: `docs/mocks/centered-shell.html`.
- [x] **Merged to master** 2026-06-25 (merge `0adb715`, `--no-ff`; 15 commits `afda7f8..b94f49e`). Local master ahead of `origin/master` (user pushes).

## Migration Slice 8 — Chrome Extension (DONE — merged to master 2026-06-22, merge `2fae798`)

> Branch `slice-8-chrome-extension` (merged `--no-ff`). Plan: `docs/superpowers/plans/2026-06-20-slice-8-chrome-extension.md`. One-click "Save to JobVault" from LinkedIn/Indeed/most boards, with a smooth `launchWebAuthFlow` connect (no key copy-paste) and client-first extraction (the extension reads the live, logged-in DOM, sidestepping the bot-walls that force the server's render+AI fallback).

- [x] **Backend — `api-keys` module** (migration `0011`): `api_keys` table (bcrypt `keyHash`, indexed `keyPrefix`, soft-revoke), cookie-authed mint (raw `jv_` key shown once) / list / revoke, + `apiKeyMiddleware` verifying the `X-API-Key` header (prefix-narrow → bcrypt compare → `req.apiKey`). 21 tests.
- [x] **Backend — `extension` module** (`X-API-Key`): `verify-key`, `check-url` (dedup probe), `quick-create` (normalize URL via `normalizeJobUrl` → dedup via new `jobsRepository.findBySourceUrl` → WISHLIST job + "Added via Chrome Extension" auto-timeline; `jobsService.create` gained an optional `autoEntryTitle`), `scrape` fallback. 24 tests.
- [x] **Web — Settings → Connected apps**: list/revoke (via `useConfirm`) + manual-key backstop with one-time reveal (`use-api-keys`).
- [x] **Web — public `/extension/authorize`**: validates the `chromiumapp.org` redirect, mints a key, hands the token back in the URL **fragment**; logged-out users get inline sign-in/sign-up (`InlineAuthForm`) in the same window; `useOptionalCurrentUser` checks the session without forcing a `/login` redirect. 25 web tests.
- [x] **Extension project** (`extension/`, React 19 + Vite + Tailwind v4 + crxjs MV3): content-script extractors (LinkedIn split-pane-scoped, Indeed `data-testid`, generic schema.org/OG) + detector + canonical-URL + confidence; `chrome.storage` / `X-API-Key` API / `launchWebAuthFlow` libs; popup (Connect / Capture / Success / Settings) + background connect driver. typecheck + 22 vitest tests + `vite build` → loadable `dist/` all green.
- [x] **Adversarially reviewed** (4-lens + verification): 6 fixes applied — authorize-page silent refresh, dropped `salaryRange`, over-broad LinkedIn company selector, connect-cancel UX, array `jobLocation`, removed unused `scripting` permission.
- [x] **Decisions:** no cookie weakening (runtime uses `X-API-Key`, only same-origin mint uses the cookie); security via `state` nonce + redirect allowlist + fragment-only token + interactive consent; popup-only; LinkedIn/Indeed client + generic→backend-scrape.
- [x] **Live-smoked + merged.** Post-implementation fixes during the user's browser pass: connect URL → web-app origin `:8080` (was wrongly the backend); **on-demand live-DOM extraction on _any_ site** (Naukri/Greenhouse/… via `chrome.scripting` + `activeTab`, dropping the declared content_scripts and the reload-after-install caveat); descriptions converted to clean **Markdown** (ported the backend's Turndown + sanitizer) with **decorative-bold stripping** for Naukri's over-`<strong>`'d markup. Final gates: 600 backend + 522 web + 29 extension tests. Now 600/522/29 (1151) green.
- **Deferred follow-ups →** now tracked in `.blink/tasks/`: pin the extension `key` (`t-0012`), real logo icons (`t-0013`), per-site extractors (`t-0014`), on-page overlay (`t-0015`), Web Store packaging (`t-0016`). Public-pages redesign has since shipped (merged 2026-07-15); Google OAuth is `t-0020`, email reminders `t-0001`.

## Migration Phase 0a — Backend Express Scaffolding (NEW)

> **Plan**: `docs/superpowers/plans/2026-04-26-phase-0a-backend-express-scaffolding.md`
> **Spec**: `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md`

- [x] backend-express scaffolded (Express 5 + Drizzle + Pino + Zod + TS strict)
- [x] /api/health responds 200 under Docker Compose
- [x] Root docker-compose.yml runs postgres + backend-express

## Migration Phase 0b — Frontend Next.js Scaffolding (NEW)

> **Plan**: `docs/superpowers/plans/2026-05-05-phase-0b-frontend-next-scaffolding.md`
> **Spec**: `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md`

- [x] frontend-next scaffolded (Next.js 15 + React 19 + Tailwind v4 + TanStack Query + TS strict)
- [x] Theme isolation skeleton (web/auth/app route groups with scoped CSS vars)
- [x] /, /about, /login render under Docker Compose; /app/dashboard redirects to /login
- [x] /api/* proxies through frontend-next to backend-express
- [x] Root docker-compose.yml runs postgres + backend-express + frontend-next

## Migration Slice 0 — Foundation (Design System + App Shell + Backend Schema) (NEW)

> **Plan**: `docs/superpowers/plans/2026-06-01-slice-0-foundation.md`
> **Spec**: `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md`
> **Design**: minimalist-ui — warm-stone base, flat muted-indigo accent, mono numerics, dark-mode first-class

### Frontend design system
- [x] Geist + Geist Mono fonts wired in root layout
- [x] App theme tokens (warm-stone + muted indigo + dark mode) scoped to `[data-theme-scope="app"]`
- [x] Status palette (`--ghost-active/stale/ghosted`) bridged into Tailwind; reserved for health only
- [x] Ghost threshold logic (`lib/ghost.ts`: active ≤7, stale ≤14, ghosted >14)
- [x] GhostMeter signature component (mono numerics, color + icon per level)
- [x] StatusChip signature component (6 statuses; neutral + indigo ramp, **not** the health palette)
- [x] Minimalist AppShell (sidebar nav: Dashboard/Timeline/Settings + header)
- [x] Web placeholder pages via ComingSoon (about/faq/contact/privacy/terms)

### Backend
- [x] Drizzle `users` table mirroring the NestJS User entity (12 columns, unique email/googleId)
- [x] Migration generated (`0000_new_spectrum.sql`) and applied to Postgres (verified `\d users`)

### Verification
- [x] Frontend: typecheck + lint + test (27) + build — all green
- [x] Backend: typecheck + lint + test (27) — all green
- [x] Adversarial multi-lens review run; semantic-color violation found and fixed, tests hardened
- [x] Merged to master. Manual browser smoke (`/app/dashboard` light/dark, `/about` placeholder) never recorded — folded into the QA sweep `t-0026`.
- [x] Slice 2 (Jobs): `drizzle.config.ts` schema path generalized to the `src/db/schema/index.ts` barrel

## Migration Slice 1 — Authentication (email/password) (NEW)

> **Plan**: `docs/superpowers/plans/2026-06-02-slice-1-auth.md`
> **Spec**: `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md`
> **Auth model**: custom JWT in HTTP-only cookies (the intentional change from NestJS Bearer-in-body). Google OAuth deferred. No new migration (reuses Slice 0 `users`).

### Backend (`backend-express`)
- [x] JWT + bcrypt(12) token helpers; `Request.user` augmentation
- [x] Zod `validate` middleware + JWT-cookie `authMiddleware`
- [x] Auth Zod schemas + `toPublicUser` (strips passwordHash/refreshTokenHash)
- [x] Drizzle auth repository (real-Postgres tested)
- [x] Auth service: register/login/refresh/logout/profile — bcrypt 12, refresh rotation + reuse detection
- [x] Cookie helpers (accessToken path `/` 15m, refreshToken path `/api/auth` 7d), controller, router (+ auth rate-limit), wired under `/api/auth`
- [x] HTTP integration tests (Supertest): all 6 endpoints + cookie-flag assertions

### Frontend (`frontend-next`)
- [x] `Input` + `Label` primitives
- [x] Auth Zod schemas + `AuthUser` type
- [x] `useAuth` hooks (current user / login / register / logout via TanStack Query)
- [x] `LoginForm` + `RegisterForm` (RHF + Zod, minimalist design) + server-error alerts
- [x] Real `/login` + `/register` pages; `LogoutButton` in app header

### Verification
- [x] Backend: typecheck + lint + test (72) — all green
- [x] Frontend: typecheck + lint + test (43) — all green
- [x] Adversarial multi-lens review (auth-security & contract-parity clean); test-coverage gaps then closed
- [x] End-to-end smoke on the Docker stack: register→201+cookies, /me→200, login→200, dup→409, wrong-pw→401, `/login` renders the real form — all via the `:8080` browser proxy path
- [x] **Automatic token refresh — DONE** (`fix(auth): silent token refresh`, branch `fix-auth-silent-refresh`): the `api-client` now retries once on a 401 via `/api/auth/refresh` with a **single-flight** guard (so rotation never races), `middleware.ts` gates `/app/*` on **either** cookie (an expired access token + live refresh token is recoverable, not a logout), the refresh cookie is widened to `Path=/`, and `useJobs` refetches on mount. Sessions now roll forward across days of active use instead of ending at 15 minutes. Live-smoked through the `:8080` proxy.

## Migration Slice 2 — Jobs (CRUD + scraper + AddJobModal/JobDrawer) (NEW)

> **Plan**: `docs/superpowers/plans/2026-06-02-slice-2-jobs.md`
> **Spec**: `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md` (§9 Slice 2 resolutions)
> **Decisions**: Cheerio+Turndown scraper with an optional `fallback` seam (Gemini deferred to the AI slice); JobDrawer driven by the `?job=<id>` query param on a new `/app/jobs` page; `drizzle.config` points at the schema barrel; `status` is a pgEnum.

### Backend (`backend-express`)
- [x] `jobs` table (pgEnum `job_status`, FK→users cascade, 4 indexes) + migration `0001_stiff_scorpion`; `drizzle.config` generalized to the `index.ts` barrel (run via the `tsx` loader so drizzle-kit resolves NodeNext `.js` imports)
- [x] Job Zod schemas (create/update/move/scrape/query) + inferred types
- [x] HTML→Markdown (Turndown) + Cheerio scraper (JSON-LD + LinkedIn/Indeed/Greenhouse/Lever + generic) with optional `fallback` seam — no `@google/genai` dependency
- [x] Jobs repository (user-scoped CRUD, ILIKE search, status/ghost filters, per-status kanbanOrder) — real-Postgres tested
- [x] Jobs service (NOT_FOUND on missing/non-owned; scrape errors → VALIDATION_ERROR) + controller + router under `/api/jobs`
- [x] HTTP integration tests (Supertest): list+meta, filter-forwarding, create (+optional fields), scrape preview-only + 401, GET/PATCH/move/delete, 404 + validation 400s
- [x] Fixed a latent shared bug: `validate` middleware now persists coerced/defaulted `query`/`params` via `Object.defineProperty` (Express 5's `req.query` getter swallowed the old `Object.assign`)

### Frontend (`frontend-next`)
- [x] `Job`/`ScrapeResult` types + job Zod schemas
- [x] Radix Dialog/Sheet + Textarea/Select primitives
- [x] `use-jobs` hooks (list/single queries + create/scrape/update/delete)
- [x] JobSnapshot (react-markdown), ManualJobForm, UrlPasteForm, AddJobModal (URL + manual tabs)
- [x] JobDetails (status/notes/delete, guarded status cast), JobDrawer (URL-driven over `?job=`), JobsBoard (list + add)
- [x] `/app/jobs` page (SSR initial fetch, Suspense-wrapped) + "Jobs" nav item

### Verification
- [x] Backend: typecheck + lint + test (124) — all green
- [x] Frontend: typecheck + lint + test (73) + Docker production build — all green
- [x] Adversarial six-lens review (security/contract/strict-TS/scraper/test-faithfulness/design); coverage gaps closed, status cast hardened
- [x] Live end-to-end smoke on the Docker stack (via `:8080` proxy): register→201, create→201, list→`{data,meta}`, scrape `example.com`→ScrapeResult (preview-only, no persist)
- [x] **Resolved:** the timeline auto-entries deferred here landed with Slice 4 — job create/status-change write timeline events today.
- [x] Merged to master. Manual browser pass (Add-Job modal tabs, drawer deep-link + Back, dark mode) never recorded — folded into `t-0026`.

## Migration Slice 3 — Dashboard & Kanban (NEW)

> **Plan**: `docs/superpowers/plans/2026-06-02-slice-3-dashboard-kanban.md`
> **Spec**: `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md` (§9 Slice 3 resolutions)
> **Decisions**: dedicated `/api/dashboard/kanban`+`/stats` (because `/api/jobs` is paginated); fractional-float `kanbanOrder` on drop; `@dnd-kit` + optimistic `useMoveJob` (snapshot rollback); ghost-days **derived live** from `lastActivityAt`; reuse the JobDrawer on the dashboard; ViewToggle deferred to Slice 5.

### Backend (`backend-express`)
- [x] `dashboard` module: query schema (search `.max(255)`) + response types, pure ghost-derivation helpers, repository (all user jobs, kanbanOrder order), service (grouping + derived-ghost stats), controller/router under `/api/dashboard`
- [x] `GET /api/dashboard/kanban` (6 columns + filtered stats) and `GET /api/dashboard/stats` (global) — user-scoped, auth-guarded
- [x] HTTP integration tests (Supertest) + real-DB repository test

### Frontend (`frontend-next`)
- [x] `@dnd-kit` installed; dashboard types + shared query keys; pure kanban helpers (`lib/kanban.ts`) — unit tested
- [x] `use-dashboard` (kanban query + optimistic `useMoveJob`); job edits/deletes also refresh the board
- [x] StatCard + DashboardStats (5 cards); sortable KanbanCard (tap-to-open vs drag, 6px threshold), droppable KanbanColumn, KanbanBoard (drag + snapshot rollback)
- [x] JobDrawer close generalized to the current page (reused on the dashboard via `?job=`)
- [x] DashboardView + `/app/dashboard` page (SSR initial board, Suspense)

### Verification
- [x] Backend: typecheck + lint + test (150) — all green
- [x] Frontend: typecheck + lint + test (105) + Docker production build — all green
- [x] Adversarial six-lens review (security/contract/strict-TS/ghost-derivation/dnd-optimistic/test-faithfulness); search capped + StatCard & drag-vs-tap tests added
- [x] Live end-to-end smoke on the Docker stack: kanban groups the 6 columns with **derived ghost-days**; `/stats` global; a `/move` (APPLIED→OFFER) persists into the board
- [x] **Resolved:** ghost-days are still derived live, and move events *do* write timeline entries since Slice 4.
- [x] Merged to master. Manual browser pass (drag-and-drop, card → drawer, dark mode) never recorded — folded into `t-0026`.

### Slice 3.5 — Jobs Workspace + Overview Dashboard (2026-06-03)
- `/app/jobs` is now the unified workspace with a **Board ⇄ List** toggle (default List, `?view=board|list`, shareable; preserves `?job=`).
- `/app/dashboard` is a **stats-only overview** (`GET /api/dashboard/stats`); the board + drawer moved to the workspace.
- New `ui/SegmentedControl`; extracted `JobsList`; new `DashboardOverview`; new `lib/dashboard-defaults` (`EMPTY_STATS`/`EMPTY_BOARD`); removed `JobsBoard`/`DashboardView`.
- `useStats` hook added; job create/update/delete + move now invalidate the stats key; kanban card preserves `?view` when opening the drawer. **No backend changes.** (Spec §9 → "Slice 3.5 resolutions".)
- [x] Frontend: typecheck + lint + test (116) + Docker production build — all green; backend typecheck — green.
- [x] Adversarial six-lens review (behavior-parity/strict-TS/dead-code/test-quality/conventions/data-flow); coverage gaps closed (view→List clean-URL, job-mutation cache invalidations, useStats initialData isolation).
- [x] Merged to master. Manual browser pass (Board⇄List toggle, `?view=` survives refresh, stats) never recorded — folded into `t-0026`.

## Migration Slice 4 — Timeline + Reminders + Notifications + Real-time (NEW) (2026-06-04)

> **Spec**: `docs/superpowers/specs/2026-06-03-slice-4-timeline-reminders-notifications-design.md` (+ app-redesign §9 "Slice 4 resolutions").
> **Plans**: `docs/superpowers/plans/2026-06-03-slice-4{a,b,c}-*.md`. Built as 3 sub-slices on branch `slice-4-timeline-reminders-notifications` (56 commits; **not yet merged to master**).

**Slice 4a — Timeline + auto-events**
- [x] `timeline_events` table (migration `0002`; `userId`+`jobId` cascade, `type` AUTO|MANUAL, `title`, nullable `description`) + `timeline` module (router→controller→service→repository→Zod). `GET`/`POST /api/jobs/:jobId/timeline` (ordered `createdAt DESC`; manual POST bumps `lastActivityAt`).
- [x] `jobs.service` emits AUTO events on **create** ("Job added to vault") and **status-change** on PATCH + move ("Status changed to {new}"), as a logged follow-on write (never rolls back the job mutation).
- [x] Frontend `useTimeline`/`useAddTimelineEntry` (optimistic prepend + 5-key invalidation) + `TimelineSection` in the JobDrawer. **Live smoke verified** end-to-end.

**Slice 4b — Reminders + Notifications + node-cron + ghost-filter fix**
- [x] `reminders` (`message`/`remindAt`/`isCompleted`) + `notifications` (`type` enum; `relatedJobId` **ON DELETE SET NULL**) tables (migration `0003`) + both modules. Notifications route order `read-all` before `:id/read`; unread derived client-side.
- [x] `node-cron` scheduler (system-wide repo + pure sweeps): **reminder sweep `*/5`** (due → REMINDER notification, idempotent) and **daily ghost sweep** (persists `ghostDays` as a bookkeeping anchor only; fires GHOST_ALERT once per 7/14-day crossing — two independent ifs). Started after `app.listen()` gated by `ENABLE_SCHEDULER`, stopped before `server.close()`, never in `createApp`; safe-boolean env parse.
- [x] **Fixed the latent `/api/jobs?ghostFilter` bug** — now derives ghost-days live in SQL (shared `GHOST_STALE_DAYS`/`GHOST_GHOST_DAYS` constants in `src/shared/ghost.ts`), matching the dashboard.
- [x] Frontend `use-notifications`/`use-reminders` hooks, `ui/popover` primitive, NotificationBell (in page headers) + RemindersSection (in JobDrawer). **Live smoke verified**: reminders CRUD, ghost-filter, both cron sweeps → notifications, read-all.

**Slice 4c — Real-time delivery (socket.io)**
- [x] socket.io gateway on the shared `http.Server` (cookie-auth `io.use()` handshake → per-user rooms); `emitToUser` seam in `notificationService.create`; `index.ts` runs **both** scheduler + socket lifecycles (gated by `ENABLE_SCHEDULER`/`ENABLE_REALTIME`, off in test). Frontend `socket.io-client` singleton + `RealtimeProvider` (pushes into the `NOTIFICATIONS_KEY` cache, dedupe-by-id, StrictMode-safe). **No app-level polling** (`useNotifications` = `staleTime 30s` + focus-refetch fallback). *(This overrides the migration spec §11.1 "real-time deferred / polling" baseline.)*
- [x] Next `/socket.io` proxy fixed (`skipTrailingSlashRedirect` + exact-slash rewrite — the handshake needs the trailing slash); dashboard page wrapped in `Suspense` for the header bell's `useSearchParams` (caught by the production build).
- [x] **Real-time verified end-to-end**: a socket.io client through the Next proxy received the cron-pushed REMINDER notification the instant the in-process `*/5` cron fired.

**Gates (all green):** backend `typecheck`+`lint`+**248 tests**; frontend `typecheck`+`lint`+**164 tests**+**production Docker build**. Per-chunk implementer→ground-truth-gate→adversarial-review loop; final whole-slice review APPROVE. No `git push`, no "Claude" in commit messages.
- **Deferred backlog →** moved to `.blink/tasks/` (2026-08-25): email delivery `t-0001`, recurring reminders `t-0002`, soft-delete/`completedAt` `t-0003`, `STATUS_CHANGE`/`GENERAL` `t-0004`, `/unread-count` `t-0005`, retention `t-0006`, WS-upgrade proxy `t-0007`, Redis adapter `t-0008`, push `t-0009`. The global activity feed shipped 2026-06-17.
- [x] Merged to master. Manual browser pass never recorded — folded into `t-0026`.

## Migration Slice 5 — Filters + Search + List View (NEW) (2026-06-04)

> **Spec**: `docs/superpowers/specs/2026-06-04-slice-5-filters-search-list-design.md`
> **Plan**: `docs/superpowers/plans/2026-06-04-slice-5-filters-search-list.md`
> Built on branch `slice-5-filters-search-list` (**not yet merged to master**). Orchestrated via the `Workflow` tool: 4 sequential TDD batches → ground-truth gate → 5-lens adversarial review → review-fix pass.
> **Decisions**: filters on **both** views, **server-driven** (zero backend changes — `GET /api/jobs` and `GET /api/dashboard/kanban` already filter/sort/paginate; ghostFilter fix shipped in Slice 4b); URL-synced via a single `useJobFilters` (+ shared pure `parseFilters`); list toolbar search with **Cmd/⌘K** focus; **borderless aligned** sortable list (not a spreadsheet table); **hybrid board drag** (cross-column status moves stay enabled while filtered, within-column reorder suppressed) via pure `resolveDrop`.

### Frontend (`frontend-next`)
- [x] `types/filters.ts` + pure `lib/filters.ts` (`parseFilters`/`isFiltered`/`buildListQuery`/`buildBoardQuery`); filter-encoded query keys (`jobsListKey`/`kanbanKey`) nested under existing prefixes so current invalidations still match; `apiClient/apiServer.getPage` preserve pagination `meta` (incl. through the 401-refresh retry); `useDebouncedValue`; `shortDate`.
- [x] `useJobFilters` (URL↔filter source of truth — clean-URL + reset-page rules, preserves `view`/`job`); filter-aware `useJobs` (→ `{data, meta}`, `keepPreviousData`) + `useKanban` (search+ghost, gated to the board view).
- [x] `SearchInput` (debounced + Cmd/⌘K + clear, loop-safe vs external value changes), `SortControl`, `JobsToolbar` (per-view controls + reset), `JobsTable` (sortable borderless list with responsive columns, replaces `JobsList`), `JobsPagination`, `ReorderPausedHint`.
- [x] Hybrid board drag (`resolveDrop` pure helper; controlled `KanbanBoard` writing the active `kanbanKey`; restores snapshot on unresolved/cancelled drops); `JobsWorkspace` owns both queries; `page.tsx` SSR-seeds the filtered list/board from URL params (array-param safe) for deep links.

### Verification
- [x] Frontend: typecheck + lint + **216 tests** + **production Docker build** — all green.
- [x] Adversarial 5-lens review (strict-TS/cache-keys · URL-sync/data-flow · hybrid-drag · test-faithfulness · design/a11y/conventions); fixes applied: search-input debounce loop, responsive table columns, unresolved-drop snapshot restore, dynamic sort aria-label, list-view board-fetch gating, +getPage-refresh / setSort-toggle / active-arrow / skeleton tests.
- **Note — known testing boundary:** dnd-kit drag is not exercised at the component level (jsdom can't resolve drop targets); the drop decision is covered exhaustively by `resolveDrop` unit tests + the live smoke. The Ghost column shows the `GhostMeter` ("Nd") rather than a separate relative-activity label (accepted simplification).
- [x] Merged to master. Manual browser pass (search/sort/paginate/reset, deep-link SSR, hybrid drag while filtered) never recorded — folded into `t-0026`.

### Slice 5 follow-up — List column filters (Notion-style) (2026-06-04)
> **Spec**: `docs/superpowers/specs/2026-06-04-list-column-filters-redesign-design.md` · **Plan**: `docs/superpowers/plans/2026-06-04-list-column-filters-redesign.md`. Orchestrated via the `Workflow` tool (sequential TDD batches → ground-truth gate → 5-lens adversarial review → review-fix pass).
- Filters moved off the header onto the columns: **Search + Activity** are the only header controls; **Status** filter + **Added date-range** live in per-column hover **funnels** (new `@radix-ui/react-popover` anchored popover, `StatusFilterMenu`/`DateRangeMenu`); tap a column to sort with a **3-state cycle** (asc → desc → off→default `createdAt` desc; Added toggles).
- Backend (additive, no migration): `createdFrom`/`createdTo` on `GET /api/jobs` (schema + repo SQL, UTC day boundaries, end-of-day-inclusive `createdTo`).
- `isFiltered` split into `isBoardFiltered` (search+ghost) and `isListFiltered` (all list filters) — also fixes the earlier nit where a status-only filter paused board reordering. `SortControl` + `SORT_OPTIONS` removed. `jobsListKey` extended with the date params so the Added filter refetches; SSR `FILTER_PARAMS` includes `from`/`to`.
- [x] Backend typecheck+lint+tests; frontend typecheck+lint+**231 tests** + Docker prod build — all green. Adversarial 5-lens review; blockers (date in cache key, exactOptional build break) + major (SSR date params) + cleanups fixed.
- [x] **Resolved 2026-08-25:** the Status/Date funnel menus *do* auto-close on apply and clear (`jobs-filter-menu.tsx:66,74`). Merged to master; the manual pass is folded into `t-0026`.

## Migration Slice 6 — File Storage + AI / Gemini (**re-scoped**) (2026-06-05)

> **Spec**: `docs/superpowers/specs/2026-06-05-slice-6-ai-resume-cover-letter-design.md`. **Re-scope** (vs the original BE-06/07 roadmap): **no file storage** (Cloudinary/Multer/PDFKit/resume-upload-parsing all dropped) — everything persisted is **text/JSON in Postgres**; PDFs render **client-side** (react-pdf), never stored. The AI emits **content as JSON/Markdown**, the app owns formatting in code → a `.tex` (Copy/Overleaf) and a PDF both derive deterministically with **zero backend rendering toolchain**. Built as 3 sub-slices (6a/6b/6c) on branch `slice-6-ai-resume-cover-letter` (**merged to master 2026-06-06**).

**Slice 6a — Personas + Gemini foundation (DONE)**
> **Plan**: `docs/superpowers/plans/2026-06-05-slice-6a-personas-gemini-foundation.md`. Orchestrated via the `Workflow` tool: sequential per-task TDD implementation → solo ground-truth gates → 5-lens adversarial review → review-fix → live smoke.
- [x] Backend: `@google/genai` Gemini wrapper (`isAiEnabled`/`generateText`/`generateStructured` — structured-JSON output, Zod-validated, output-typed generic; provider errors wrapped, **429/quota → `RATE_LIMITED`**); shared `ResumeContent` schema (mapped from the example `.tex`); `GET /api/ai/status` → `{ enabled, maxPersonas }`; `personas` table (migration `0004`) + module (router→controller→service→repository→Zod) with cap enforcement + AI-structuring; env knobs `GEMINI_API_KEY`/`GEMINI_MODEL`(default `gemini-3.5-flash`; `gemini-2.0-flash` is deprecated)/`AI_RATE_LIMIT_PER_HOUR`/`MAX_PERSONAS`; new `SERVICE_UNAVAILABLE` (503) code.
- [x] Frontend: `Persona`/`ResumeContent` types + `usePersonas`/`useAiStatus` hooks; reusable **`ResumeContentEditor`** (text · add/remove bullets · remove entry — extended in 6b); `CreatePersonaWizard` (paste résumé/notes → AI-structure); `/app/personas` page + workspace (cap counter, AI-disabled state) + **Personas** sidebar nav.
- [x] **Gates green:** backend `typecheck`+`lint`+**289 tests**; frontend `typecheck`+`lint`+**246 tests**+**production Docker build**. Adversarial 5-lens review (0 blockers; majors/minors fixed: Gemini error-wrap, output-typed generic, GET `/:id` + `ai/status`-enabled tests, frontend `fields` contract, spec §7 reconciled).
- [x] **Live smoke (Docker, real key):** `/api/ai/status` → `enabled:true`; auth + Gemini call reach the provider and the error path maps a real provider **429 → clean `RATE_LIMITED`** (no leak). **Note:** actual persona creation is blocked only by the test key's quota (`limit: 0` for `gemini-2.0-flash` on free tier) — a key/billing matter, not a code defect.
**Slice 6b — Résumé generation (DONE)**
> **Plan**: `docs/superpowers/plans/2026-06-05-slice-6b-resume-generation.md`. Orchestrated via the `Workflow` tool: sequential per-task TDD → solo gates → 5-lens adversarial review → review-fix → live smoke.
- [x] Backend: `generated_resumes` table (migration `0005`); pure **`.tex` deriver** (`renderResumeTex`, golden-tested vs the user's template, **single-pass LaTeX-escape** + `escapeLatexUrl` for `\href` args + `**bold**`→`\textbf`); `buildResumePrompt` (persona-only **or** persona+job, no-invent guardrail); **DB-derived hourly rate limit** (`ai-usage.repository` + `assertWithinRateLimit`, spent **after** ownership checks); `resumes` module — `POST /api/resumes` (generate, rate-limited, persona+job ownership), `GET ?jobId=`, `GET/:id`, **`GET /:id/tex`**, `PATCH/:id`, `DELETE/:id`.
- [x] Frontend: `@react-pdf/renderer` (ESM → `transpilePackages` in `next.config.ts`); **`ResumeDocument`** (react-pdf, mirrors the `.tex`, `splitBold` bold runs, project URLs); extended **`ResumeContentEditor`** to projects/skills/education; `useResumes` hooks; live **PDF preview** (`PDFViewer`, dynamic ssr:false) + structured editor + **Copy LaTeX · Open in Overleaf · Download PDF** (`PDFDownloadLink`); `/app/resumes` workspace reached from a persona's **Generate résumé** link.
- [x] **Gates green:** backend `typecheck`+`lint`+**317 tests**; frontend `typecheck`+`lint`+**259 tests**+**production Docker build** (build fix: transpile the ESM-only react-pdf). Adversarial 5-lens review (3 blockers + 4 majors fixed: LaTeX URL/email escaping, escapeLatex double-escape, rate-limit-after-ownership, react-pdf project URL + `'use client'`; security scoping rated clean).
- [x] **Live smoke (Docker, real key):** persona→résumé→`.tex` end-to-end on Gemini (validated on `gemini-2.5-flash-lite` when `gemini-3.5-flash` was transiently overloaded; the path is model-agnostic). `GEMINI_MODEL` restored to `gemini-3.5-flash`.
- **Note — known boundaries:** react-pdf renders to PDF not the DOM, so `ResumeDocument`/preview/download are covered by `splitBold` units + element-build smoke + the live manual smoke (no `pdf()` in CI). The job-tailored résumé caveat is **resolved** — the JobDrawer launcher wired in with 6c.

**Slice 6c — Cover letters + JobDrawer wiring (DONE)**
> **Plan**: `docs/superpowers/plans/2026-06-06-slice-6c-cover-letters-jobdrawer.md`. Orchestrated via the `Workflow` tool: sequential per-task TDD → solo gates → 5-lens adversarial review → review-fix → live smoke.
- [x] Backend: `cover_letters` table (migration `0006`; `userId`+`jobId` cascade, `personaId` **ON DELETE SET NULL**); `buildCoverLetterPrompt` (Markdown letter, per job + persona + instructions, no-invent guardrail, via `generateText`); **rate-limit count now sums résumés + cover letters** (`ai-usage.repository`, shared hourly budget); `cover-letters` module — `POST /api/cover-letters` (generate; **job + persona ownership** then rate-limit), `GET ?jobId=`, `GET/:id`, `PATCH/:id`, `DELETE/:id`. (`personaId` is **required** at generation — a letter is drawn from a persona; spec §7 corrected to match.)
- [x] Frontend: `CoverLetter` type + `useCoverLetters` hooks; `CoverLetterEditor` (textarea + **react-markdown** preview + Copy text + Download PDF via a react-pdf paragraph doc); job-tailored résumé wired via **`?job=`** in the workspace; **JobDrawer** gains a **Résumé launcher** (deep-links `/app/resumes?job=…`) and an in-drawer **Cover-letter section** (persona pick → generate → edit/preview → copy/PDF/save).
- [x] **Gates green:** backend `typecheck`+`lint`+**334 tests**; frontend `typecheck`+`lint`+**267 tests**+**production Docker build**. Adversarial 5-lens review (security/scoping rated clean, rate-limit-after-ownership confirmed); the only substantive finding was a spec-vs-code `personaId` optionality mismatch → resolved by correcting the spec (impl was right) + a `bodyMarkdown` max-length guard.
- [x] **Live smoke (Docker, real key):** persona + job → cover letter generated on Gemini (tailored 1243-char Markdown letter naming the role/company), list-by-job works. (Validated on `gemini-2.5-flash-lite`; `GEMINI_MODEL` restored to `gemini-3.5-flash`.)

### ✅ Slice 6 complete (6a + 6b + 6c) — branch `slice-6-ai-resume-cover-letter`
Personas (AI-structured backgrounds) → tailored **résumés** (LaTeX `.tex` + client-side react-pdf preview/PDF, persona-only or job-tailored) → per-job **cover letters** (Markdown + PDF), all on **Gemini 3.5 Flash**, **zero file storage** (text/JSON in Postgres; PDFs render client-side), shared DB-derived hourly rate limit, env-gated. Migrations `0004`–`0006`. **Merged to master 2026-06-06** (+ persona/résumé UI polish: card grid + edit sheet, full-width-controls/sticky-preview résumé workspace, job-picker on the résumé form, PDF name/contact gap fix). Local master is ahead of `origin/master` — user pushes.
- [x] Merged to master. Remaining backlog moved to `.blink/tasks/` — Chrome extension shipped (Slice 8), public pages shipped, Google OAuth `t-0020`, email delivery `t-0001`.
- [x] **Follow-up (user-requested 2026-06-06): Personas + User Master-Profile redesign — brainstormed + approved.** See **Slice 7** below (design spec + 7a/7b plans). Brief `docs/superpowers/specs/2026-06-06-personas-profile-redesign-brief.md` superseded by the design spec `…-personas-profile-redesign-design.md`.

---

## Migration Slice 7 — Personas + User Master-Profile Redesign (2026-06-10)

> **Spec**: `docs/superpowers/specs/2026-06-06-personas-profile-redesign-design.md` (brainstormed + approved 2026-06-06; supersedes the brief). **Branch**: `slice-7-personas-profile-redesign` (off master). Built in two sub-slices: **7a** (master profile foundation, DONE — merged to master 2026-06-10) + **7b** (persona redesign, DONE 2026-06-11).
>
> **Model decisions:** new rich shared **`ProfileContent`** schema (structured month+year dates, project technologies/links, education grade, employment type, current/ongoing flags) — **lenient at rest** (nullable dates + optional ids so AI-parsed/legacy data validate) with requiredness enforced in the form; backend **`ensureIds`** assigns ids on every write. Persona sections are **copied** snapshots editable per-persona **except education** (pick-from-profile; Edu-B snapshot + re-pick). Two persona modes — **"Build from profile"** + **"Import a résumé"** (paste or in-memory PDF). **Personas are never rendered directly** → the `.tex`/react-pdf pipeline stays untouched (a flattener is unnecessary).

**Slice 7a — Master Profile foundation (DONE)**
> **Plan**: `docs/superpowers/plans/2026-06-06-slice-7a-master-profile.md`. Orchestrated via the `Workflow` tool: sequential per-task TDD (backend chain → frontend chunks) → solo ground-truth gates → 4-lens adversarial review (find → verify) → review-fix.
- [x] Backend: shared **`ProfileContent`** Zod schema + `ensureIds` + `emptyProfileContent` (`src/shared/profile-content.schema.ts`); **`user_profiles`** table (1/user, migration `0007`); `profile` module (router→controller→service→repository→Zod) — **`GET /api/profile`** (saved content, else an unpersisted empty default) + **`PUT /api/profile`** (validate → `ensureIds` → upsert). **No persona changes** (deferred to 7b).
- [x] Frontend: `@/types/profile` mirror + `@/lib/profile` factories/`validateProfileContent`; `useProfile`/`useUpdateProfile` hooks (`PROFILE_KEY`); reusable primitives **`MonthYearPicker`**, **`ChipInput`**, **`BulletListEditor`**, **`LinksEditor`** + a styled **`Checkbox`** ui primitive; per-section editors (Basics/Experience/Projects/Skills/Education) composed into **`ProfileEditor`**; **`ProfileWorkspace`** (load/edit/validate/save) on a new **`/app/profile`** page. **Account menu** at the sidebar foot (`AccountMenu` + monogram `MonogramAvatar` + smooth `AnchoredPopover` dropdown → Profile / Settings / Sign out) **replaces** the old sign-out button; **Profile & Settings moved out of the primary nav** into it.
- [x] **Gates green:** backend `typecheck`+`lint`+**353 tests**; frontend `typecheck`+`lint`+**320 tests**+**production Docker build** (`/app/profile` in the route manifest). Adversarial 4-lens review (22 raw findings → 1 confirmed: education `bullets` editor missing); a follow-up self-audit caught two more editor field-coverage gaps (experience `employmentType`, education `location`) → all fixed so every editor covers 100% of its schema fields.
- [x] ~~Next: user manual browser pass of `/app/profile`. Then Slice 7b.~~ → 7a merged to master 2026-06-10 (+ post-merge polish: standard PageHeader layout, tonal add / soft-red remove buttons, account-menu replaces sidebar sign-out, name/email pre-fill from the registered user, server-rendered profile seed).

**Slice 7b — Persona redesign (DONE 2026-06-11)**
> **Plan**: `docs/superpowers/plans/2026-06-11-slice-7b-persona-redesign.md`. Same loop as 7a: `Workflow`-orchestrated sequential per-task TDD (A1–A7 backend → B1–B7 frontend, commit per task) → solo ground-truth gates → 4-lens adversarial review (18 confirmed findings, 0 rejected) → 5-group review-fix pass → live smoke.
- [x] Backend: **`personas.data` retyped to `ProfileContent`** (no DDL) + **`resumeContentToProfileContent`** up-converter (golden-tested tolerant date parser — en/em dashes, spaced/unspaced digit hyphens, `to`, current-markers; **lossless**: any unparsed side stashes a `Dates: <original>` leading bullet) + **lazy normalization on every repository return** (list/find/create/update) + idempotent skip-and-report **`db:backfill-personas`** script (ran on dev: 8/8 converted, re-run 0). **Create is AI-free** — `POST /api/personas { name, data, rawInput? }` (cap-checked, `ensureIds`); new **`POST /api/personas/parse-resume`** (multipart `file` PDF and/or `text`; in-memory `multer` + `pdf-parse`; AI-off/cap/rate-limit fail-fast; returns `{ content, rawText }`) — the **only AI persona path**, counted in the shared hourly limit via new **`resume_parse_events`** table (migration **`0008`**) summed into `countRecentGenerations`. AI structuring retargeted to a `PROFILE_SCHEMA_GUIDE` (MonthYear dates, technologies, links, grade, current/inProgress, omit ids); `buildResumePrompt`/`buildCoverLetterPrompt` take `ProfileContent` + a render-dates-as-human-strings note — **résumé output stays `ResumeContent`; renderers untouched**.
- [x] Frontend: `Persona.data: ProfileContent`; **api-client `postForm`** (FormData passes through the silent-refresh 401 retry) + `useParseResume`; `ProfileSection` extracted for reuse; **`PersonaItemPicker`** (checkbox multi-select of profile items by id + Add all, deep copies keep ids) + **pick-only `PersonaEducationSection`** (read-only rows + Remove + picker + "Manage in profile" link; imported entries appear as removable rows) composed into **`PersonaContentEditor`** (pickers + editable copies + single Add-custom affordance per section); **`CreatePersonaSheet`** replaces the wizard — mode chooser (**"Build from profile"** seeds basics/summary; **"Import a résumé"** paste/PDF → parse → review) converging on the same editor, save posts `rawInput` on import / null on manual; `EditPersonaSheet` swapped to the rich editor; workspace gates creation on the **cap only** (AI-off only disables import).
- [x] **Adversarial review fixes** (3 major + 8 minor, each verified then TDD-fixed): lossless half-parseable date conversion; dateless imported/legacy education no longer save-blocks personas (`validateProfileContent` `requireEducationDates` opt-out for the pick-only context) + client link-requiredness mirror; in-flight parse detached on Back (no draft clobber); stale edit-error reset; dirty-guard on Escape/overlay dismissal (protects spent parse quota); normalized `update` returns; backfill per-row resilience; single add affordance; AI-off + at-cap banners co-render.
- [x] **Gates green:** backend `typecheck`+`lint`+**424 tests**; frontend `typecheck`+`lint`+**376 tests**+production Docker build. **Live smoke (Docker, real key):** register → profile → manual persona (`rawInput: null`) → **PDF parse on Gemini** (LibreOffice-generated résumé → rich `ProfileContent`: MonthYear dates, `current`, technologies, grade, skill groups, ids) → imported persona with `rawText` audit → **job-tailored résumé + cover letter off the `ProfileContent` persona** (AI rendered `{month,year}` as "Mar 2021 – Present") → `.tex` derives → exactly 1 `resume_parse_events` row spent.
- [x] **Browser-pass UX iteration (user feedback 2026-06-11):** persona-sheet sections switched to a **stacked** layout (`ProfileSection layout="stacked"`; `/app/profile` keeps two-column); **persona Basics section removed** — contact identity lives on the master profile and **generation merges `profileService.getSavedBasics()` over the persona's basics** at résumé/cover-letter time (fallback to the persona's own parsed basics when no profile is saved; drafts still carry basics silently + a blank-name guard on create); "Add custom" outline buttons dropped for the section editors' own **softPrimary add buttons below the entries** (matching Add link/Add bullet).
- [x] **AI resilience (browser-pass finding 2026-06-11):** the user's PDF import 500'd bare-text — root cause was **`gemini-3.5-flash` provider overload (503 "high demand")** compounding three gaps, all fixed: the Next dev rewrite proxy aborted >30s upstreams with a plain-text 500 (→ `experimental.proxyTimeout: 180_000`); the Gemini call could hang on undici's 5-min headers timeout (→ `httpOptions.timeout: 60_000`, which the SDK also forwards as a server deadline); and timeouts/overload surfaced as generic `INTERNAL_ERROR` (→ `DEADLINE_EXCEEDED`/abort/headers-timeout and 503 `UNAVAILABLE`/"high demand" now map to **retryable `SERVICE_UNAVAILABLE` with clear messages**, plus `generateStructured` retries once on malformed/schema-missing JSON). End-to-end PDF parse re-verified through the 8080 proxy.
- [x] **Fallback model chain (user-approved follow-up):** optional **`GEMINI_FALLBACK_MODEL`** env — when the primary model fails **transiently** (timeout or 503 overload, i.e. the `SERVICE_UNAVAILABLE` classes), `callModel` retries the request once on the fallback model (pino warn on each fallback; no fallback for 429/quota, auth/generic errors, or AI-not-configured). Dev env restored to `GEMINI_MODEL=gemini-3.5-flash` + `GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite` (probes during the outage: 3.5-flash 503, 2.5-flash intermittent 503, flash-lite consistently 200 in ~1s); **live-verified against the real outage** — primary 503 → fallback parsed the PDF in 3.7s total. *(Clarified during review of the idea: PDF→text extraction is already library-based [`pdf-parse`] — only structuring needs the model; a heuristic no-AI structuring fallback was considered and rejected, OCR for scanned PDFs stays deferred.)*
- [x] **Structured-output hardening (browser-pass finding 2026-06-11):** the fallback model's JSON failed `ProfileContentSchema` ("AI output did not match the expected shape") — fixed threefold in `generateStructured`: **`sanitizeModelJson`** strips null-valued keys / null array entries before validation (safe: nullable-by-design fields are `.nullable().default(null)`, so Zod restores their null; `.optional()` fields rejecting explicit null was the failure being absorbed); the retry now **feeds the Zod issues back** to the model (`path: message` lines, ≤10) instead of blind-resending; terminal failures **log issues + a 500-char raw preview** and carry the ZodError as cause. Live-verified on flash-lite with a rich CV (employmentType enum normalized, year-only dates, grades, skill groups). Known worst-case latency: a *hanging* (vs fast-503) primary burns its 60s deadline before the fallback answers.
- [x] **User browser pass done; merged to master 2026-06-11** (merge `e75ecb2`; pass surfaced + fixed: stacked sheet layout, persona Basics removal w/ generation-time merge, add-buttons below sections, proxy/Gemini timeout + overload mapping, fallback model chain, structured-output sanitize/feedback-retry).
**Slice 7c — Cover Letters Workspace + Paste-a-JD + Résumé Library (DONE 2026-06-12)**
> **Spec**: `docs/superpowers/specs/2026-06-12-slice-7c-cover-letters-workspace-design.md` · **Plan**: `docs/superpowers/plans/2026-06-12-slice-7c-cover-letters-workspace.md`. Same loop as 7a/7b: `Workflow`-orchestrated sequential per-task TDD (A1–A3 backend → B1–B5 frontend, commit per task) → solo ground-truth gates → 4-lens adversarial review (**11 confirmed findings, 0 rejected, all minor**) → single fix pass → live smoke. **Note: committed directly on master** (no slice branch this time), commits `84e7d16..b3c886c`.
- [x] **Scope addition (user-approved 2026-06-12, second survey — 7 agents over 12+ tools incl. Teal/Huntr/Careerflow/Rezi/Kickresume):** launcher-only, no-library résumés were the **category outlier** (every tracker/builder ships a nav entry + persistent library; generated résumés were DB-persisted but unreachable in the UI since 6b). → 7c also delivers the **résumé library on `/app/resumes`** (frontend-only; consumes the unused `GET /api/resumes` + `useResumes`/`useDeleteResume`) and **both sidebar entries** (Résumés `FileText`, Cover letters `Mail`, between Personas and Timeline).
- [x] Backend: `cover_letters.job_id` **nullable** + **`adhoc_job` jsonb** (`$type<AdhocJob>`, migration **`0009`** incl. a clean **`cover_letters_job_xor` CHECK** `(job_id IS NULL) <> (adhoc_job IS NULL)`); `GenerateCoverLetterSchema` → `personaId` + **XOR refine** of `jobId` / inline `job { title≤255, company≤255, description?≤50_000 }` (trimmed); service adhoc branch — **no job lookup**, blank description normalized away (omitted from `adhocJob`, prompt snapshot `null`), rate limit still **after all ownership checks**, master-profile basics merge unchanged, letter title `${company} — cover letter` **clamped to 200** (fixed a latent varchar(200) overflow on the tracked path too). `buildCoverLetterPrompt`, ai-usage counting, controller/router code untouched.
- [x] Frontend: `CoverLetter.jobId: string | null` + `adhocJob`; **`useAllCoverLetters`** (SSR-hydrated library query); shared **`DocumentList`** in `components/documents/` (borderless aligned grid — title · context · persona · mono date · delete; role=button rows w/ Enter/Space + focus-visible ring; no-nested-button); **`GenerateCoverLetterBar`** (`SegmentedControl` **Tracked job ⇄ Paste a description**, per-mode required-field gating, trimmed payloads); **`/app/cover-letters`** server page + `CoverLettersWorkspace` (library always renders — AI-off / no-personas gate **only the generator**; no auto-select; sticky editor pane reusing `CoverLetterEditor` + Save); **résumé library** wired into `ResumeWorkspace` (select reopens content into the editor, delete clears the open one, header retitled **'Résumés'**); JobDrawer cover-letter section untouched.
- [x] **Adversarial review fixes** (11 minor, commit `b3c886c`): SSR error fallbacks now pass `undefined` (not `[]`) so a 401'd RSC render heals client-side (workspaces resolve via `usePersonas(initial)`; was pinned false-empty ≥30s); client `maxLength` caps mirroring Zod bounds; state-aware empty/hint copy when the generator is gated; selected-row hover regression; fixed 4rem date track (column drift); shared **`MutationErrorAlert`** surfacing save/delete errors + delete clears editor in `onSuccess`; "No tracked jobs yet" hint in tracked mode; focus-visible ring on rows; shared parameterized **`NoPersonasHint`** (dedupe); **`useRevealBelowLg`** scroll-into-view of the editor pane on select/generate below `lg`; Résumés header/IA coherence.
- [x] **Gates green:** backend `typecheck`+`lint`+**464 tests** (real Postgres, `0009` applied); frontend `typecheck`+`lint`+**425 tests** (98 files) + production Docker build. **Live smoke (Docker :8080 proxy, real Gemini):** register → persona → tracked job → **tracked-job letter** (jobId set, adhocJob null) → **pasted-JD letter** (jobId null, `adhocJob` round-trips, body references the pasted JD) → XOR 400s (both/neither) → library lists 2 (1 adhoc + 1 tracked), **board still 1 job** (no clutter) → drawer's `?jobId=` filter tracked-only → PATCH 200 / DELETE 204 → `/app/cover-letters` + `/app/resumes` SSR 200 with new headers, adhoc row, and both nav entries.

**Slice 7c follow-up — Cover-letter editor overhaul + AI refine (DONE 2026-06-16)**
> Branch `fix-cover-letter-editor` (merged to master `578504c` via `--no-ff`, 2026-06-16). Iterative user-driven polish, each step: survey (where the call was non-obvious) → TDD → 4-lens adversarial review → fix → gates → live Gemini smoke. Commits `5571416..3b1bdf2`.
- [x] **Editor/PDF fixes:** shared `lib/cover-letter-markdown.ts` parser (block/line/inline model, golden-tested) feeds **both** the HTML preview (`CoverLetterPreview`) and the react-pdf doc (`CoverLetterDocument`) — so the PDF matches the preview (bold rendered, links clickable, header soft-breaks + paragraph gaps; **rendered a real PDF + `pdftotext` to verify** no raw `**`/`](url)` leak). `SegmentedControl` Edit/Preview, `Copied ✓` feedback, **Copy = clean plain text** (`coverLetterToPlainText`: strips bold, expands links to `text (url)`). Two-line `DocumentListRow`. Reusable **`MarkdownProse`** (`components/ui/`) fixes the dead-`prose` job snapshot too (no `@tailwindcss/typography`).
- [x] **AI refine** (user-requested, after a 6-tool survey): `POST /api/cover-letters/:id/refine { action, instructions? }` returns a **candidate without persisting** (rate-limited after ownership; counted via new **`ai_usage_events`** table, migration **`0010`**, summed into the hourly limit); actions **Humanize / Shorten / Make longer / Fix grammar / Custom** (`buildRefineCoverLetterPrompt`). Stage-then-commit review UI (Canvas/Docs pattern, from a 5-tool survey): in-place **proposal owns the letter slot** (editor body hidden — one letter on screen), accent border + `✦ Proposed rewrite` header, **Show original** compare toggle, **Keep / Try again / Discard** + one-click **Undo**; **Fix grammar shows a plain-text word-diff** (`lib/word-diff.ts` LCS) while big rewrites show clean in-place. Single instruction input (in the controls); per-candidate remount (`proposalSeq` key) resets view state.
- [x] **IA route split** (7-tool survey — launcher-only/no-editor-route is the category outlier): `/app/cover-letters` is a **full-width library index** + a **New cover letter** sheet (generator off the list); a dedicated **`/app/cover-letters/[id]`** editor route (`useCoverLetter` SSR-hydrated, in-shell not-found for a missing/unowned id, `notFound()` boundary avoided as it drops the app shell). Old `CoverLettersWorkspace` deleted.
- [x] **Editor layout** (document + side-rail, from the survey): refine state lifted into **`useCoverLetterRefine`** so `RefineControls` (rail) and `CoverLetterProposal` (main) render in separate columns; `CoverLetterEditor` gained a `layout` prop — **split** (route: controls in a right rail beside a letter-width letter on **`xl`**, so the app sidebar doesn't cramp it; left-aligned; edit box fills viewport height) vs **stacked** (default — the JobDrawer, unchanged). Back affordance is an **arrow icon before the title** in `PageHeader` (new reusable `back` prop), not a content-area breadcrumb.
- [x] **Adversarial reviews across the arc** (5 review passes, all confirmed findings fixed): the critical one — staged candidate leaked across letter switches (could save letter A onto B) → reset on id change; AI-gate the refine panel; staged-not-saved copy; markdown-in-diff; lg→xl breakpoint cramping; centering misalignment. Also fixed **3 pre-existing lint errors 7c shipped to master** (non-null assertions — I'd mis-reported 7c lint as clean).
- [x] **Gates green at merge:** backend `typecheck`+`lint`+**483 tests** (migration `0010` applied); frontend `typecheck`+`lint`+**469 tests** (107 files) + production Docker build. Live Gemini smoke of all 5 refine actions (candidate returned, **stored letter unchanged until Save**, usage events recorded), the editor route, and the not-found path.

**Confirmation dialogs for entity deletions (DONE 2026-06-16)**
> Branch `confirm-dialogs` (merged to master `a3ddc16` via `--no-ff`). User: every *entity* delete must confirm; *micro* in-editor removals stay instant.
- [x] Reusable **`ConfirmDialog`** (`components/ui/`, on the Dialog primitive) + promise-based **`useConfirm`** hook (`hooks/use-confirm.tsx`: `await confirm({title, description, confirmLabel, destructive})`; keeps the dialog mounted, toggles open; Confirm→true, Cancel/overlay/Esc→false; Cancel autofocused so Enter can't accidentally delete).
- [x] Wired into **every entity delete**: cover letter (list row + editor header), résumé (list row), persona (card), reminder (item), job (drawer — **migrated off its inline 2-step confirm**). Each message names the target; the job one warns about cascading timeline/reminders/cover letters.
- [x] **Micro removals stay instant** (bullets, links, chips, experience/project/skill/education rows, persona pickers) — unchanged.
- [x] Adversarial review (3 lenses): 1 confirmed minor (list-row delete didn't block a second in-flight mutation — fixed with an `if (del.isPending) return` guard), 5 rejected/refuted (hook lifecycle sound, micro-removals verified untouched). Gates: frontend `typecheck`+`lint`+**472 tests** (new `useConfirm` test; 7 delete tests updated to click through the dialog) + production build.
- [x] Merged to master. Slice 8 and the public pages have since shipped; the polish items listed here are `t-0021`–`t-0024` in `.blink/tasks/` (note: the "old centered/stacked résumé layout" claim was already wrong — see `t-0021`).

## Timeline + Settings pages (DONE 2026-06-17)

> Branch `timeline-settings-pages`. Resolves the two dead sidebar/account-menu links surfaced by the 2026-06-16 remaining-work audit (the global-timeline feed was tracked in `docs/deferred-tasks.md`). Plan: `docs/superpowers/plans/2026-06-16-timeline-settings-pages.md`. Polish/tech-debt backlog from the same audit recorded in `docs/polish-and-tech-debt.md`.
- [x] **Global timeline feed** — `GET /api/timeline` (userId-scoped, paginated): new `findByUser` (inner-joins `jobs` for `jobTitle`/`jobCompany`) + `listForUser` + a `timelineGlobalRouter` mounted at `/api/timeline`, alongside the untouched per-job `/jobs/:jobId/timeline`. Repo/service/router tests (ordering, pagination, user-scoping, enrichment join).
- [x] **`/app/timeline` page** — `useGlobalTimeline` hook + `TimelineFeed` (reuses `TimelineEntry` via a new optional `jobLink` prop, and `JobsPagination`); rows link to `/app/jobs?job=<id>` (where the `JobDrawer` mounts). SSR-seeded first page + `TimelineSkeleton`. Hook + feed tests.
- [x] **Theme system** (frontend-only, no `next-themes`) — unlocks the previously-unreachable dark mode (the `.dark` wiring was stubbed since Slice 0/1). Cookie-backed (`theme=light|dark|system`), no-FOUC inline `ThemeScript` (first child of `<body>`; `<html suppressHydrationWarning>`), `ThemeProvider` + `useTheme` toggling `.dark` on `<html>` with OS-follow in `system`. Theme tests (class + cookie + system change).
- [x] **`/app/settings` page** — Appearance (Light/Dark/System `SegmentedControl`), Account (read-only name/email + "Edit profile →" + Sign out), Notifications (in-app on; email noted as upcoming). `SettingsSection` wrapper; workspace test.
- [x] Gates: backend `typecheck`+`lint`+**492 tests**; frontend `typecheck`+`lint`+**490 tests**+production build (via `docker build --target production`, host `.next` is root-owned).
- [x] Merged to master. Manual browser pass (dark-mode flip, timeline paging + row→drawer, settings) never recorded — folded into `t-0026`.

---

## Robust URL Scraping (render fallback + AI normalization) (DONE 2026-06-17)

> Branch `robust-url-scraping`. Plan: `docs/superpowers/plans/2026-06-17-robust-url-scraping.md`. Fixes the long-standing failure where pasting a JS-rendered / bot-protected job URL (Naukri, LinkedIn, Indeed, Workday) returned `Untitled Position` / `Unknown Company` + decoy-image junk. Root cause: those boards are CSR SPAs behind anti-bot — `fetch`+Cheerio only sees an empty shell. This is the **shared** capture mechanism for web **and** the planned mobile app (share-a-URL), so it's built to stand alone (the Chrome extension is web-only).
- [x] **Tiered pipeline** — static `fetch`+Cheerio/JSON-LD fast-path → on a "shell" result, render via a `RenderClient` (**Jina Reader**, free/keyless default; paid Firecrawl/ScrapingBee slot env-gated) → if Gemini is on, **AI-normalize** the rendered content into `{title, company, location, salary, description}` (the right use of the previously-dead `ScrapeFallback` seam — AI runs over *rendered* content, never the shell) → sanitize + status. `scraper.ts`, `render.ts`, `extract.ts`, `scrape-fallback.ts`, `buildJobExtractionPrompt`.
- [x] **Graceful degradation** — results carry `status` (`ok`/`partial`/`empty`) + `source` (`static`/`render`/`ai`). Frontend: `ok` → preview; `partial`/`empty` → route to manual entry (placeholders stripped) with a clear note; added the **missing Description (`snapshotMarkdown`) field** to the manual form (was silently dropped); images neutralized in `MarkdownProse` so decoys never render. Markdown sanitizer strips images/`data:` decoys/tracking pixels (paren-safe URLs, reference-style images).
- [x] **Security (4-lens adversarial review, 19 confirmed findings fixed)** — SSRF hardened: `ipaddr.js` classifier (kills the hex-mapped-IPv6 `::ffff:a9fe:a9fe` bypass), redirect re-validation per hop, **connect-time IP pinning** via an undici dispatcher (closes DNS rebinding), render path guarded too, response body-size cap (5 MB) + snapshot length clamp (100 KB). Scrape AI extraction is **rate-limited + metered** against the hourly AI budget (threaded `userId`); prompt-injection guardrail; 90s overall scrape deadline.
- [x] **Config** — `docker-compose.yml` now passes `GEMINI_*` + `JINA_API_KEY` + `SCRAPER_RENDER_ENABLED` to the backend container (they were never wired, so AI features couldn't run as deployed). Set `GEMINI_API_KEY` in the root `.env` for the clean AI path; render-only works keyless. **NB: the `GEMINI_MODEL=gemini-3.5-flash` in `backend-express/.env` appears invalid — use e.g. `gemini-2.5-flash-lite`; this affects all AI features, not just scraping.**
- [x] Gates: backend `typecheck`+`lint`+**549 tests**; frontend `typecheck`+`lint`+**493 tests**+production build. Live-smoked the exact failing Naukri URL → `title: Quality Analyst`, `company: Teleperformance Global Services`, `status: ok`, `source: ai`, clean image-free snapshot.
- [x] Merged to master. Manual browser pass (paste a Naukri/LinkedIn URL through the modal) never recorded — folded into `t-0026`. Deferred lows are `t-0010`/`t-0011`.

---

## Migration Slice 9 — Referral Outreach Tracking (DONE 2026-07-16)

> Branch `slice-9-outreach` (**not yet merged to master** — awaiting user merge). Spec: `docs/superpowers/specs/2026-07-16-referral-outreach-tracking-design.md` · Plan: `docs/superpowers/plans/2026-07-16-slice-9-referral-outreach.md`. Track *who* you reached out to for a referral on each job, log their reply status, and surface outreach activity on the jobs list + board — **without** touching the ghost meter (that stays an employer-silence signal only).

### Backend (`backend-express`)
- [x] **`job_contacts` table** (migration `0012`) — free-text `contact` varchar(500), optional `channel` enum (EMAIL/LINKEDIN/OTHER), `status` enum (NO_RESPONSE default → HEARD_BACK/REFERRED/DECLINED), editable `reached_out_at`, `notes`; `userId`+`jobId` FKs cascade. The enums' const arrays are the **single source of truth** for both the Drizzle `pgEnum` and the Zod schema.
- [x] **`contacts` module** (router→controller→service→repository→Zod + co-located tests) mirroring reminders' **dual-router** pattern: `GET/POST /api/jobs/:jobId/contacts` (per-job) + `PATCH/DELETE /api/contacts/:id` (by id, user-scoped).
- [x] **AUTO timeline events** via `timelineService.addAutoEntry` — "Reached out to X" (+ "Via email"/"Via LinkedIn"), "Heard back from X", "X referred you", "X declined to refer"; **no event on delete or on reverting to NO_RESPONSE**; failures logged + swallowed (never roll back the contact write). Job `ghostDays`/`lastActivityAt` **deliberately untouched** (the ghost meter stays employer-signal only).
- [x] **List/board counts** — `GET /api/jobs` rows and `GET /api/dashboard/kanban` cards gain `outreachCount`/`outreachReplies` (replies = `status != NO_RESPONSE`) via one grouped `contactsRepository.countsForJobs` query merged at the service layer.

### Frontend (`frontend-next`)
- [x] `types/contact.ts` + `contactsKey` + `use-contacts.ts` hooks (mutations invalidate contacts + jobs + kanban + timeline keys).
- [x] JobDrawer **Outreach section** (`components/jobs/outreach/`): add form (Person / Channel / Notes) + item rows (compact status `Select`, inline edit, confirm-gated delete via `useConfirm`).
- [x] Shared **`OutreachBadge`** — jobs-list rows (`✉ N · M replied`, hidden below `sm`) and kanban cards (icon + count, accent tint when any replied, tooltip).

### Verification
- [x] Backend `typecheck`+`lint`+**636 tests**; frontend `typecheck`+`lint`+**572 tests** + production build — all green.
- [x] Live-smoked in-browser (create outreach → status change → timeline events → list + board badges) at desktop 1440 + mobile 390.
- [x] **Merged to master 2026-07-16** (merge `2947a15`). Manual browser pass folded into `t-0026`; the outreach follow-ups are `t-0017` (nudge sweep), `t-0018` (referral message generation), `t-0019` (referrer-ghosted filter).


## Saved Answers Library (on `slice-answers-library`, 2026-08-25)

> Spec: `docs/superpowers/specs/2026-08-25-saved-answers-library-design.md` · Plan: `docs/superpowers/plans/2026-08-25-saved-answers-library.md` · Tracker: `.blink/tasks/t-0c5xex`. Store reusable answers to the open-ended questions application forms keep asking ("why are you leaving your current role?", "describe your responsibilities") in **two length variants**, with an AI draft path and one-click copy. **Form facts are deliberately cut** (notice period, CTC, years of experience, work authorization): storage only pays when composing costs more than retrieving, those values are memorized, browser autofill already covers the rest, and they earn their keep only in a product that *submits* forms — which this is not.

### Backend (`backend-express`)
- [x] **`question_answers` table** (migration `0013`) — `question` varchar(500), nullable `answer_short` / `answer_long`, `last_used_at`; `user_id` FK cascades, indexed. **No `job_id`** and no tags — answers are reusable by definition.
- [x] **`answers` module** (router→controller→service→repository→Zod + co-located tests): `GET/POST /api/answers`, `PATCH/DELETE /api/answers/:id`, `POST /api/answers/:id/used`, `POST /api/answers/generate`. `/generate` is declared **before** `/:id` and returns **200, not 201** — it persists nothing.
- [x] **At-least-one-variant rule** enforced in Zod on create and in the service on update (it merges the stored row with the patch, so blanking the only remaining variant is rejected). No DB CHECK, by spec.
- [x] **`buildAnswerPrompt` + `AnswerDraftSchema`** — one structured Gemini call returns **both** variants, so they stay consistent and cost one rate-limit slot. Budgets are in **characters** (500 / 2000) because ATS fields cap characters, never words. Both fields are `.min(1)`: `sanitizeModelJson` already drops nulls, so `""` is the one bad value that would otherwise validate and blank the user's text.
- [x] **Metering** — `assertWithinRateLimit` is spent only *after* persona (and optional job) ownership is confirmed; `ai_usage_events` records `answer_generate` only after a successful generation.
- [x] `jobId` is accepted end to end (schema, ownership, `TARGET JOB` prompt block, tests) but **no UI sends it yet** — job-specific answers were deferred during brainstorming. Tracked as `t-0c61ek`.

### Frontend (`frontend-next`)
- [x] `types/answer.ts` + `answersQuery` + `use-answers.ts` (six hooks). `useMarkAnswerUsed` deliberately **does not invalidate** the list — it is sorted by `lastUsedAt`, so invalidating would reorder rows under the user's pointer mid-click.
- [x] **`/app/answers`** workspace + sidebar entry + route skeleton; `?answer=` / `?new` slideover, client-side search over question and both variants.
- [x] **Dedicated `AnswerList` / `AnswerListRow`** — the shared `DocumentList` could **not** be reused: `DocumentRow` is a fixed four-field shape with no slot for interactive children, and an answer row carries no context or persona but needs two copy chips *inside* it. Rows stack below `sm` (`sm:contents`) so the chips stop squeezing the question to a few characters at 390.
- [x] **`AnswerCopyChip`** — copies and stamps `last_used_at` in one click; the stamp fires **after** a successful clipboard write via a new `onCopied` prop on the shared `CopyButton`.
- [x] **`AnswerEditor`** with live character counts against each budget, **`GenerateAnswerControls`** (persona + optional instructions), and the **ethics note** in two placements — no page banner, no dismiss state.

### Verification
- [x] Backend `typecheck`+`lint`+**680 tests**; frontend `typecheck`+`lint`+**609 tests** + production build — all green.
- [x] Live-smoked against real Gemini (both variants grounded in the persona's actual facts; 473 / 1,300 characters against 500 / 2,000 budgets), copy → `last_used_at` verified in Postgres, `NULLS LAST` ordering confirmed, at 1440 / 1024 / 390.
- [x] **Adversarially reviewed** — five findings fixed: a cross-record draft leak (the `key` was on `AnswerEditor` while the parent owned the state, so browser Back then opening another row rendered answer A's draft under B), `.min(1)` on the draft schema, the copy stamp firing before the clipboard write, an unsurfaced delete error, and the 390px truncation. Two findings accepted: the unwired `jobId` (`t-0c61ek`) and a TOCTOU on the at-least-one-variant rule that one UI cannot produce.
---

## Next.js 16 Upgrade (on `upgrade-next-16`, 2026-08-26)

> Tracker: `.blink/tasks/t-0c7hxm` / `t-0c7hxn` / `t-0c7hxo`, decision `d-0c7hxl`. Security-driven (15.0.3 predated the CVE-2025-29927 middleware-bypass fix and months of patches) and done **before** the next feature slices so they build on 16 once.

- [x] **next 16.3.3 / react 19.2.8** (+ matching @types, `eslint-config-next` 16) — no peer-dep conflicts.
- [x] **`src/middleware.ts` → `src/proxy.ts`** (Node runtime; logic byte-identical — reviewer diffed content, and verified Next 16 still sends the `next-router-prefetch` header the refresh-rotation guard reads). `lib/middleware-cookies.ts` name kept (shared lib, not a convention file).
- [x] **Turbopack** (16 default) for dev + prod: dev ready in ~300ms, prod compile 8.8s. `transpilePackages: ['@react-pdf/renderer']` **removed** — it was a webpack-only ESM workaround; Turbopack resolves it natively (build + in-browser PDF preview both verified). `experimental.proxyTimeout`, `skipTrailingSlashRedirect`, rewrites, standalone output all unchanged and re-verified valid in 16.
- [x] **React Compiler on** (`reactCompiler: true` + `babel-plugin-react-compiler`), and **vitest runs it too** (review finding — the suite now tests compiled render semantics). `eslint-plugin-react-hooks` v7's compiler rules surfaced **16 pre-existing violations** in 12 files → demoted to `warn` with the fix tracked as `t-0c7ire` (components the compiler bails on aren't memoized — that's where the win lands). Deferred by decision `d-0c7hxl`: Cache Components/PPR (server-cache model doesn't fit an auth'd per-user app), `<Activity/>` Board⇄List (`t-0c7irf`), TypeScript 7 (`t-0c7irg`).
- [x] **Typegen route props** — `PageProps<'/app/cover-letters/[id]'>` on the app's one dynamic route; `npm run typecheck` now runs `next typegen` first (heals the host/container generated-type path drift). `eslint.config.mjs` rewritten off `FlatCompat` (eslint-config-next 16 is flat-only; `--print-config` verified all five custom rules survive at `error`).
- [x] **Adversarially reviewed** — 19 candidates, 16 refuted, 3 LOW fixed (stale Next 15/middleware doc refs; untriaged new `no-location-assign-relative-destination` warning → deliberate hard-nav gets an explaining disable; vitest/compiler gap above).
- [x] **Live-smoked 11/11** on the Docker stack: login → proxy gate, real WebSocket through the rewrite, board drag (`move` 200), job drawer + timeline, react-pdf preview, one Gemini answer generation (both variants), `[id]` editor route, `/extension/authorize`, 390px no horizontal scroll. Only benign pre-existing warnings (dnd-kit SSR id drift, StrictMode socket first-attempt close, Radix a11y).

### Follow-ups (all closed 2026-08-26, merged to develop)

- [x] **react-hooks cleanup** (`t-0c7ire`, merge `28d01ea`) — all 16 violations fixed, zero disable escapes, four rules restored to `error`. Patterns: `useReveal` destructuring ×6 (landing), injectable-clock `isPast()` (reminder-item — note: the compiler now memoizes `overdue` keyed on the reminder; accepted + commented), **`useSyncExternalStore`** ×3 (theme-provider / sidebar-toggle / landing draggable-card, server snapshots byte-match the old initial state so hydration is unchanged), state-adjustment-during-render ×5 (search-input, profile/resume workspaces, edit-persona-sheet, `use-cover-letter-refine` — which also gained an id-guarded effect closing the in-flight-refine race across a letter switch, found in review). 614 tests (5 new). Reviewed (3 LOW, all fixed) + browser-smoked 8/8 (theme no-flash, pre-paint sidebar, cross-letter refine isolation, sort cycling). New known-noise entry: motion/react SSR-initial-transform hydration mismatch **only under emulated `prefers-reduced-motion`** on the landing page — library-inherent, pre-existing.
- [x] **`<Activity/>` Board⇄List** (`t-0c7irf`, merge `0ed0055`) — both views stay mounted in `jobs-workspace.tsx`, hidden one wrapped in stable `Activity` (`display:none`, effects torn down — so the hidden ⌘K listener unregisters itself and the kanban query stays gated). Retains per-column + strip scroll, drag snapshot, search draft. Hidden duplicate header stays in DOM (out of a11y tree/tab order; hoisting it would reshuffle board layout — deliberate). Test mock made faithful (`useSearchParams` returns a fresh instance per call — the React Compiler caches derived values off a mutated-in-place mock). 615 tests. Smoked 9/9: scroll offsets literally retained (150/400), single `?job=` push, no kanban fetch until Board shown, 390px clean.
- [x] **TypeScript 7 evaluated → deferred** (`t-0c7irg` done, adoption tracked `t-0c7kct`) — compiler ready (0 new errors on 273 files, ~5x typecheck, `next build` engages it) but `typescript-eslint` hard-throws on TS 7.0 and `eslint-config-next` imports it unconditionally → all linting dies; no npm workaround. Re-trigger: typescript-eslint/typescript-eslint#10940. Full eval data (incl. the `--legacy-peer-deps` false-error trap) in the task body.

## Extension Answer Surfacing (on `slice-extension-answers`, 2026-08-27)

> Tracker: `.blink/tasks/t-0c5uc8`, decisions `d-0c9ove` (surface + navigation) and `d-0c9ovf` (matching). Spec `docs/superpowers/specs/2026-08-27-extension-answer-surfacing-design.md`, plan `docs/superpowers/plans/2026-08-27-extension-answer-surfacing.md`. Slice C of the answer-library work — the library shipped as a web surface, and until an answer reaches the form page, using one costs a tab switch, a scan and a copy per question.

- [x] **Backend: two routes, no new logic.** `answersRouter` mounts the cookie `authMiddleware` while the extension carries `X-API-Key`, so `/api/answers` would 401. `GET /api/extension/answers` and `POST /api/extension/answers/:id/used` were added to the **extension** module instead, delegating to the existing `answersService` — slice 8's "no cookie weakening" rule holds. No schema change, no migration. (The design spec originally claimed zero backend changes; corrected during planning.)
- [x] **Tabs, context-preselected** (`d-0c9ove`). A persistent two-tab strip whose active tab comes from the page: fields present → Answers, otherwise → Save job. Rejected: tabs alone (spends a tap, weights both jobs equally), auto-switch alone (best flow, worst discovery — a mode reached only by accident is never learned), a home list (taxes every popup open to serve discoverability once). Simplify — 1M+ installs — ships this same shape, a flat tab bar with context branching inside it.
- [x] **One injected pass.** `readPage()` returns `{ job, fields, tabId }` from a single `executeScript`; preselection needs both signals before either view renders, so two passes would inject twice per open. `CaptureView` takes the read as a prop instead of self-loading. **Permissions unchanged** — `activeTab` + `scripting`, `host_permissions` still web-origin only.
- [x] **Field detection.** `textarea` + `contenteditable` only (plain text inputs are name/email/phone — browser autofill owns those). Label cascade `aria-label` → `aria-labelledby` → `label[for]` → wrapping `<label>` → `placeholder` → nearest preceding text; a field whose question can't be read is skipped. Each is tagged `data-jv-field` so insert can find its target across the message boundary.
- [x] **Matching** (`d-0c9ovf`). Dice over character bigrams, in the popup, no dependency. Catches rewording and typos, **not** semantically different phrasings — stated in a `ponytail:` comment with embeddings as the upgrade path. Context: Simplify matches on the exact string only and its own docs apologise for it; no other surveyed product stores reusable open-ended answers at all.
- [x] **Insert through the native value setter.** `el.value = text` does not fire React's `onChange` — React installs its own setter on the instance — so a controlled ATS form would look filled and submit empty. Goes through the prototype setter plus a bubbling `input` event. **Insert only renders when the row has a target field**; otherwise copy alone.
- [x] **Variant preselects by `maxLength`.** A field capped at 500 with a 412-char short and 1,240-char long preselects short. This is where measuring answers in *characters* pays off — forms declare character limits. Switching questions **drops** any manual override, so a variant chosen under one cap can't overflow a tighter one.
- [x] **Question switcher.** The scan is form-wide, so a screening page with several open-ended questions is answered from one popup open; picking a question re-ranks, re-targets insert and re-evaluates the variant default. Insert confirms inline rather than closing the popup, which would have forced a reopen per question.
- [x] **Shell.** One `TopBar` in `App`, order `[header][tabs][content]`. Both views live inside `<Activity/>`, mirroring the Board⇄List retention (`0ed0055`), so a half-typed capture edit survives a switch. Measured on react 19.2.7: hidden children render but **effects do not mount** (so the answers list costs no request until first shown) and effects **re-mount on every re-show** — hence a once-per-session guard on each view's fetch.
- [x] **Gates green.** 82 extension tests (from 29) across 15 files, `make gates` exit 0 — backend 683, web 616, production web build. Extension build clean.
- [x] **Verified in a real browser, not just jsdom.** The one claim the unit suite could not settle — that the native-value-setter insert reaches a real ATS's React handler — was measured against live **Greenhouse** (Anthropic's board, React 17), **Ashby** (OpenAI's, React 17) and a React 19 control. Our path fires `onChange` **once** with the full string, indistinguishable from Playwright's `.fill()`. Naive `el.value =` fires **zero** times — *even with `input` and `change` dispatched*, which is the trap. Lever (jQuery, no framework state) showed no regression. Mechanism confirmed directly rather than inferred: React installs its own `value` accessor that updates `_valueTracker` alongside the DOM, so naive assignment keeps the two in sync and the change plugin concludes nothing changed; the prototype setter leaves the tracker stale (`""` against a full DOM value), which is what makes the diff detectable. Not version-bound — React 17 and 19 behave identically.
- [ ] **`[contenteditable]` branch still unverified** (`t-0cb5xk`). None of the three surveyed ATSes used one. `el.textContent = text` is right for a plain contenteditable and wrong for Draft.js/ProseMirror/Slate, which own their document model and revert it on the next render — the same looks-filled-submits-empty failure the textarea path avoids. Recorded as a `ponytail:` comment at the branch; the fix when an ATS with a rich-text box turns up is `document.execCommand('insertText', …)` on a focused editor.

**Non-goals, deliberate:** form facts (notice period, CTC, work authorisation — memorised, and autofill owns name/email/phone); silent autofill of essay fields (where Simplify sits — a wrong 200-word answer submitted to a real employer is unrecoverable); AI generation in the popup (no-match links out to `/app/answers`, matching the industry pattern that the extension owns *this page now* and the web app owns composition); on-page overlay (`t-0015` — needs a persistent content script and broad host permissions). Desktop browser only; nothing here helps in a job-board mobile app.


---

## Global Search (on `slice-global-search`, 2026-08-28)

> Plan: `docs/superpowers/plans/2026-08-28-global-search.md` · Tracker: `.blink/tasks/t-0c5wyz` · Decisions `d-0c5wyy` (Postgres FTS, not a search engine), `d-0cbc74` (the palette morphs, but over Radix Dialog). One search across jobs, résumés, cover letters, personas and saved answers, opened from a trigger beside the notification bell.

**Scope shrank on recon.** `t-0c5wyz` absorbed `t-0021` on the premise that résumés needed a new `/app/resumes/[id]` route to land on. That premise was wrong: `resume/resumes-page-client.tsx:11` already reads `?resume=<id>`, with a comment saying exactly why. Four of the five deep links already existed; only `?persona=` was missing, at ~10 lines. `t-0021` is **not a dependency** and stays independent polish — the slice went L to M.

### Backend (`backend-express`)
- [x] **`pg_trgm` extension** (migration `0014`, hand-written — drizzle-kit generates from schema objects and there is no schema object for an extension, so `db:generate` cannot emit it; registered in `meta/_journal.json` by hand). The only schema change the feature makes.
- [x] **`search` module** — `GET /api/search?q=`, one `UNION ALL` over the five tables, computed at query time: no stored `tsvector`, no GIN index, **no sync code**, per `d-0c5wyy`. The five branches are generated from one `SOURCES` descriptor list rather than hand-written five times; `concat_ws` builds the FTS input (a single NULL in a `||` concat nulls the whole expression). `limit 5` per branch, `limit 20` outside.
- [x] **`ts_headline` runs in the outer query only**, over the ~20 survivors rather than over every job description in the table.
- [x] **Ranking is two bands**, not a blend. The first cut used `greatest(ts_rank, similarity)`, which mixes incompatible scales — `ts_rank` returns ~0.06 for a good match while `similarity` reaches 1.0, so *every* fuzzy title match outranked *every* exact match found in a body field. Now `case when <fts> @@ tsq then 1.0 + ts_rank(...) else <trgmsim> end`: both functions are normalised to 0..1, so the bands cannot overlap and no magic constant is needed. Caught by review, guarded by a test that fails against the old expression (`expected 1 to be less than 0`).
- [x] **Typo tolerance spans a column list**, not one column — jobs match on `[title, company]`, so a misspelled company name still finds the job. `similarity()` deliberately does not run on body text: trigram-matching a 100KB job description is meaningless and slow.
- [x] **`ts_headline` emits `\x02`/`\x03`, never `<b>`/`</b>`.** `jobs.snapshot_markdown` is scraped from third-party pages, so HTML delimiters would be a stored-XSS path into the client. The client splits on the sentinels into React nodes; there is no `dangerouslySetInnerHTML` anywhere in the feature, and a test asserts literal markup in a snippet renders as text. The source is also `translate()`d free of those bytes before `ts_headline` re-adds them — the splitter is pure parity, so one unpaired sentinel would invert every highlight after it.
- [x] Snippets strip markdown markers (`*`, `#`, backtick, `~`) — **not `-`**, which would break "Full-Stack" — and a title-only match returns `null` rather than the head of the document, which had been rendering an unhighlighted excerpt that gave the row no visible reason for being there.

### Frontend (`frontend-next`)
- [x] `types/search.ts` (`searchResultHref` is a total `Record` over the five types, so a sixth breaks the build rather than falling through a default), `searchKey`/`searchQuery`, `use-search.ts` (debounced internally at 300ms, gated at 2 characters, `keepPreviousData`).
- [x] **`SearchPalette` — the morph, built over `DialogPrimitive`** per `d-0cbc74`, so focus trap, Escape, scroll lock, focus return and `data-theme-scope` come from the primitive and reduced-motion degrades to a plain centred palette. That degradation **is** the fallback the user reserved: dropping the morph is deleting CSS, not a rewrite.
- [x] **Both the origin and the destination are measured, not hardcoded.** The origin is the clicked trigger's rect — which is what lets one component serve the desktop cluster and the mobile header with no branching. The destination is `.jv-content-col`'s centre: `left: 50%` is viewport-relative, and the 240px rail offsets the column, so the card landed 120px off centre at 1440 and **overlapped the sidebar nav at 1024**. Measuring keeps it right when the rail collapses or the scrollbar width changes.
- [x] **Groups are ordered by their best-ranked member, rows within a group by rank**, so DOM order, visual order and rank order all agree. The first cut painted flat rank order and grouped with CSS `order`, which made ArrowDown teleport the highlight between groups.
- [x] Combobox semantics built by hand (Radix Dialog supplies none): `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, a `role="listbox"` of options, arrow keys, Enter, Escape. The listbox renders whenever the popup is open — gating it on `results.length > 0` left a dangling IDREF and `aria-expanded="false"` over a visible popup.
- [x] `useSearch` reports whether the debounced term has **settled**. Without it the palette rendered "No matches for X" for ~300ms on nearly every search — for a query it had not issued — because `expanded` came from the live term and `data` from the debounced one.
- [x] **⌘K handed over** from `jobs/search-input.tsx`, which bound it on `window` and therefore fired on every page that mounted the field. The palette mounts twice (the desktop cluster is `lg`-only); the hidden mount measuring a zero rect is what stops both answering the chord — asserted with two real mounts, mutation-checked.
- [x] `components/ui/icon-button.tsx` extracted; the bell and the search trigger had gone byte-identical.
- [x] `?persona=<id>` deep link, copying the `?answer=` pattern line for line. An id absent from the list leaves the sheet closed rather than erroring, matching the siblings; no "not found" toast, because none of them have one.

### Verification
- [x] `make gates` — typecheck + lint + **696 backend** / **648 web** tests + production build, green.
- [x] **Adversarially reviewed**: 4 findings confirmed, 28 refuted. Security lens clean on what mattered — all five UNION branches checked individually for `user_id` scoping, every interpolation confirmed a bound `$n` param, no `dangerouslySetInnerHTML`. All 4 findings fixed.
- [x] **Browser-verified** at 1440 / 1024 / 390 by frame extraction and measured rects, twice (the first pass found the centring bug, the second confirmed card centre 840 = column centre 840 and a 104px clearance from the rail at 1024).
- [x] **The morph's real bug was not the fade delay.** `onOpenAutoFocus` called `input.focus()`, and because the card is `overflow-hidden` and 36px wide on the first frame, the browser scrolled it to reveal that input and dragged the header out of the clip box — so the card flew as a blank white pill. `focus({ preventScroll: true })` is the fix. The magnifier is the same glyph in both places, so it needs no cross-fade: it renders at opacity 1 from frame 1 and only the placeholder fades. The trigger's own fade then became harmful — a second magnifier dissolving at an origin the card had already left — and hard-cuts instead.
- [x] The delayed fade also escaped the global reduced-motion rule, whose selector matches the element carrying `data-state` rather than a group descendant; a reduced-motion user saw a blank card for 140ms. Now `motion-safe:`.

**Known noise:** the frontend container serves a **stale Turbopack CSS chunk** after `globals.css` edits — `touch` and a hard reload do not invalidate it (the chunk hash never changes), only `docker compose restart frontend-next` does. A verification pass reproduced the exact pre-fix numbers from cache before this was spotted; restart before trusting any in-browser measurement of a CSS change.

**Deliberately not done:** stripping `_` from snippets (it appears inside identifiers, and no safety argument was available); the 2px height snap at the end of the morph (measured, imperceptible); animating the icon's own 8px offset during travel (needs a second animated element, and the morph reads as continuous without it); a GIN index behind `similarity()` (per `d-0c5wyy`, query time over ~100 rows).

### Partial matching (2026-08-29, branch `search-partial-match`)

> Plan: `docs/superpowers/plans/2026-08-29-partial-substring-search.md` · Tracker: `t-0cbm48`. Raised by the user against the shipped feature: *"it is not about only match from first, it should be a proper partial match."* Two characters now find anything containing them. ~15 lines in `search.repository.ts`, no migration, no new dependency, **no frontend change**.

- [x] **Prefix folds into the existing FTS band**, it is not a new band. `tsQuery()` ORs a `to_tsquery('reac:*')` arm onto the `plainto_tsquery` it already built. That one function feeds both `branch()` and the outer `ts_headline`, so prefix hits are ranked **and highlighted for free** — which is what removed the frontend work the task file originally scoped. Words are rebuilt from the raw input via `[^\p{L}\p{N}]+`, never interpolated: `to_tsquery` parses its argument as tsquery syntax, so a stray `&` or `!` would be a 500.
- [x] **One substring band** — `ILIKE '%q%'` over `Source.trgm`, which was already exactly the short identifying columns (`jobs.[title, company]`, `generated_resumes.title`, `cover_letters.title`, `personas.name`, `question_answers.question`). No sixth `Source` field was needed. It deliberately cannot see body text: `%in%` against `snapshot_markdown` matches every job in the account.
- [x] **Three bands now, the FTS base moved `1.0` → `2.0`**: FTS (exact, stemmed or prefix, incl. bodies) `2.0 + ts_rank` · substring `1.0 + similarity` · trigram `similarity` floored at 0.3. Non-overlapping because both functions are 0..1. The offsets are load-bearing, not cosmetic — measured on the test fixture, the band-2 `similarity` is **0.4348** while the band-1 `ts_rank` is **0.0608**, so without the offsets the ranking inverts.

**The original four-band design was wrong, and measurement is what caught it.** `t-0cbm48` specified FTS · word-start · mid-word · trigram plus a `coverage` ranking function plus client-side highlighting. Against the live DB: `react` appears in **zero** short columns and 16 `snapshot_markdown` bodies, so substring-on-short-fields would still have found nothing for `reac` — prefix FTS is what fixes the motivating example, precisely because it reaches bodies. The word-start/mid-word split and `coverage` were dropped as unmeasured precision; ordering inside the substring band is the `similarity()` already in the query, with the ceiling recorded in a `ponytail:` comment.

**Known regression, accepted and documented in the code.** OR-ing the two tsquery arms moves the query's root node from `OP_AND` to `OP_OR`, and Postgres `calc_rank` dispatches on the root — so `ts_rank` leaves `calc_rank_and` (which weights by `word_distance`) for `calc_rank_or` (which ignores proximity). Multi-word queries lose their adjacency boost. Measured: `staff engineer` against "Staff Frontend Engineer" scored `0.4963` before and `0.0827` after; `software engineer` reordered 1 of 4 rows (max 3 positions), `senior engineer` 2 of 5 (max 2), `react typescript` unchanged. Accepted rather than dropping the `plainto` arm to restore the `OP_AND` root, because plainto's tokenizer emits compound lexemes the word-split loses — an email `a@b.com` is one lexeme to plainto, but `a:* & b:* & com:*` never matches it.

### Verification
- [x] `make gates` green — **701 backend** / **648 web** tests, typecheck, lint, production build.
- [x] **Ground-truth SQL** on seeded data: `reac` → 16 FTS / 0 substring · `gine` → 0 / 18 · `in` → 0 / 19. `in` is a stopword, so both tsquery arms come back empty and `||` absorbs them — a NOTICE, no error, no rows, exactly as designed.
- [x] **Browser-verified** at 1440: `reac` highlights **React** as a real `<mark>` in five job snippets; `gine` returns 7 title-only Engineer rows (correctly snippet-free — the match is in the title the row already shows); `in` returns 9 where it previously returned none; `react` unchanged. No literal `\x02`/`\x03`, no stray markdown, no raw HTML, `/api/search` 200 throughout.
- [x] **Adversarially reviewed**: injection lens **clean** — both new values confirmed bound `$n` params, the `[%_\\]` escape complete (`%`, `_`, `\` are the full LIKE metacharacter set and backslash is the default `ESCAPE`), tenancy intact (the new disjunct sits inside the existing parenthesised group, and `substringMatch` self-parenthesises its own OR chain). 4 findings confirmed, ~20 refuted; all 4 fixed in `5f03f2f`.
- [x] **Two tests were guarding nothing, and both were rebuilt to fail.** `ranks an FTS hit above a substring-only hit` asserted `findIndex === 0` on a **one-row** result set — a tautology that survived deleting the band separation outright. It now seeds a real band-2 competitor (`pre${BODY_TAG}post`, a single lexeme no tsquery arm can reach) and asserts relative order; removing the offsets now fails two tests. The `[%_\\]` escape — the one security-relevant line — had **no test at all**; the new one asserts `'%%'`/`'a%'`/`'_'` return nothing, and fails by dumping the whole account when the escape is removed.

**Deliberately not done:** the word-start/mid-word band split and `coverage` function (unmeasured precision); client-side substring highlighting (prefix hits highlight via `ts_headline`; infix hits matched in the title, which the row already shows); a GIN `gin_trgm_ops` index — `ILIKE '%q%'` cannot use a B-tree, so this is the same unindexed scan `d-0c5wyy` already accepted at ~100 rows per user, and `pg_trgm` is installed so the index is available the day it measures; a mode switch at two vs three characters (full infix from two, which is what was asked for). `job_contacts` remains unsearchable — a separate, untracked gap.
## Mobile Wave 1 — Expo foundation + session-based auth (on `slice-mobile-wave-1` / `slice-auth-sessions` / `slice-mobile-palette`, 2026-08-29)

> Milestone `m-0cc02t` · Runs `x-0cd4o7` (three lanes) and `x-0cd9x9` (two lanes) · Spec `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §8. First code of the mobile app, plus the auth defect it uncovered.

**Shipped:** C0 Expo foundation (`t-0ccxkk`) — SDK 57, RN 0.86.3, NativeWind, four-tab shell per `d-0cd3wr`. Native token auth transport (`t-0ccxkj`). Push delivery (`t-0009`) — `device_tokens`, migration `0015`, plain `fetch` to Expo rather than `expo-server-sdk`.

### The bug the mobile work uncovered (`t-0cd55z`, `d-0cdcga`)

**Refresh-token reuse detection had never fired in production.** `hashSecret` stored refresh tokens with **bcrypt, which truncates input at 72 bytes**; a refresh JWT is ~171 chars and two tokens for the same user share their first 72 — `iat`, `exp` and the signature all sit past the cut. `bcrypt.compare(b, hash(a))` returned **true**, so replaying a rotated token returned **200**. The existing test compared against the literal `'a-different-token'`, whose first 72 bytes genuinely do differ, so it passed and proved nothing. Blast radius was refresh tokens only: API keys are 51 chars and passwords are `.max(72)`, both correct bcrypt uses.

**It was masking a second bug.** `users.refresh_token_hash` was a single column — one refresh token per user. Two devices coexisted *only because* the compare was broken. Fixing the hash alone would have made web and mobile evict each other, so `user_sessions` (migration `0016`) shipped in the same change.

**Two review rounds then found four more HIGH issues, all confirmed empirically:**
- **Access and refresh tokens were interchangeable** — same secret, no discriminator, so a refresh token was a valid `Bearer` credential. A thief never had to call `/refresh`, making the whole revocation mechanism decorative. Mirror case: any 15-minute access token posted to `/refresh` deleted every session for that user. Fixed with a `typ` claim; `verifyToken(token, typ)` takes the expected kind as a **required argument**.
- **Concurrent rotation orphaned a token**, then revoked every device on the next refresh. New regression — bcrypt had masked it.
- **Three concurrent refreshes 401'd the third caller**, which the frontend treats as a dead session, *and* wrote a false reuse alarm for an honest client.
- **The grace arm re-rotated**, demoting the winner's token to a 15s life.

Final shape: rotation is **one atomic UPDATE** accepting the current hash or the previous one inside a **15s grace window**, and the grace arm returns an **access token only** so racers cannot demote each other. Verified independently: three parallel refreshes → 200/200/200, exactly one refresh token issued, one session row. Grace duration matches Auth0's "Rotation Overlap Period" and Okta's `leeway` (capped at 60s); both are one-token-deep, as ours is.

### Mobile palette and the tab bar corner (`t-0cd9jx`)

**Nothing rendered.** Every token in `mobile/src/global.css` was wrapped in CSS `light-dark()`, which `react-native-css@3.0.7` does not implement: lightningcss lowers it inside a custom property to a `var()` pair, and `metro.config.js` sets `inlineVariables: false`, so the runtime stringified `"#706b66,#96918c"` as a colour. Zero warm-toned pixels on screen. **Every gate passed** — `expo export` succeeded, jest passed, and grepping the compiled bundle found the token string present. A bundle grep cannot distinguish "present" from "parses"; only rendering can, which is the argument for having blocked on the device screenshot.

**The corner curved the wrong way.** C0 read "rounded top corners" literally as `rounded-t-[20px]` on the bar. Measured against the user's reference, that is mirrored — and the reference is **not** an inverted corner at all: the page content has rounded **bottom** corners with the bar colour behind, which is what makes it read as OS chrome. One radius moved between elements; no mask, no SVG, no dependency.

**Then it was invisible.** The full-width hairline drew a straight line across the curve, and `--card` #ffffff against `--background` #fefcf9 is 1–3 of 255. Border removed entirely (the reference has none — the contrast *is* the boundary) and the bar surface went dark in light mode via `--tab-bar*` tokens. Contrast 1–3/255 → **18.39:1**. User signed it off on device.

**Deliberately deferred:** mobile dark mode (`t-0cdegw`) — this stack drops **conditional root variables**, proven with four device tests; the fix is NativeWind's `vars` + `VariableContextProvider`, not `dark:` on every utility. Cross-tab refresh lock (`t-0cdbwh`) — the web client's single-flight is a module-scope promise, so it de-duplicates per *tab*; the server grace window is a safety net for jitter, not a substitute. Mobile serif still Instrument Serif where web uses Newsreader (`t-0cd5ka`). Tab bar polish (`t-0cdfyq`).

## Mobile Wave 2 — C1 auth + C2 primitives + serif swap (on `slice-mobile-c1-c2`, 2026-08-31)

> Milestone `m-0cc02t` · Run `x-0cgq5d` (two lanes, one checkout, tier `subagents`) · Spec `docs/superpowers/specs/2026-08-28-mobile-app-expo-scope.md` §2, §2.2, §3.2. **Paused, not shipped** — code landed and all seven gates are green, but nothing has been seen rendering on a device.

**Landed on the branch:** C1 mobile auth (`t-0ccxkl`) — `api-base` runtime host resolution, `auth-store` on `expo-secure-store`, `api-client` with silent refresh, `socket.ts` handshake, `use-auth`, and the `(auth)` login/register screens. C2 primitives (`t-0ccxkm`) — **15 of 16**, plus a `/gallery` route that renders all of them. Serif swap (`t-0cd5ka`) — `@expo-google-fonts/newsreader` replaces Instrument Serif.

Gates green on `a47f27f`: `make typecheck` · `make lint` · `make test` · `npm --prefix mobile run typecheck` · `npm --prefix mobile run lint` · `npm --prefix mobile test` (19 suites / 53 tests) · `blink validate`. **Two of the seven were recorded malformed** — `npm --prefix mobile typecheck` is not a valid npm invocation and needs `run`; bare `npm test` passed only because npm has a builtin `test` alias. Corrected in the run record so a resuming session gets working commands.

### Why it is paused, not done

**Device verification began but did not finish.** The build succeeded, the APK installed and the app launched on the OnePlus (`1d8a211`). The pass first stalled on a secure lock screen — `adb exec-out screencap` returned an all-black frame, and `wm dismiss-keyguard` does not clear a secure keyguard, which needs a fingerprint or PIN. The phone was then unlocked and the pass started; it was **stopped mid-scroll** on request before it reported.

**What it had established before it stopped:** three of the five opacity cases confirmed rendering by exact pixel match. That is real evidence and it is the highest-risk surface — but it is three of five, and it says nothing about the remaining two, the gallery as a whole, the four interactive overlays, the Newsreader face, the auth screens or the tab bar. **Treat the wave as visually unverified**; the outstanding work is one resumed pass on an unlocked device, not a fresh investigation.

That matters here specifically. Wave 1 shipped a palette where **every gate passed and nothing rendered** — `light-dark()` is unimplemented by `react-native-css@3.0.7`, and a bundle grep found the token strings present while the runtime was stringifying `"#706b66,#96918c"` as a colour. **A bundle grep cannot distinguish "present" from "parses"**, and neither can a green test suite. So the same class of defect is still open on this wave's work, and the highest-risk surface is named: every opacity modifier (`bg-primary/10`, `bg-destructive/10`, `bg-muted/50`, `bg-black/40`, `placeholder:text-muted-foreground/60`) compiles to `color-mix(in oklab, …)` — the same CSS-function-lowering family. `react-native-css` does implement `color-mix` at runtime (`native/styles/functions/color-mix.js`, checked rather than assumed), but the failure mode is a missing background, not a crash.

### `d-0cdcga` is stale on logout — the dispatch carried a false contract

C1 was dispatched with "native logout MUST send `{ refreshToken }` in the body or it fails closed and deletes every session". **That is no longer true**, and the lane said so instead of quietly diverging. `ba787fe` ("token kinds, session-bound logout, CAS rotation") moved logout to the session id:

- `auth.controller.ts:69-75` calls `authService.logout(requireUserId(req), req.user?.sid)` and reads no body. The route has no `validate()` schema, so `{ refreshToken }` is inert.
- `auth.service.ts:144-147` — `if (sessionId) deleteById(...) else deleteAllForUser(userId)`.

**The hazard is real but its trigger is different:** the fail-closed path is a **missing `sid` on the access token**, not a missing body. C1 sends the body anyway (as instructed, with a test); it is harmless dead weight that encodes a contract the server does not have. `d-0cdcga` needs an amendment and the client line needs a keep-or-drop call.

### Unfinished, by name

- **`MarkdownProse` not built** — 15 of 16 primitives. Spec §2 names `react-native-markdown-display`; it is not installed and non-font deps were outside the lane's ownership, so it stopped correctly. `repairSplitBold` (the only logic in the web sibling) is ported with tests and the file header carries resume instructions. **That library last released ~2021** — React 19 compatibility is unverified, so "install it" is a decision, not a formality. Nothing needs rendered markdown before C8.
- **`@gorhom/bottom-sheet` not installed.** `d-0cc24z` assigns bottom sheets to it. `Sheet` currently uses React Native's `Modal` with `animationType="slide"` — correct chrome and native slide, but no snap points, no velocity dismiss, no drag-to-close. The documented trap is pre-paid: `GestureHandlerRootView` is already at the root.
- **No root session gate.** Neither lane owns `src/app/_layout.tsx` in the auth direction, so nothing redirects a logged-out user to `/login` or a logged-in user past it. `/login` and `/register` are reachable only by deep link, and the tabs are reachable unauthenticated.
- **`mobile/src/lib/auth-form.tsx` is a deliberate stub** (marked `ponytail:`) — `AuthScreen`/`Field`/`SubmitButton`/`FormError`/`FormFooter` on `react-native-css/components`, living in `lib/` only because `components/ui/` belonged to the other lane. Delete it and rewire the two auth screens onto `Button`/`Input`/`Label`.
- **Consistency debt:** `mobile/src/components/app-header.tsx` and `fab.tsx` hand-roll the circular-icon-pressable that `IconButton` now owns — the repo's named recurring defect, one copy away from a third.
- **`socket.ts` has no consumer** until C6/C8, so realtime could not be smoke-tested.

### Notes worth keeping

- **`expo lint` caches in `mobile/.expo/cache/eslint` and lies.** It reported 9 phantom `import/no-unresolved` errors against newly-created files while `npx eslint .` on the same tree reported zero. Delete the cache dir (gitignored) before trusting it.
- **`t-0cd5ka` overspecified its own done-when.** `mobile/src/theme.ts` holds no font values — only `TAB_BAR_HEIGHT` / `FAB_SIZE` / `FAB_GAP` / `SCREEN_BOTTOM_INSET`. The serif name lives in `global.css` and `_layout.tsx`, both updated; nothing in `theme.ts` needed to change.
- **Dark mode is satisfied at the token level only**, per the deliberate deferral in `t-0cdegw`. No `dark:` utilities and no dark-mode mechanism were added; the dark block in `global.css` is still inert on device.
- **File ownership held again.** Two lanes, one checkout, zero collisions on owned paths. The two crossings were both forced and both declared: the serif lane edited 2 lines of `_layout.tsx` (removing the Instrument Serif package makes its import unresolvable) and added a 6-line `app/gallery.tsx` (a route cannot live under `components/`). One shared-file surprise: `npx expo install` in one lane left `mobile/package.json` + lockfile dirty, and the other lane's `git add` swept them into its commit. Lockfile consistent, nothing lost, but the commit is not purely one lane's.
- **Web-API divergences are all native-idiom forced** and were declared rather than shipped silently: `hover:`→`active:`, `Sheet` enters from the bottom not the right, no Radix `asChild`, `Select` opens our Sheet rather than a second dropdown idiom, `MonogramAvatar` uses literal sRGB because Tailwind v4's oklch palette does not survive this runtime, `cn` without tailwind-merge because clsx/tailwind-merge are not installed.



>
> The sections from here to the end are the pre-migration checklist. The stacks
> they describe (`backend/` NestJS, `frontend/` Nuxt) were **deleted 2026-07-05**;
> their `[T]` / `[ ]` boxes refer to files that no longer exist. Kept as history —
> the shipped equivalents are the Migration Slice sections above. Nothing here was
> converted into a tracker task, deliberately.

## Dependency Diagram

```
BE-01 (Project Setup) ──→ BE-02 (Auth) ──→ BE-03 (Job) ──┬→ BE-04 (Dashboard)
        │                      │                │          ├→ BE-05 (Timeline)
        │                      │                │          └→ BE-08 (Extension)
        │                      └→ BE-06 (Storage) → BE-07 (AI) → BE-05 (Timeline)
        │
FE-01 (Project Setup) → FE-02 (Auth) → FE-03 (Kanban) → FE-04 (Jobs) → FE-05 (Filters)
                                                   │                         │
                                                   └→ FE-06 (Timeline) → FE-07 (AI)
                                                                              │
                                                              FE-08 (Chrome Extension)
```

## Recommended Implementation Order

1. ⚡ **Project Setup** — BE-01 → FE-01
2. ⚡ **Authentication** — BE-02 → FE-02
3. ⚡ **Job Management** — BE-03 → FE-04
4. ⚡ **Dashboard & Kanban** — BE-04 → FE-03
5. **Timeline, Reminders & Notifications** — BE-05 → FE-06
6. **Filtering, Search & List View** — FE-05
7. **File Storage & AI** — BE-06 → BE-07 → FE-07
8. **Chrome Extension** — BE-08 → FE-08

---

## 0. UI Design (Stitch)

### Desktop Screens
- [x] Login page — `screens/48236897aa574537a74ce7ba2ae81e68`
- [x] Register page — `screens/967b798c190a44e386ef211d97ebecb4`
- [x] Dashboard / Kanban board — `screens/a86b3403254d4aa7bf873aed323d6394`
- [x] Job Drawer (slide-over detail panel) — `screens/c588cd259dc044a4967cacbff98335b6`
- [x] Add Job Modal (URL paste + manual tabs) — `screens/f4714572e5cc437683e6dc5348a40411`
- [x] Resume / Profile page — `screens/0de5687ba28a49ea898ec1956191dae6`
- [x] Cover Letter Editor — `screens/5fd1b14d183b4cb4a70503c7503b0afe`
- [x] Timeline & Notifications view — `screens/8ceeac87c17c4ba4b8a2267979da7e3f`
- [x] Profile / Settings page — `screens/b6ce922edf914eebb855c0f12f2b3628`
- [x] List View (table with filters) — `screens/aee03f3fe7a347018ac52c5e54f95358`

### Dark Mode Desktop Screens
- [x] Login page (dark) — `screens/6c33d1a73d9843d98f09e9d0ffd890c5`
- [-] Register page (dark) — generation pending (Stitch timeout)

### Mobile Screens
- [x] Login page (mobile) — `screens/9779cd8b2244493e990e28cdcf54e327`
- [x] Register page (mobile) — `screens/b721a4c2b6aa446fb4972ebe3395dc9c`
- [x] Dashboard / Kanban board (mobile) — `screens/56532cbc1e264285b1ab20a1a1c6c8bc`
- [x] Job Details (mobile) — `screens/0ffd19e1874141bfb2cab851960abbe5`
- [x] Add Job screen (mobile) — `screens/ff21308e4cff45e391d597536a8005b2`
- [x] Resume page (mobile) — `screens/0814dab24d554e85945dc890be486b99`
- [x] Cover Letter Editor (mobile) — `screens/286a259c86cf410cb46e9114be728f48`
- [x] Timeline view (mobile) — `screens/5310cca7537148bf8b35fd77da7c437b`
- [x] Settings page (mobile) — `screens/af5e777ddf494866a8e8657498f26ec5`
- [x] List View (mobile) — `screens/cacf4ef9ac2a4d16adf8747ef150b9ea`

---

## 1. Project Setup & Foundation

> **Dependencies**: None — this is the foundation for everything else
> **Plans**: `plans/backend/01-project-setup.md` · `plans/frontend/01-project-setup.md`

### Backend (BE-01)
- [T] Create NestJS project with dependencies (MikroORM, PostgreSQL driver, helmet, class-validator)
- [T] Configure environment variables (.env, .env.example) and app config
- [T] Set up MikroORM config and database connection
- [T] Create BaseEntity (UUID id, createdAt, updatedAt)
- [T] Create global pipes, filters, interceptors (ValidationPipe, HttpExceptionFilter, TransformInterceptor)
- [T] Create pagination DTOs (PaginationQueryDto, PaginatedResponse)
- [T] Configure main.ts (global prefix `/api`, CORS, helmet, validation)
- [T] Create Dockerfile + docker-compose.yml with PostgreSQL
- [ ] Run initial migration and verify connection

### Frontend (FE-01)
- [T] Initialize Nuxt 3 project with @nuxt/ui, Tailwind CSS, ESLint
- [T] Configure nuxt.config.ts (modules, runtime config, proxy rules)
- [T] Configure app.config.ts for Nuxt UI theming (glassmorphism tokens, dual theme)
- [T] Create CSS assets (main.css with Tailwind + glassmorphism utilities)
- [T] Create type definitions (types/api.ts — ApiResponse, PaginatedResponse, ApiError)
- [T] Create utilities (constants.ts, formatters.ts)
- [T] Create composables (useApi.ts, useToastNotify.ts)
- [T] Create layout components (AppHeader.vue, AppFooter.vue, LoadingSpinner, EmptyState)
- [T] Create layouts (default.vue, auth.vue) with glassmorphism styling
- [T] Create auth middleware stub and index redirect page
- [T] Create Dockerfile and verify dev server starts

---

## 2. Authentication

> **Dependencies**: Project Setup (1)
> **Plans**: `plans/backend/02-auth-module.md` · `plans/frontend/02-auth.md`

### Backend (BE-02)
- [T] Create User entity (name, email, passwordHash, googleId, preferences, refreshTokenHash)
- [T] Create User migration
- [T] Create auth DTOs (RegisterDto, LoginDto, RefreshTokenDto, UpdateProfileDto, AuthResponseDto)
- [T] Create JWT strategy, JwtAuthGuard, @CurrentUser() decorator
- [T] Create AuthService (register, login, refresh, logout, Google login, profile CRUD)
- [T] Create AuthController (8 endpoints: register, login, refresh, logout, Google OAuth, me, profile)
- [T] Create Google OAuth strategy and GoogleAuthGuard
- [T] Wire AuthModule into AppModule
- [ ] Test auth flows (register, login, token refresh/rotation, protected routes, OAuth)

### Frontend (FE-02)
- [T] Create auth types (types/auth.ts — User, credentials, tokens, profile)
- [T] Create useAuth composable (login, register, logout, refresh, session restore)
- [T] Update useApi to integrate token attachment and 401 auto-refresh
- [T] Create auth form components (LoginForm, RegisterForm, GoogleOAuthButton) with glassmorphism
- [T] Create auth pages (login.vue, register.vue, auth/google/callback.vue)
- [T] Create profile page (user info, preferences, theme toggle)
- [T] Update auth middleware with full guard logic
- [T] Integrate user menu into AppHeader

---

## 3. Job Management & Scraping

> **Dependencies**: Authentication (2)
> **Plans**: `plans/backend/03-job-module.md` · `plans/frontend/04-job-management.md`

### Backend (BE-03)
- [T] Create JobStatus enum and Job entity (title, company, location, salary, sourceUrl, snapshotMarkdown, status, kanbanOrder, ghostDays, notes)
- [T] Create Job migration
- [T] Create job DTOs (CreateJobDto, CreateJobFromUrlDto, UpdateJobDto, MoveJobDto, JobQueryDto)
- [T] Create MarkdownService (HTML → Markdown via Turndown)
- [T] Create ScraperService (Cheerio extraction + Gemini fallback)
- [T] Create JobService (CRUD, scrape, move, ghost tracking, filters)
- [T] Create JobController (7 endpoints: create, scrape, list, get, update, move, delete)
- [T] Wire JobModule and test (CRUD, scraping, filters, kanban move, pagination)

### Frontend (FE-04)
- [T] Create/extend job types (CreateJobFromUrlRequest, CreateJobManualRequest, ScrapeResult)
- [T] Create useJobDrawer composable (drawer state, job fetching, CRUD)
- [T] Create AddJobModal with URL paste + manual entry tabs (glassmorphism modal)
- [T] Create UrlPasteForm (URL input, scrape preview, loading states)
- [T] Create ManualJobForm (full job fields, validation)
- [T] Create JobDrawer (USlideover — split panel with glass effect)
- [T] Create JobSnapshot component (markdown renderer)
- [T] Create JobDetails panel (info section, notes editor, status actions)
- [T] Integrate drawer into KanbanCard click and add "Add Job" buttons

---

## 4. Dashboard & Kanban Board

> **Dependencies**: Authentication (2) — can be built in parallel with Job Management (3)
> **Plans**: `plans/backend/04-dashboard-api.md` · `plans/frontend/03-dashboard-kanban.md`

### Backend (BE-04)
- [T] Create dashboard DTOs (KanbanCardDto, KanbanColumnDto, KanbanBoardResponseDto, DashboardStatsDto)
- [T] Create DashboardService (getKanbanBoard, getStats with filters)
- [T] Create DashboardController (2 endpoints: kanban, stats)
- [T] Wire DashboardModule and test (6 columns, filters, stats, empty state)

### Frontend (FE-03)
- [T] Create job types (types/job.ts — Job, JobCard, KanbanColumn, DashboardStats, MoveJobRequest)
- [T] Create GhostMeter component (color-coded ghost days: green/yellow/red)
- [T] Create KanbanCard component (glassmorphism card with hover lift animation)
- [T] Create KanbanColumn component (droppable area, colored border, count header)
- [T] Create KanbanBoard component (6 fixed columns, horizontal scroll)
- [T] Create useJobs composable (fetchKanban, moveJob, optimistic updates, rollback)
- [T] Install vue-draggable-plus and implement drag-and-drop with ghost styles
- [T] Create DashboardStats component (stat cards with glass effect)
- [T] Create ViewToggle component (Kanban/List toggle)
- [T] Create dashboard.vue page (stats, toggle, board, loading/empty states)

---

## 5. Timeline, Reminders & Notifications

> **Dependencies**: Job Management (3)
> **Plans**: `plans/backend/05-timeline-reminders.md` · `plans/frontend/06-timeline-reminders.md`

### Backend (BE-05)
- [T] Create entities (TimelineEvent, Reminder, Notification) and migrations
- [T] Create DTOs for timeline events, reminders, notifications
- [T] Create TimelineService (getJobTimeline, addManualEntry, addAutoEntry)
- [T] Create TimelineController (get timeline, add manual entry)
- [T] Create ReminderService + ReminderController (CRUD for reminders)
- [T] Create NotificationService + NotificationController (list, mark read, mark all read)
- [T] Create SchedulerService with crons (daily ghost update, 10-min reminder check)
- [T] Integrate auto timeline entries into JobService (status change, creation)
- [T] Wire all modules and test (endpoints, crons, cascading deletes)

### Frontend (FE-06)
- [T] Create types (timeline.ts, reminder.ts, notification.ts)
- [T] Create useTimeline, useReminders, useNotifications composables
- [T] Create timeline components (TimelineEntry, AddTimelineEntry, JobTimeline)
- [T] Create reminder components (ReminderItem, AddReminderForm, ReminderList)
- [T] Create notification components (NotificationBell with badge, NotificationPopover)
- [T] Integrate notification bell into AppHeader
- [T] Update JobDetails with tabs (Timeline, Reminders, Notes, Cover Letter)
- [T] Set up notification polling (60s interval, pause on tab hidden)

---

## 6. Filtering, Search & List View

> **Dependencies**: Dashboard & Kanban (4), Job Management (3)
> **Plans**: `plans/frontend/05-ghost-search-listview.md` (frontend only)

### Frontend (FE-05)
- [ ] Create filter types (types/filters.ts — GhostFilter, SortField, JobFilters)
- [ ] Create useJobFilters composable (filter state, query builder, reset)
- [ ] Create HeaderSearchBar (debounced input, Cmd/Ctrl+K shortcut)
- [ ] Create DashboardFilters (status, ghost, sort selects + reset button)
- [ ] Update useJobs to accept and apply filters
- [ ] Create JobListView component (UTable with sortable columns, pagination)
- [ ] Update dashboard.vue with filters bar and conditional kanban/list rendering
- [ ] Implement URL query param syncing with filters

---

## 7. File Storage & AI / Gemini

> **Dependencies**: Auth (2), Job Management (3), Timeline (5)
> **Plans**: `plans/backend/06-file-storage.md` · `plans/backend/07-ai-gemini.md` · `plans/frontend/07-ai-module.md`

### Backend — File Storage (BE-06)
- [ ] Configure Cloudinary integration
- [ ] Create CloudinaryService (upload, delete)
- [ ] Create file-upload interceptor (Multer — PDF/DOCX, 10MB max)
- [ ] Create StorageController (resume upload, cover letter PDF download)
- [ ] Wire StorageModule and test (upload, validation, PDF generation)

### Backend — AI / Gemini (BE-07)
- [ ] Create CoverLetter entity and migration
- [ ] Create cover letter DTOs and Gemini prompt templates
- [ ] Create GeminiService (generateText, generateStructuredOutput)
- [ ] Create ResumeParserService (PDF/DOCX text extraction → MasterProfile structuring)
- [ ] Create AiRateLimiter (10 generations/hour per user)
- [ ] Create CoverLetterService + CoverLetterController (generate, CRUD)
- [ ] Wire CoverLetterModule and test (generation, rate limiting, CRUD)

### Frontend (FE-07)
- [ ] Create types (resume.ts, cover-letter.ts)
- [ ] Create useResume and useCoverLetter composables
- [ ] Install TipTap dependencies and create TipTapEditor wrapper
- [ ] Create resume components (ResumeUpload dropzone, MasterProfileView, MasterProfileEditor)
- [ ] Create resume.vue page (upload + profile management)
- [ ] Create cover letter components (Generator, Editor, Export, List) with glassmorphism
- [ ] Integrate cover letter tab into JobDetails drawer

---

## 8. Chrome Extension

> **Dependencies**: Auth (2), Job Management (3), Timeline (5)
> **Plans**: `plans/backend/08-extension-api.md` · `plans/frontend/08-chrome-extension.md`

### Backend (BE-08)
- [ ] Create ApiKey entity and migration
- [ ] Create extension DTOs (CreateApiKeyDto, QuickCreateJobDto, CheckUrlQueryDto)
- [ ] Create ApiKeyGuard (X-API-Key header auth) and @ApiKeyUser() decorator
- [ ] Create ExtensionService (key management, quick create, URL check, URL normalization)
- [ ] Create ExtensionController (3 extension endpoints) + API key routes on AuthController
- [ ] Wire ExtensionModule and test (key CRUD, quick create, duplicate detection)

### Frontend — Chrome Extension (FE-08)
- [ ] Initialize extension project (Vite + Vue 3 + Tailwind, manifest.json MV3)
- [ ] Create shared types, constants, and chrome.storage wrapper
- [ ] Create content scripts (LinkedIn, Indeed, generic extractors + job page detector)
- [ ] Create overlay ("Save to JobVault" floating button)
- [ ] Create background service worker (message handling, badge updates)
- [ ] Create popup app (LoginView, CaptureView, SuccessView, SettingsView)
- [ ] Create extension composables (useExtAuth, useExtApi)
- [ ] Build and test in Chrome (load unpacked, verify all flows)

---

## 9. Public Pages (Landing + Shared Components)

> **Dependencies**: FE-01 (Project Setup), Route restructuring (complete)
> **Plans**: `plans/frontend/09-public-pages.md`

### Frontend (FE-09)
- [x] Install gsap dependency
- [x] Create useScrollReveal composable (GSAP ScrollTrigger wrapper)
- [x] Add hero-bg gradient CSS class to main.css
- [x] Build WebNavbar (fixed, transparent-to-glass on scroll, auth-aware, mobile slideover)
- [x] Build WebFooter (4-column grid, social icons, glass styling)
- [x] Update web.vue layout with pt-16 for fixed navbar
- [x] Build landing page (index.vue) with all 7 sections + scroll animations
- [x] Landing page SSR works (view source shows rendered HTML)
- [x] All sections render in both light and dark mode
- [x] All sections are responsive (mobile, tablet, desktop)

---

## 10. Secondary Public Pages

> **Dependencies**: FE-09 (Public Core — web layout, WebNavbar, WebFooter, useScrollReveal)
> **Plans**: `plans/frontend/10-secondary-pages.md`

### Frontend (FE-10)
- [x] FAQ page with UAccordion containing 8 Q&A items inside glass card
- [x] About page with mission text (3 paragraphs) and 3 values cards in grid
- [x] Contact page with form (name, email, subject, message) + validation + toast on submit
- [x] Contact page with email info card and social media links
- [x] Privacy Policy page with 6 sections, prose styling
- [x] Terms & Conditions page with 8 sections, prose styling
- [x] All pages use `layout: 'web'` and have `useSeoMeta()` with proper SEO tags
- [x] All pages have scroll-reveal animations on headings and content
- [x] All pages render correctly in light and dark modes
- [x] All pages are responsive (mobile, tablet, desktop)
