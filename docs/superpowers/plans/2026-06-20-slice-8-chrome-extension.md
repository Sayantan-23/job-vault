# Slice 8 — Chrome Extension (one-click "Save to JobVault")

> Status: **PLAN — awaiting review.** Date: 2026-06-20. Branch (when execution starts): `slice-8-chrome-extension`.
>
> This plan supersedes the pre-migration `plans/frontend/08-chrome-extension.md` and `plans/backend/08-extension-api.md` (NestJS + Vue era). It keeps their good bones (MV3, content-script extractors, API-key auth, quick-create + dedup) and retargets everything to the current **Express + Next.js** stack, with a smoother auth handoff and client-first extraction.

---

## 1. Goal

Ship a Manifest V3 Chrome extension that lets a logged-in JobVault user save a job posting from LinkedIn / Indeed / most job boards in **one click**, pre-filled from the live page, deduplicated, landing in their **Wishlist** with a timeline entry — without copy-pasting anything (URLs *or* API keys).

## 2. Locked decisions (from brainstorming)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **React + Vite + Tailwind v4 + TypeScript**, reusing minimalist-ui tokens/primitives. Not literally Next.js (no SSR in a popup). | Migration's whole point is getting off Vue; match the app's tooling/design, bundle to MV3 with Vite. |
| 2 | **Client-first extraction**: per-site content scripts read the live DOM; backend `/scrape` is a fallback for pages the content script can't parse. Reuse the app's `ok / partial / empty` confidence model. | The extension runs *inside* the rendered, logged-in page → bypasses the bot-walls that force the server's render+AI fallback. |
| 3 | **One-click "Connect with JobVault"** via `chrome.identity.launchWebAuthFlow`, backed by a revocable, least-privilege API key. Manual key paste kept only as a hidden backstop. | No clipboard ferrying; reuses the user's existing first-party web session; secure (token via `chromiumapp.org` fragment, never a server log). |
| 4 | **Popup-only** capture UI (no injected overlay button yet), good-looking minimalist UI. | Robust against site DOM churn; the overlay can come later. |
| 5 | **LinkedIn + Indeed + generic (schema.org `JobPosting` / OpenGraph)** at launch. | Generic JSON-LD path also covers Greenhouse/Lever/Ashby for free. |
| 6 | **Dev / load-unpacked** distribution now; a release/packaging doc later. | Mid-migration, personal use. |

### Key security decision — we do NOT weaken the web app's cookies

The extension's **runtime** calls (`/api/extension/*`) authenticate with an **`X-API-Key` header**, not cookies. So the web app's `SameSite=Lax` HttpOnly cookies stay exactly as they are — no switch to `SameSite=None`, no CSRF-posture regression. The only cookie-authed call in the whole flow (minting a key) happens **same-origin** from our own `/extension/authorize` page. The only CORS change is adding the extension's `chrome-extension://<id>` origin to `CORS_ORIGINS` so the header-authed runtime calls are allowed.

---

## 3. Architecture

### 3.1 The connect flow (`launchWebAuthFlow`)

```
Extension popup                Chrome identity            JobVault frontend            JobVault backend
─────────────                  ───────────────            ─────────────────            ────────────────
click "Connect"
  generate `state` nonce
  redirectUrl = chrome.identity.getRedirectURL()   // https://<EXT_ID>.chromiumapp.org/
  launchWebAuthFlow({ url:
    APP/extension/authorize?state=…&redirect_uri=redirectUrl, interactive:true })
                               opens auth window ───▶  /extension/authorize (PUBLIC page)
                                                        ├─ validate redirect_uri ∈ allowlist
                                                        ├─ if NOT logged in → inline login/register
                                                        │     (returnTo stays on this page)
                                                        └─ if logged in → "Connect to {email}" [Connect]
                                                              on click:  POST /api/api-keys {name} ─▶ mint key (cookie-auth)
                                                                          ◀─ { rawKey } (shown once)
                                                        window.location = redirect_uri#token=rawKey&state=…
                               captures redirect ◀────
  callback receives URL
  verify `state` matches
  store rawKey in chrome.storage.local
  ▶ verify via POST /api/extension/verify-key (X-API-Key)
  Connected ✅
```

Security controls baked in:
- **`state` nonce** — extension-generated, verified on return → blocks CSRF/replay.
- **`redirect_uri` allowlist** — the authorize page only ever redirects a freshly-minted token to the pinned extension's `https://<EXT_ID>.chromiumapp.org/`. The extension ID is pinned via a manifest `key`, so it's stable in dev and prod. This is the control that stops a malicious authorize link from exfiltrating a token.
- **Token in URL fragment** (`#token=…`), never query → not sent to any server, not logged.
- **Explicit interactive consent** — minting requires a logged-in first-party session **and** a "Connect" click. No silent issuance.

