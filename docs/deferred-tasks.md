# Deferred Tasks — Backlog

Work intentionally scoped **out** of the migration slices (almost all from **Slice 4 — Timeline / Reminders / Notifications / Real-time**). Nothing here blocks shipped functionality; each item is a future enhancement with its **trigger** (the condition that makes it worth doing) noted. Roughly ordered by likely priority.

> Source of truth for what *shipped*: `progress.md` + `docs/superpowers/specs/2026-06-03-slice-4-timeline-reminders-notifications-design.md` (§11 "Out of scope / deferred").

---

## Likely next

### Email reminders / notifications (delivery channel)
**What:** When a reminder comes due (or any notification is created), also deliver it by **email** — not just in-app (DB row + socket.io push).
**Why:** In-app notifications only reach the user while the app is open. A job seeker usually isn't staring at the app at the moment a follow-up is due, so email is how a reminder *actually* reaches them. This is the most user-valuable deferred item.
**Needs:**
- An email provider wired via env (Resend / SendGrid / AWS SES / SMTP) — a new optional key validated by `env.ts`.
- A small templating layer for the REMINDER and GHOST_ALERT emails.
- User-level prefs (opt-in/out; maybe immediate vs daily digest) — likely on `users.preferences`.
- Hook into `notificationService.create` (and/or the reminder sweep) to also enqueue an email. Keep it **best-effort/async** so an email failure never blocks the in-app notification (same seam shape as the socket `emitToUser` best-effort emit).
**Trigger:** as soon as "reminders that reach me when the app is closed" matters — expected to be the first deferred item pulled in.

---

## Reminders

### Recurring reminders
**What:** Reminders that re-fire on a schedule (daily / weekly / RRULE) instead of the current one-shot model (single `remindAt` → fire once → `isCompleted = true`).
**Why:** Covers *"remind me every Monday to chase open applications"* / *"every 3 days until they reply."*
**Needs:** a recurrence rule on the reminder, next-occurrence computation, and a sweep change so a fired recurring reminder **reschedules** instead of completing.
**Trigger:** if users ask for repeating nudges. Low priority — most job-tracking reminders are genuinely one-off, so the one-shot model covers the core use case.

### Soft-delete / `completedAt`
**What:** Keep deleted reminders as rows with a `deletedAt` (instead of hard delete), and/or record completion time with a `completedAt` timestamp (instead of the bare `isCompleted` bool).
**Why:** Enables undo / "trash" UX and an audit trail of when things were done.
**Cost / why deferred:** every reminder query then has to filter `deletedAt IS NULL`; for a single-user personal tracker the bool + hard delete is fine. Matters more for multi-user / audit / compliance.
**Trigger:** if "restore a deleted reminder" or completion history is wanted.

---

## Notifications

### `STATUS_CHANGE` / `GENERAL` notification types
**What:** Actually *create* notifications of these types. The enum values already exist (legacy parity), but only `REMINDER` and `GHOST_ALERT` are emitted today.
**Why:** e.g. a `STATUS_CHANGE` notification when a job moves columns. Groundwork (the enum) is already laid, so it's purely additive.
**Trigger:** if status moves should surface in the bell (note: the actor already sees the move in their own UI, so this is mainly useful for cross-device sync).

### `GET /api/notifications/unread-count` endpoint
**What:** A dedicated cheap unread-count endpoint. Currently unread is derived **client-side** from the fetched list.
**Why:** Slightly cheaper at scale (poll/refresh a count without fetching the full list). The legacy service had the method; we just didn't expose it.
**Trigger:** only if the notification list grows large enough that fetching it just for a badge count is wasteful.

### Notification retention / auto-archive
**What:** A policy to prune or archive old notifications (the list read is capped at 50, but nothing trims the table).
**Why:** Keeps the table from growing unbounded over a long-lived account.
**Trigger:** table-size / housekeeping concern; not urgent.

---

## Timeline

### ✅ Global cross-job activity feed (`/app/timeline` page) — DONE 2026-06-17
**Shipped** (branch `timeline-settings-pages`): a user-scoped activity feed across **all** the user's jobs — `GET /api/timeline` (paginated, `findByUser` inner-joins `jobs` for title/company) + an `/app/timeline` page reusing `TimelineEntry` (via a new optional `jobLink` prop), each row linking to `/app/jobs?job=<id>` to open the JobDrawer. Resolved the 404'ing `Timeline` sidebar link; the `Settings` placeholder was wired up in the same change (`/app/settings` + a cookie-based theme system). See `docs/superpowers/plans/2026-06-16-timeline-settings-pages.md`.

---

## Real-time / infrastructure

### Production WebSocket upgrade proxy
**What:** Front the app in production with a proxy that forwards the WebSocket `Upgrade` handshake for `/socket.io` to backend-express — nginx (`proxy_set_header Upgrade $http_upgrade; Connection "upgrade";`), Traefik, a WS-aware load balancer, or a custom Next server handling the `upgrade` event.
**Why:** A WebSocket starts as an HTTP request with `Upgrade: websocket` and a `101 Switching Protocols` response. Next's `rewrites()` proxy forwards ordinary HTTP (including socket.io's HTTP **long-polling** transport) but does **not** reliably forward the raw `Upgrade` handshake — so socket.io falls back to long-polling.
**Is it required?** Not for function — real-time works today on the long-polling fallback (proven by the live smoke). It's a **production efficiency** upgrade: native WebSocket is one persistent connection vs long-polling's repeated HTTP requests (less overhead/latency, scales better).
**Trigger:** production deployment / when native WS efficiency matters.

