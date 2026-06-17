# Plan — Robust URL Scraping (render fallback + AI normalization + graceful degradation)

> **Date**: 2026-06-17 · **Branch**: `robust-url-scraping`
> **Touches**: `backend-express/src/modules/jobs/*`, `backend-express/src/config/env.ts`, `frontend-next/src/components/jobs/*`, `frontend-next/src/components/ui/markdown-prose.tsx`, types/schemas.
> **Spec context**: enhances Slice 2 (Jobs scraper). Not a new numbered slice — a cross-cutting robustness upgrade to a primary feature.

## Why

The "paste a job URL → auto-capture" flow is a primary feature (and will be the *only* capture mechanism on the planned mobile app, where a share sheet hands the backend a raw URL — no browser, no extension). Today it only works on server-rendered / JSON-LD pages.

**Proven root cause** (this conversation): Naukri (and LinkedIn/Indeed/Workday-class boards) are client-side-rendered SPAs behind anti-bot layers. `fetch()` + Cheerio gets an empty app shell + decoy images, so the user gets `title: "Untitled Position"`, `company: "Unknown Company"`, and `snapshotMarkdown` = two anti-scrape decoy images. The unwired AI `ScrapeFallback` can't help on a raw shell (the data isn't in the HTML). Naukri's internal JSON API is gated by Akamai+recaptcha (406), so a plain-curl site adapter is not viable.

**Proven fix path**: a JS-capable render service recovers the content. **Verified**: free, keyless **Jina Reader** (`https://r.jina.ai/<url>`) rendered the exact failing Naukri URL and returned the real job (HTTP 200, title + company + description). So the robust mechanism is a **tiered pipeline**, shared by web + mobile via the same `POST /api/jobs/scrape`.

## Architecture (target)

```
scrapeUrl(url):
  1. fetch() + Cheerio/JSON-LD          ← existing fast-path. Free, instant.
        │ isShellResult? ──no──► finalize (status 'ok')
        ▼ yes
  2. render via RenderClient chain      ← Jina (free, default) → paid provider (env-gated, off)
        │ rendered content?
        ▼
  3. structured extraction              ← re-run JSON-LD/cheerio on rendered HTML; else Gemini
        │                                  extracts {title, company, location, salary, description}
        ▼
  4. finalize + sanitize                ← strip decoy/data: images always; compute status
        │ still shell? → status 'empty' → client routes to manual entry (never lose the job)
```

**Decisions** (from brainstorm with user):
- **Free-first**: Jina Reader is the working render provider now. Paid providers (Firecrawl/ScrapingBee) are a provider-agnostic interface, registered only when their env key is set — no key required to ship.
- **AI normalization**: reuse the existing `geminiService.generateStructured` over *rendered* content (the right use of the `ScrapeFallback` seam). Gated by `GEMINI_API_KEY`; best-effort.
- **Async-friendly, not async-now**: keep the synchronous `POST /api/jobs/scrape` route. Make it forward-compatible by (a) keeping `scrapeUrl` a pure req/res-free service (already true) so a future worker can call it unchanged, and (b) returning a structured `status` in the envelope so clients branch on it. A full enqueue + push-notification flow (for mobile) is a documented deferred drop-in — not built here.
- **Graceful degradation is the floor**: detect shell results, surface them, always allow manual entry, and sanitize markdown regardless of source.

## Tasks (TDD, commit per task)

### Backend

1. **Markdown sanitization** — `markdown.ts`: strip `<img>` tags (especially `data:` URIs and known decoy hosts like `transparentImg`), drop image-only markdown, and collapse runs of nav/link spam. New `sanitizeSnapshotMarkdown()` applied to *every* snapshot return. Tests: decoy `data:`/transparent images removed; real text preserved.

2. **Shell detection + result status + fast-path polish** — `scraper.ts`: add `isShellResult(partial)` (empty/placeholder title or company, or empty/near-empty/image-only markdown). Extend `ScrapeResult` with `status: 'ok' | 'partial' | 'empty'` and `source: 'static' | 'render' | 'ai'`. `finalize` computes status. Also fix the **stale Greenhouse selectors** (`#header .app-title`/`.company-name` no longer match) + add a generic `"… at <Company>"` title parse as a company fallback. Tests.