### 3.2 Data model — `api_keys` table (migration `0011`)

Mirrors the Drizzle conventions (`uuid` PK `.defaultRandom()`, timestamptz `created_at/updated_at .notNull().defaultNow()`, `user_id` FK cascade, `idx_<table>_<col>` indexes).

```ts
// src/db/schema/api-keys.ts
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),                  // e.g. "Chrome Extension"
  keyPrefix: text('key_prefix').notNull(),       // non-secret, indexed, shown in UI: 'jv_1a2b3c4d'
  keyHash: text('key_hash').notNull(),           // bcrypt(rawKey)
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),   // null = non-expiring (default null for now)
  revokedAt: timestamp('revoked_at', { withTimezone: true }),   // soft-revoke (keeps audit trail)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_api_keys_user_id').on(t.userId),
  index('idx_api_keys_key_prefix').on(t.keyPrefix),
])
```

- **Raw key shape:** `jv_` + 48 hex chars (`crypto.randomBytes(24)`), 192-bit secret. Shown **once**.
- **Active** = `revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > now())`.
- **Verification** (in `apiKeyMiddleware`): take the incoming key's prefix (`jv_` + first 8 hex) → look up active rows by `keyPrefix` → `compareSecret(rawKey, keyHash)` (bcrypt). On success set `req.apiKey = { id, userId }` and best-effort update `lastUsedAt`.
- Reuse `hashSecret` / `compareSecret` from `auth.tokens.ts` (bcrypt, 12 rounds). **Do not** sign a JWT — extension tokens are long-lived bearer secrets, not session tokens.

### 3.3 Endpoints

**`api-keys` module** — first-party management, `authMiddleware` (cookie JWT):
| Method | Path | Body / Query | Returns |
|--------|------|--------------|---------|
| `POST` | `/api/api-keys` | `{ name }` | `{ id, name, keyPrefix, rawKey, createdAt }` — `rawKey` **only here** |
| `GET` | `/api/api-keys` | — | `[{ id, name, keyPrefix, lastUsedAt, createdAt }]` (active only) |
| `DELETE` | `/api/api-keys/:id` | — | `204` (sets `revokedAt`) |

**`extension` module** — extension runtime, `apiKeyMiddleware` (`X-API-Key`):
| Method | Path | Body / Query | Returns |
|--------|------|--------------|---------|
| `POST` | `/api/extension/verify-key` | — | `{ ok: true, user: { email } }` |
| `GET` | `/api/extension/check-url` | `?url=` | `{ isDuplicate, job?: { id, title, company, status } }` |
| `POST` | `/api/extension/jobs` | `QuickCreateJob` | `{ id, title, company, status, isDuplicate }` |
| `POST` | `/api/extension/scrape` *(fallback, last task)* | `{ sourceUrl }` | `ScrapeResult` (reuses `scrapeUrl`) |

`QuickCreateJob` = `{ title, company, location?, salaryRange?, sourceUrl?, snapshotMarkdown?, description? }` (a thin superset of `CreateJobSchema`; `description` is accepted as an alias mapped to `snapshotMarkdown` if the extractor returns plain description text). All routes rate-limited (e.g. `extensionLimiter`: 120 req/min per IP).

### 3.4 Dedup + timeline reuse

- Add `findByNormalizedSourceUrl(userId, normalizedUrl)` to `jobs.repository.ts`.
- `extension.service` normalizes `sourceUrl` with the **existing** `normalizeJobUrl()` from `scraper.ts` (canonicalizes LinkedIn `currentJobId` → `/jobs/view/<id>`; other hosts pass through), checks dedup; if found returns the existing job with `isDuplicate: true` (no write).
- On create, call `jobsService.create(userId, input, { autoEntryTitle: 'Added via Chrome Extension' })`. **Change required:** extend `jobsService.create` to accept an optional `options?: { autoEntryTitle?: string; autoEntryDescription?: string }` that overrides the default `emitAutoEntry` text (default stays `'Job added to vault'`). Timeline events remain `type: 'AUTO'` (the enum is `AUTO|MANUAL`; source is conveyed via title text). Failures stay swallowed (non-fatal), as today.

### 3.5 Frontend surface