### socket.io Redis adapter (multi-instance scaling)
**What:** Add the socket.io Redis adapter so emits fan out across backend instances via Redis pub/sub.
**Why (mechanics):** socket.io keeps connected sockets + room membership **in the memory of the single Node process** holding each WebSocket. `emitToUser(userId, …)` only checks **that process's** memory.
- **One instance (today):** the browser's socket and the cron that creates the notification live in the **same process**, so the emit finds the socket. Works.
- **Two+ instances:** a user connects to instance A (socket in A's memory), but the cron may run on instance B; B's `emit` checks only B's memory → the push reaches nobody. Real-time silently breaks for users not on the emitting instance. (The same breaks if the cron is moved into a **separate worker process** from the web server.)
The Redis adapter turns each emit into a Redis pub/sub message all instances subscribe to, so whichever instance holds the socket delivers it.
**Is it required?** Only when running **more than one backend instance** (or a separate cron worker). JobVault runs a single `backend-express` container today, so not needed now.
**⚠️ Tripwire:** the day the backend is horizontally scaled (or the cron is split into its own process), add the Redis adapter **or real-time notifications will drop for some users**.

### Push notifications (web push / mobile)
**What:** Browser Web Push and/or mobile push as additional delivery channels.
**Why:** Reaches the user when neither the app tab nor email is the right channel.
**Trigger:** after email; lower priority than email for this product.

## URL scraping (robust-url-scraping branch, 2026-06-17)

> The robust tiered pipeline (static → render → AI-normalize) shipped on `robust-url-scraping`. These are the LOW-severity items from the adversarial review that were consciously deferred, plus the async follow-up the mobile app will want.

### Async scrape + push (mobile share flow)
**What:** A `POST /api/jobs/scrape-async` that enqueues the scrape and notifies on completion (via the existing notification system) instead of holding the HTTP request for the render+AI chain.
**Why:** Mobile "share a URL → scrape" tolerates (even prefers) a background job + push. The pipeline is already a pure, req/res-free service (`scrapeUrl`/`createScrapeFallback`), so a worker can call it unchanged — this is a clean drop-in, not a refactor. Today's synchronous endpoint stays for web; a 90s overall deadline bounds it.
**Trigger:** when the mobile app lands (or web UX wants non-blocking capture).

### Scrape quality / robustness nice-to-haves (low)
- **Anti-bot interstitial heuristic:** a Cloudflare/cookie-wall page that yields a non-placeholder title+company+body is reported `status:'ok'` and not escalated to render. Add a phrase/length heuristic ("enable cookies", "just a moment", "verify you are human") to demote to `partial` / trigger render.
- **`source` provenance precision:** `renderAndExtract` labels the result `source:'ai'` whenever the AI produced *anything* (even just the description), while title/company may be from the raw render. `source` is telemetry-only (not read by the UI), so cosmetic.
- **Render tier without AI can't supply company:** with Gemini off, the render tier only yields title + snapshot (no company), so a JS-rendered page stays `partial` unless AI is on. A structured render provider (Firecrawl extract) or a light cheerio pass over rendered HTML would close this.
- **Shared placeholder constants:** `Untitled Position` / `Unknown Company` are duplicated in `scraper.ts` (DEFAULT_*) and `url-paste-form.tsx` (PLACEHOLDER_*). Functionally correct today; future drift risk. Either share via the API contract (trust `status`) or add a linking test.
- **`getRenderClients()` gating test:** the `SCRAPER_RENDER_ENABLED` env parse is tested; the `getRenderClients() === []` when disabled branch and the render-timeout abort path are not.

## Chrome extension (Slice 8, 2026-06-22)

> Built and unit-tested on `slice-8-chrome-extension` (load-unpacked for dev). Consciously-deferred follow-ups.

### Release / packaging doc + Chrome Web Store
**What:** A documented release process — pin the extension `key`, version bump, `npm run build`, zip `dist/`, plus a Web Store listing (icons, screenshots, privacy policy, host-permission justification).
**Why:** Dev uses load-unpacked; real distribution needs store review + a stable id. Out of scope while mid-migration / personal use.
**Trigger:** when sharing the extension beyond the developer's own browser.

### Extension nice-to-haves (low)
- **On-page overlay save button** (injected "Save to JobVault" on job pages) — popup-only for now; an overlay is more intrusive and DOM-fragile.
- **Generic client-side extraction** — generic sites currently route to the backend `/api/extension/scrape`; on-demand `chrome.scripting.executeScript` injection would let the content-script extractors run on any site (avoiding the bot-wall for non-LinkedIn/Indeed boards).
- **Real logo icons** — `icons/*.png` are solid-indigo placeholders from `scripts/make-icons.mjs`.
- **More job boards** (Glassdoor, Wellfound, Workday) via new extractors; the generic schema.org path already covers many ATS boards.
- **Stale-tab caveat** — if a LinkedIn/Indeed tab was open *before* install, its content script is absent, so capture falls back to the (bot-walled) backend scrape until the tab is reloaded; programmatic injection would remove the caveat.