3. **RenderClient abstraction + Jina provider** — new `render.ts`: `RenderClient` interface (`render(url) => Promise<{ markdown: string; title?: string } | null>`), `jinaRenderClient` (GET `https://r.jina.ai/<url>`, optional `Authorization: Bearer JINA_API_KEY`, `X-Return-Format: markdown`, bounded timeout, parse the `Title:` header), and a registry that yields providers in order from env (Jina default; paid providers appended only if their key is set). Tests stub `fetch`.

4. **Pipeline wiring + AI extraction** — compose the render+extract step as the `ScrapeFallback` and pass it from `jobs.service.ts` (replacing the unused seam): on shell, walk the RenderClient chain → sanitize rendered markdown as the snapshot → if `geminiService.isAiEnabled()`, run a new `extractJobFromContent()` (`buildJobExtractionPrompt` + Zod schema → `{title, company, location, salaryRange, descriptionMarkdown}`) over the rendered content to fill/override fields. Best-effort, swallow provider errors. Tests: mock render + gemini; assert escalation only on shell, fields merged, errors tolerated.

5. **Env + SSRF guard** — `env.ts`: add `JINA_API_KEY?`, optional `FIRECRAWL_API_KEY?`/`SCRAPINGBEE_API_KEY?`, `SCRAPER_RENDER_ENABLED` (default true). Add an SSRF guard to the *direct* `fetchHtml` path: reject non-http(s) schemes and private/loopback/link-local hosts (the render path is safer — Jina fetches, not us). Tests for the guard.

6. **Controller/envelope** — ensure `status`/`source` flow through `POST /api/jobs/scrape` response. Minimal.

### Frontend

7. **Types** — extend `ScrapeResult` (`src/types/job.ts`) with `status` (+ optional `source`).

8. **Manual form description field** — `manual-job-form.tsx`: add a `snapshotMarkdown` (Description) `Textarea`, include it in `defaultValues`, `onSubmit` payload, and prefill. Fixes the silent drop of the scraped description and lets users paste a JD by hand. Tests.

9. **URL paste form graceful degradation** — `url-paste-form.tsx`: branch on `status`. `'ok'` → preview with Save/Edit (as today). `'partial'`/`'empty'` → route to the manual form prefilled with whatever was captured + a clear "we couldn't fully capture this — review the details" note (don't present junk as a clean save). Also handle the existing `isError`. Tests.

10. **Markdown image neutralization** — `markdown-prose.tsx`: add an `img` component override that renders nothing (or alt text only) so decoy/tracking images never display, even on legacy rows. Tests.

11. **Loading copy** — `url-paste-form.tsx`: reassure during the slower render path (e.g. "Capturing… this can take a few seconds"). Trivial.

### Wrap-up

12. **Adversarial review + gates + docs** — read-only adversarial review (Workflow) → fix findings → backend `typecheck && lint && test`, frontend `typecheck && lint && test && build` → live smoke against the Docker stack with the real Naukri URL → update `progress.md` + add the async enqueue/push flow to `docs/deferred-tasks.md`.

## Gates
- backend-express: `npm run typecheck && npm run lint && npm run test`
- frontend-next: `npm run typecheck && npm run lint && npm run test && npm run build` (build via `docker build --target production ./frontend-next` if host `.next` perms bite)
- Smoke: paste the failing Naukri URL through the running stack; confirm real title/company/description and no decoy images.

## Risks / non-goals
- **Jina free-tier limits / availability**: acceptable for now; paid slot is the upgrade. Provider-agnostic so swapping/reordering is config.
- **Latency** (~10–20s on the render path): bounded by per-provider timeouts; behind a loading state; the documented async flow removes it for mobile.
- **Not built here**: background job queue + push notifications (deferred), self-hosted Playwright (rejected — Alpine-incompatible, still bot-blocked), Chrome extension (separate, web-only).