- **Connected Apps** = a **section inside the existing `/app/settings`** (`SettingsWorkspace` + a new `ConnectedAppsSection`), not a sub-route — matches the codebase's minimalist single-page settings pattern. Lists active keys (name, prefix, last used, created), **Revoke** via the existing `useConfirm` + `ConfirmDialog`, and a small "Generate key manually" backstop that shows the raw key once. Hooks in `use-api-keys.ts`.
- **`/extension/authorize`** = a **PUBLIC page** placed in the `(auth)` route group (`src/app/(auth)/extension/authorize/page.tsx`) so the middleware (`matcher: ['/app/:path*']`) does **not** gate it. It reuses the auth theme + login/register forms.
  - New hook `useOptionalCurrentUser()` — `GET /api/auth/me`, `retry:false`, **does not redirect on 401**, returns `user | null`.
  - `useLogin` / `useRegister` gain an optional `onSuccess`/`redirectTo` override so the inline forms on this page refetch the user **in place** instead of hard-redirecting to `/app/dashboard`.

### 3.6 Extension project layout (new top-level `extension/`)

```
extension/
  package.json            # react, react-dom, vite, @crxjs/vite-plugin, tailwindcss v4, @types/chrome, vitest, jsdom
  vite.config.ts          # @crxjs/vite-plugin (fallback: manual multi-entry Vite)
  manifest.config.ts      # MV3: key (pin id), permissions[storage,activeTab,scripting,identity], host_permissions, action(popup), background, content_scripts
  tsconfig.json
  src/
    popup/                # React app: index.html, main.tsx, App.tsx
      views/              # ConnectView, CaptureView, SuccessView, SettingsView
    content/              # detector.ts, extractors/{linkedin,indeed,generic}.ts, extract.ts (orchestrator), index.ts
    background/           # service-worker.ts (message routing + launchWebAuthFlow driver)
    lib/                  # api.ts (X-API-Key fetch, configurable serverUrl), auth.ts (connect/disconnect), storage.ts, types.ts, confidence.ts
    ui/                   # ported minimalist primitives: Button, Input, Label, Spinner, EmptyState
    styles/               # tailwind.css + app tokens copied from frontend theme.css
  icons/                  # 16, 32, 48, 128
  README.md               # load-unpacked instructions
```

- **`identity` permission** is required for `launchWebAuthFlow`.
- **`host_permissions`**: `https://www.linkedin.com/*`, `https://*.indeed.com/*`, and the backend origin (`http://localhost:3100/*` dev; prod URL later). Server URL is configurable in Settings, default from a build-time env.
- Use the **`minimalist-ui` skill** when building popup UI. Popup ~380px wide; reuse warm-stone tokens, indigo accent, Geist.

---

## 4. Implementation phases (TDD, commit per task)

Backend: `npm run typecheck && lint && test` (vitest + real Postgres for repos). Frontend: `typecheck && lint && test && build`. Extension: `typecheck && lint && test` (vitest + jsdom). Don't run two `next build`/`vitest` in the same dir concurrently.

### Phase A — Backend: `api_keys` table + `api-keys` module
- [x] **A1.** Add `src/db/schema/api-keys.ts` + barrel export in `index.ts`. Run `db:generate` → migration `0011_*.sql`; `db:migrate`. *(verify table/indexes created)*
- [x] **A2.** `api-keys.schema.ts` (`CreateApiKeySchema { name }`) + schema test.
- [x] **A3.** `api-keys.repository.ts` (`create`, `listActiveForUser`, `findActiveByPrefix`, `revoke`, `touchLastUsed`) + repository test (real PG): hash stored, prefix indexed, revoke soft-deletes, expired/revoked excluded.
- [x] **A4.** `api-keys.service.ts` (`createKey` → generate `jv_`+hex, bcrypt-hash, return raw once; `list`; `revoke`) + service test.
- [x] **A5.** `src/middleware/api-key.middleware.ts` + extend `src/types/express.d.ts` with `apiKey?: { id, userId }`. Verifies `X-API-Key` by prefix→`compareSecret`, sets `req.apiKey`, best-effort `touchLastUsed`. Unit test: valid/invalid/revoked/expired/missing.
- [x] **A6.** `api-keys.controller.ts` + `api-keys.router.ts` (authMiddleware, rate-limited create); mount `/api-keys` in `shared/api-router.ts`. Integration test: create→list→revoke→list-empty; raw key only on create.

