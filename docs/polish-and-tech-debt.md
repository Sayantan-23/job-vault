# Polish & Tech-Debt — Backlog

Small, non-blocking improvements and accepted tradeoffs surfaced by the 2026-06-16 "what's remaining" audit. **Nothing here breaks shipped functionality** — these are quality-of-life polish, verification debt, and a few by-design tradeoffs recorded for awareness.

> Companion docs:
> - `docs/deferred-tasks.md` — deferred **backend / infra features** (email reminders, recurring reminders, extra notification types, unread-count, retention, WS-upgrade proxy, socket.io Redis adapter, push, and the global Timeline feed).
> - `progress.md` — source of truth for what shipped.
>
> The global **Timeline** page and the **Settings** page (the two 404'ing sidebar links) are being built now, so they are intentionally **not** listed here.

---

## UX / feature polish

### Résumé workspace layout parity with the cover-letter editor
**What:** Bring `/app/resumes` in line with the cover-letter editor: align the split breakpoint (`lg` → `xl`) and adopt the route-split + side-rail pattern (`/app/cover-letters/[id]`) if a dedicated editor route is wanted.
**State:** CLAUDE.md's note that the résumé page "still uses the old centered/stacked layout" is **stale** — `resume-workspace.tsx:154` already uses `lg:grid-cols-2` with a `lg:sticky` preview/actions column (`:158`). The only real gap is the breakpoint (`lg` vs the cover-letter editor's `xl`) and the lack of a route-split editor.
**Evidence:** `frontend-next/src/.../resume-workspace.tsx:154,158`; cover-letter editor uses `xl:grid-cols` + a dedicated `/app/cover-letters/[id]` route.
**Effort:** small. **Trigger:** when résumé editing on large screens should match the cover-letter feel.

### Tone / length presets for résumé + cover-letter generation
**What:** Add quick presets (e.g. Professional / Casual; Short / Medium / Long) alongside the existing freeform instructions textarea on both generators.
**State:** Both `GenerateResumeBar` and `GenerateCoverLetterBar` expose only a single freeform textarea today.
**Evidence:** `generate-resume-bar.tsx:62-71`, `generate-cover-letter-bar.tsx:177-187`.
**Effort:** medium. **Trigger:** if users want one-tap tone/length control without writing instructions.

### Job-URL scrape into the cover-letter paste form
**What:** In the "paste a JD" mode, let the user paste a job **URL** and auto-fill title / company / description by reusing the existing scraper (`useScrapeJob`, already wired into the jobs add flow).
**State:** The paste form (`PasteJobFields`) has three manual inputs and no scrape affordance, even though the scraper exists.
**Evidence:** `generate-cover-letter-bar.tsx` `PasteJobFields` (~lines 64-116); scraper at `jobs/url-paste-form.tsx` via `useScrapeJob`.
**Effort:** medium. **Trigger:** convenience — when manual JD entry feels like friction.

### Side-by-side compare for cover-letter refine proposals
**What:** When the `/app/cover-letters/[id]` editor route is wide enough, show the original letter and the proposed rewrite **side-by-side** instead of the current Show-original toggle.
**State:** Refine review uses a Show-original toggle to swap between original and proposal.
**Evidence:** `progress.md:284` ("side-by-side rewrite compare if the route widens").
**Effort:** small. **Trigger:** polish — when the editor route widens on large viewports.

---

## Verification debt

### Pending manual browser smoke passes for built slices
**What:** Several already-built, gates-green slices still carry an unchecked "Manual browser pass + merge to master" note: Slice 0 (light/dark, `/about`), Slice 2 (Add-Job modal, drawer deep-link), Slice 3 (drag-and-drop, card→drawer), Slice 3.5 (Board↔List toggle, `?view=` survives refresh), Slice 4 (final pass), Slice 5 (search/sort/paginate/reset, deep-link SSR, hybrid drag while filtered), Slice 5 follow-up (column funnel menus).
**State:** Mostly user-side QA, not new code. **Some checkboxes are likely stale** since the work has since landed on master.
**Evidence:** `progress.md` lines ~55, 116, 142, 151, 195, 203 (unchecked "Manual browser pass" items).
**Effort:** medium (manual QA). **Trigger:** a dedicated QA pass, or reconcile the checkboxes against what's already on master.

---

## Tech-debt / awareness (by-design tradeoffs)

These are deliberate choices, recorded so the tradeoff is explicit — not necessarily work to "fix."

### AI generation has no non-AI fallback (degraded mode)
**What:** Résumé and cover-letter generation hard-require Gemini — with no `GEMINI_API_KEY` (or AI disabled) they throw `SERVICE_UNAVAILABLE` with no template/heuristic fallback.
**Why it's acceptable:** matches the AI-first product design; the app advertises AI generation, so a degraded non-AI path isn't expected.
**Evidence:** `resumes.service.ts:14-19`, `cover-letters.service.ts:14,89`.
**Trigger:** only if a no-key/offline degraded mode becomes a product requirement.

### AI rate limiting is per-user hourly only
**What:** AI generation/refine is throttled by a per-user hourly quota counted from `ai_usage_events`; there is no per-IP burst control, circuit breaker, or upstream Gemini-quota awareness beyond a single transient retry.
**Why it's acceptable:** fine for a single-user product.
**Evidence:** `ai.rate-limit.ts` (per-user hourly via `ai_usage_events`); `gemini.service.ts` retries once on transient failure.
**Trigger:** multi-tenant / abuse-prone exposure, or when Gemini quota budgeting matters.

### No raw-file persistence for PDF persona import
**What:** `POST /api/personas/parse-resume` extracts PDF text in-memory (`multer` + `pdf-parse`), structures it via Gemini, and returns `content + rawText` without storing the source PDF.
**Why it's acceptable:** intentional — text/JSON-only storage, no file backend. The tradeoff is no audit trail of the original uploaded file.
**Evidence:** `personas.controller.ts:34-49`.
**Trigger:** if keeping the original uploaded résumé file ever becomes a requirement.
