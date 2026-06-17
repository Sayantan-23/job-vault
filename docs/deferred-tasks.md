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