### Phase B — Backend: `extension` module + dedup + timeline option
- [x] **B1.** Add `findByNormalizedSourceUrl(userId, normalizedUrl)` to `jobs.repository.ts` + test.
- [x] **B2.** Extend `jobsService.create` signature with optional `options?: { autoEntryTitle?; autoEntryDescription? }`; default unchanged. Update/extend jobs.service test for the override.
- [x] **B3.** `extension.schema.ts` (`QuickCreateJobSchema`, `CheckUrlSchema { url }`) + test.
- [x] **B4.** `extension.service.ts`: `verifyKey` (returns user email), `checkUrl` (normalize + dedup lookup), `quickCreateJob` (normalize → dedup → existing-or-create with `'Added via Chrome Extension'` auto-entry). Service test (dedup hit/miss, timeline title, WISHLIST default).
- [x] **B5.** `extension.controller.ts` + `extension.router.ts` (apiKeyMiddleware + `extensionLimiter`); mount `/extension`. Integration test: header-auth on all routes (401 without key), verify/check-url/quick-create, dedup returns existing.
- [x] **B6.** *(fallback, may defer within slice)* `POST /api/extension/scrape` reusing `scrapeUrl` under apiKeyMiddleware + per-user budget; integration test.
- [x] **B7.** Add the extension origin to `CORS_ORIGINS` handling (env + `.env.example` doc); confirm preflight for `chrome-extension://` origin is allowed. *(manual curl/preflight check)*

### Phase C — Frontend: Connected Apps in Settings
- [x] **C1.** `src/types/extension.ts` (`ConnectedApp`, `CreatedApiKey`) + `use-api-keys.ts` hooks (`useApiKeys`, `useCreateApiKey`, `useRevokeApiKey`) + query-keys entry. Hook test (msw or mocked apiClient).
- [x] **C2.** `ConnectedAppsSection` (component) wired into `SettingsWorkspace`: list, last-used, **Revoke** via `useConfirm`/`ConfirmDialog`, "Generate key manually" → one-time reveal with copy. Component test (list renders, revoke confirm, reveal-once). Reuse Button/Input/Label/SettingsSection.

### Phase D — Frontend: `/extension/authorize` public page
- [x] **D1.** `useOptionalCurrentUser()` hook (no redirect on 401) + test.
- [x] **D2.** Add optional `onSuccess`/`redirectTo` to `useLogin`/`useRegister` (default behavior unchanged) + `InlineAuthForm` (compact login/register toggle reusing existing schemas) + test.
- [x] **D3.** `src/app/(auth)/extension/authorize/page.tsx` + `AuthorizeFlow` client component: parse + **validate `redirect_uri`** against allowlist (configurable extension id), `state` passthrough; logged-out → `InlineAuthForm`; logged-in → "Connect to {email}" → `POST /api/api-keys` → `window.location.assign(redirect_uri#token&state)`. Component test: invalid redirect rejected, logged-out shows form, logged-in shows connect, connect redirects with token+state.

### Phase E — Extension scaffold
- [x] **E1.** `extension/` project: `package.json`, `vite.config.ts` (@crxjs), `tsconfig`, Tailwind v4 + copied tokens, lint config matching repo. `manifest.config.ts` with pinned `key`, permissions, host_permissions, action popup, background, content_scripts (linkedin/indeed/generic match patterns). `npm run build` produces a loadable `dist/`. Placeholder popup renders. *(load-unpacked smoke)*
- [x] **E2.** `lib/storage.ts` (typed `chrome.storage.local` wrapper: token, serverUrl, settings) + `lib/types.ts` (`ExtractedJobData`, `Confidence`, `ExtensionSettings`) + tests (mock `chrome.storage`).
- [x] **E3.** `lib/api.ts` — `X-API-Key` fetch against configurable `serverUrl`, `{data}`/error envelope unwrap; `verifyKey`, `checkUrl`, `quickCreate`, `scrape` + tests.

### Phase F — Extension auth (connect)
- [x] **F1.** `lib/auth.ts` + `background/service-worker.ts`: generate `state`, `launchWebAuthFlow`, parse `#token&state`, verify `state`, store token, `verifyKey`. Test the URL-parse/`state`-verify logic (pure functions); mock `chrome.identity`.

### Phase G — Extension extractors (client-first)
- [x] **G1.** `content/detector.ts` (URL → platform) + test.
- [x] **G2.** `content/extractors/linkedin.ts` — **scope to the focused detail-pane container** + read `currentJobId` from URL; handle split-pane (`/jobs/search?currentJobId=`) and standalone (`/jobs/view/<id>`); canonical `sourceUrl`. Test with saved DOM fixtures (jsdom) incl. the split-pane layout.
- [x] **G3.** `content/extractors/indeed.ts` — `data-testid` selectors + `all_frames` consideration for the JD iframe. Test with fixtures.
- [x] **G4.** `content/extractors/generic.ts` — schema.org `JobPosting` JSON-LD → OpenGraph → `<h1>`/`<title>` fallback. Test with fixtures (incl. a Greenhouse/Lever-style JSON-LD page).
- [x] **G5.** `content/extract.ts` orchestrator + `lib/confidence.ts` (`ok|partial|empty`); `content/index.ts` responds to popup/background messages. Test the orchestrator + confidence scoring.

### Phase H — Extension popup UI (minimalist-ui skill)
- [x] **H1.** Port `ui/` primitives (Button, Input, Label, Spinner, EmptyState) + base styles/tokens.
- [x] **H2.** `ConnectView` — disconnected empty state ("Connect JobVault to start saving jobs" + one button; "New here? You'll create your account in the next step"); triggers connect; handles user closing the window mid-flow (stays disconnected, no error).
- [x] **H3.** `CaptureView` — on open: run extractor, pre-fill form, call `check-url` → show "Already saved ↗" if dup; **Save** → `quick-create`; `partial/empty` → editable manual fill (+ optional "Try smart capture" calling `/extension/scrape`).
- [x] **H4.** `SuccessView` — confirmation + "Open in JobVault ↗".
- [x] **H5.** `SettingsView` — connected account, server URL, **Disconnect** (revoke locally + optionally call DELETE), about.
- [x] **H6.** `App.tsx` view router by auth + capture state.

### Phase I — Wiring, smoke, docs
- [ ] **I1.** End-to-end **manual smoke** on the Docker stack: connect (logged-in AND brand-new-user inline signup), capture on LinkedIn split-pane + standalone, Indeed, one generic board; dedup; Connected Apps revoke kills the extension. Record a GIF.
- [x] **I2.** `extension/README.md` (load-unpacked, dev backend URL, pinning the id). Note Web-Store packaging doc as **deferred** in `docs/deferred-tasks.md`.
- [x] **I3.** Update `progress.md` + `CLAUDE.md` current-state line. Adversarial review pass (4-lens) per slice convention; fix findings.

---

## 5. Testing strategy
- **Backend:** schema/service/repository/router unit + integration (real Postgres). Cover: key gen+hash+prefix, middleware (valid/invalid/revoked/expired), dedup hit/miss, quick-create defaults + timeline title, CORS preflight for extension origin.
- **Frontend:** hooks (optional-current-user no-redirect, api-keys CRUD), `ConnectedAppsSection`, `AuthorizeFlow` (redirect-uri validation is the critical case).
- **Extension:** extractors against saved DOM fixtures (the LinkedIn split-pane case is mandatory), detector, storage/api/auth libs (mock `chrome.*`). Popup views: render + key interactions.
- **Manual:** the I1 smoke matrix.

## 6. Risks & mitigations
- **Site DOM churn** breaking extractors → fixtures + graceful `partial` fallback to manual/backend-scrape; isolate per-site selectors.
- **Extension id stability** → pin via manifest `key` so the `chromiumapp.org` redirect + CORS origin are constant across dev/prod.
- **`redirect_uri` abuse** → strict allowlist on the authorize page (covered above); token in fragment only.
- **`@crxjs/vite-plugin` instability** → fallback path is plain Vite multi-entry + static `manifest.json` (E1 keeps this optional).
- **Cross-origin from extension** → header-auth (no cookies) + add `chrome-extension://<id>` to `CORS_ORIGINS`; no `SameSite` change.

## 7. Deferred (out of scope for this slice)
- Injected on-page **overlay** save button.
- **Chrome Web Store** submission + packaging/release doc.
- More job boards (Glassdoor, Wellfound, Workday) — add via new extractors when needed.
- Cross-platform URL normalization for dedup (currently LinkedIn-canonical; others dedup on exact normalized URL).
- Firefox/Edge ports.

## 8. Decisions worth a second look before we build
1. **Extension build tool:** `@crxjs/vite-plugin` (recommended) vs plain Vite multi-entry. (E1 supports either.)
2. **Manual "Generate key" backstop** in Settings — keep it (recommended, costs little) or rely purely on the connect flow?
3. **`/api/extension/scrape` fallback** — build it this slice (B6/H3) or defer until a generic board actually under-extracts?
4. **Connected Apps placement** — section in `/app/settings` (recommended) vs its own route.
