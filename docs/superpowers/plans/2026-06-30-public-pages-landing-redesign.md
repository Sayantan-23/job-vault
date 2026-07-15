# Public-Pages Landing Redesign — "The Circuit of One Search"

**Status:** Plan FINALISED — build in progress (ultracode workflow).
**Date:** 2026-06-30
**Branch:** `landing-page-redesign` (created 2026-06-30 off master).
**Prototype:** [`docs/mocks/landing-prototype.html`](../../mocks/landing-prototype.html) (open in a browser; all visuals are live HTML/CSS/SVG/JS).
**Renders:** `docs/mocks/landing-shots/` (gitignored; regenerate from the html). Best captures: `5-fullpage.png`, `1-hero.png`, `c-*.png`.

> **Recovery note.** This plan was synthesized in a prior session whose chat transcript was lost. The design direction, prototype, and full synthesis survived in workflow scratchpad output and have been re-consolidated here. The old-Nuxt landing spec (`docs/landing-page.md`) described the version this redesign **replaces** and has been deleted.

---

## 1. Brief (the owner's mandate, verbatim)

**Opening:**
> we will work on the landing pages. later i will build the mobile application also. but for now the landing pages is next. check all the things. analyse other websites also, tell me which can be the design language that we should follow here. is it the minimalist ui or any other from the skill list... use the taste skill also.
> - when you want to show something visually (image/svg), first try to make it with HTML and CSS — only fall back to SVG or an image when it's genuinely not possible. https://slateeditor.com/ does exactly this: areas that look like images/video are actually built with HTML/CSS/JS.
> - in landing pages prefer NOT to use shadcn; use totally custom styling.

**Critique of the first attempt (the steer that produced this direction):**
> the texts look fine, but the illustration/visual must look much better. **the background grid pattern is extremely common** — we need something innovative and better-looking. **the whole thing should not look like AI slop.** Currently there's only emphasis on **ghost-proofing**, but the app grew far beyond that: tracking jobs, creating personas, generating résumés and cover letters per job+persona, the shipped extension, the app coming. **Tell the whole connected story — all of it.**

### Goals that fall out of the brief
1. **Tell the whole connected system**, not just ghost-proofing. Personas → Jobs (pipeline) → Résumés + Cover letters → Timeline/reminders/ghost-proofing → Extension, as **one** product.
2. **No AI-slop.** Specifically kill: the common dot/line grid background, mesh-gradient blobs, glassmorphism-on-everything, three-equal-feature-cards, fake logo walls/testimonials, AI-purple.
3. **Code-built visuals** (HTML/CSS/SVG/JS) à la slateeditor.com — no screenshots, no lorem, no decorative div-blobs.
4. **Custom styling, no shadcn** on the public surface.
5. **Same brand as the app** — carry the editorial-shell tokens verbatim (this is not a new look; it's the app's look applied to marketing).

---

## 2. Design language decision

**Minimalist-UI (the app's editorial shell), extended with a code-built "schematic" visual system** — not a new design language. Reference research (Teal, Huntr, Simplify, Careerflow, Jobscan, Linear, Height, Attio, Cron, Vercel, Stripe + slateeditor.com technique study) confirmed the minimalist/editorial lane is both on-brand and the least sloppy. The differentiator is the **visual system**, below.

### Chosen direction: **"The Circuit of One Search" (Trace Network)**
A synthesis of three explored art directions:
- **spine** from *"The Wiring Room"* — the product's real data flow drawn as **one live circuit**;
- **graft** the genuine type-set DOM **résumé/cover-letter sheets + a stamp** from *"The Search File"*;
- **graft** the single soft **contact-shadow / restrained depth** discipline from *"The Living Desk"* (deliberately **without** its fragile 3D-perspective stage).

**The idea:** JobVault is rendered as ONE live signal chain on a warm "drafting field". A **Persona** node and an **extension-captured Job** feed a **forking junction** that energizes a tailored **Résumé** and **Cover letter** in parallel, which recombine into the **Pipeline** where a card lands in *Applied* and the **ghost meter** arms as the *last* node on the wire. Hand-routed, content-bearing SVG traces (never a lattice) thread node-to-node and pass *under* the cards, carrying one accent "current" pulse — so "one connected system" is the literal first thing you see. **Ghost-proofing is the terminal node, not the headline.**

### The signature system — "The Trace Network"
A recurring visual vocabulary reused at every scale:
- **Hand-routed hairline circuit traces** (orthogonal, rounded PCB-style corners) that physically connect every pillar. Dormant = warm-gray hairline; energized = a single muted-indigo current pulse via animated `stroke-dashoffset`.
- **Functional solder-junction dots** (7px) — the **only** dots on the page; never decorative.
- **Flat hairline node cards** identical to the app shell, each with one soft contact-shadow (no hard drop shadows, no 3D tilt).
- **Genuine type-set DOM documents** (real résumé + cover-letter sheets: Newsreader name, Geist body, Geist Mono dates) that compose line-by-line as the current arrives, finished by a small distressed **vermilion `FILED` stamp**.
- **Geist Mono micro-labels** (node names, terminal names, job-context like `Ramp · Senior PM`, day-ticks) — what makes the page read as an honest engineering schematic of the real product.

---

## 3. Backdrop — the "drafting field" (NOT a grid)

Four cheap, image-free layers; the distinction comes from the content-bearing traces, not a repeating pattern:
1. Flat warm base `oklch(0.992 0.004 80)` (carried from app).
2. A single **ultra-faint horizontal baseline rhythm** — one `repeating-linear-gradient` of *horizontal hairlines only* (no verticals), ~120px spacing, ~4% alpha, radial-masked to fade at edges. Reads as drafting/ledger tooth, never a lattice.
3. **(the signature)** a fixed full-bleed inline-SVG layer of a few long, gently-curved, orthogonally-routed traces connecting section anchors; mostly dormant, one or two carrying a slow looping low-amplitude accent signal. Traces pass **behind** cards (z-index) so wiring threads under the UI → system depth, zero blobs.
4. Existing `feTurbulence` noise data-URI at ~2.2% opacity, `multiply` — warmth + tooth.

Depth without 3D: one wide soft contact-shadow ellipse under each floating node group; two background trace layers translate at slightly different rates on scroll (rAF-throttled, a few px). Reduced-motion: traces resolve static, parallax off.

---

## 4. Tokens (carried verbatim from the editorial shell)

- **Palette:** base `oklch(0.992 0.004 80)`; surfaces `oklch(1 0 0)` / `oklch(0.985 0.004 80)`; ink `0.23 0.012 60` (+ soft `0.52`, faint `0.64`); hairlines `0.91 0.004 75` / `0.945`. **One accent** = muted indigo `oklch(0.54 0.115 270)` (strong `0.47 0.12 270`) — used ONLY as the live current, lit junctions, typing caret, and one CTA; **never a gradient wash, never AI-purple**. Dormant trace = warm-gray hairline `~0.88 0.004 75`.
- **Earned warm accent:** vermilion `oklch(0.55 0.18 32)` — strictly the `FILED` stamp + the single stale-card left-margin rule. Nothing else.
- **Ghost-meter freshness (product-only, quiet):** fresh `0.70 0.13 155`, cool `0.80 0.14 80`, cold `0.62 0.20 25`.
- **Single dark band:** warm near-black `oklch(0.205 0.012 60)` / on-ink `0.95 0.005 80` — used **at most once** (see open decision #1).
- **Type:** **Newsreader** (serif 500, −0.01/−0.02em) for headlines, node titles, résumé candidate name, sign-off — italic Newsreader for exactly **one** emphasized phrase per heading (in accent-strong). **Geist Sans** for body/decks/buttons. **Geist Mono** as the schematic voice (eyebrows, node/terminal labels, job-context, counts, day-ticks). Hero `h1` `clamp(2.5rem, 4.6vw, 3.85rem)`/lh 1.04; section `h2` `clamp(1.9rem, 3vw, 2.6rem)`; decks ~17px.
- **Geometry/motion:** radius 0.75rem; frame max-width ~1180px; easing `cubic-bezier(0.22, 1, 0.36, 1)`; transitions 0.18–0.7s. **No em-dashes** — mid-dots/commas only.

---

## 5. Narrative spine → section plan

One viewport hero shows the whole system; each subsequent section is a **sub-circuit** of the same wire.

| # | Section | Headline | What it proves / visual |
|---|---------|----------|--------------------------|
| 0 | **Nav** | JobVault | Sticky 66px hairline bar, mono-flavored; a dormant trace enters from the left edge under the brand mark, seeding the wire from line one. Links: *How it connects · Documents · Extension*; *Log in* + *Start free*. |
| 1 | **Hero** | One search. *Wired end to end.* | The full end-to-end signal chain as flat hairline nodes on a CSS grid: Persona + Job (with "via extension" solder-tap) → forking junction → Résumé + Cover letter filling line-by-line → Pipeline card lands in *Applied* + ghost meter arms. One ~2.2s accent current pulse traverses the whole path on load, in real product order; then a calm low-amplitude background loop. **No big progress ring** (drop the prototype's ring → inline mono ticks). |
| 2 | **Capture (extension)** | Save any posting in *one click*. | Zoom to the solder tap: a ~380px browser-chrome popup auto-extracts Title/Company/Location; a captured "chip" travels a trace into a junction on the main wire. Mono source pills (LinkedIn, Indeed, Naukri, Greenhouse). A subtle "Already saved" dedupe state. |
| 3 | **Personas → documents (the fork)** | One persona. *Every tailored draft.* | Asymmetric two-column schematic: left a Persona node (`3 / 5 used` mono caption); right a **borderless** stack of document rows (title, mono `Ramp · Senior PM` context, persona, date). Fan-out traces light top-to-bottom. **No cards-in-cards, no three equal cards.** |
| 4 | **The documents** | Drafts that read like *you wrote them*. | Two **real type-set DOM sheets** (aspect 8.5/11, ~360px, slight rotation ≤2°, one soft contact-shadow). A `tailored to: Senior PM · Ramp` chip; a struck line + indigo "humanized" replacement (Humanize/Shorten/Make-longer/Fix-grammar); a debossed PDF corner-fold; the **vermilion `FILED` stamp** scales in after the lines compose. |
| 5 | **Pipeline + ghost meter** | Nothing slips through, *nothing goes cold*. | The flat hairline kanban (reuse the app's 3-column board) with an incoming trace + traveling pulse into the *Applied* header. Each card carries a 7px freshness tick + mono day-count; one stale card gets a thin vermilion rule + "Send a follow-up today" nudge (existing pulse keyframe). Optionally the single dark band (open decision #1). |
| 6 | **Capabilities (wiring legend)** | Every part on the *same wire*. | Two-column **borderless** list (reuse `.caps`): pipeline, personas, résumés, cover letters, timeline+reminders, extension — each a labeled terminal. A thin left-margin SVG rail with a junction dot per row ties every capability to the one wire. |
| 7 | **Closing CTA** | Start the search that *stays warm*. | Several traces curve in from the page edges and converge to a single junction dot above the centered serif headline; a final accent pulse lands on reveal. *Start free* (primary) + *Add to Chrome* (ghost). **No fake logo wall.** |
| 8 | **Footer** | JobVault | 4-column record-style colophon (Product / Company / Legal) over hairlines; a faint trace exits the bottom edge to close the wire metaphor. |

**Motion discipline:** one choreographed ~2.2s hero traversal mirroring real product order; everything else lights its traces on scroll-into-view (`IntersectionObserver`, unobserve after fire); concurrent animated paths capped at 2; full `prefers-reduced-motion` path resolves every pulse/typewriter/fill/stamp to its final lit state (parallax off, page fully legible as static product).

---

## 6. Anti-slop checklist (acceptance criteria)

- [ ] No dot/line grid background — only content-bearing hand-routed traces + one faint horizontal baseline.
- [ ] No mesh-gradient blobs, goo filter, floating orbs, or glassmorphism-on-everything. Opaque warm paper + hairlines + ≤1 soft contact-shadow per node group.
- [ ] One accent (muted indigo) for the current/junctions/caret/one CTA; vermilion strictly stamp + one stale rule. No AI-purple.
- [ ] No three equal feature cards — signal chain, asymmetric fork, real sheets, kanban, borderless legend.
- [ ] Newsreader serif only for headings/titles; one italic phrase per heading; never serif body.
- [ ] Hero fits one viewport (copy + live chain), no scroll to see the whole system.
- [ ] Visuals code-built + faithful to the real product; no screenshots, no lorem, no fake blobs.
- [ ] No fake logo wall / testimonials (no real social-proof data exists).
- [ ] Only dots are functional solder junctions + ghost ticks.
- [ ] No em-dashes.
- [ ] Every token carried verbatim from the editorial shell.
- [ ] Full `prefers-reduced-motion` fallback.

---

## 7. Decisions — LOCKED (2026-06-30)

1. **Dark band** → **YES**, on the pipeline/ghost section ("the watch") — the one high-contrast moment, matching the app's single-dark-moment pattern.
2. **Hero chain** → **Full 6-node chain** (Persona, Job, fork, Résumé, Cover letter, Pipeline). Tune density if busy at ~1280px; do not drop nodes.
3. **Stamp wording** → **`TAILORED`** (speaks to the job+persona value; `FILED` reads archival).
4. **Vermilion** → **Keep, sparse** — stamp ink + the single stale-card left rule only.
5. **Mobile** → **Preserve the trace metaphor** with a separate stacked vertical SVG routing (not a plain stacked-card fallback).
6. **Headline** → **"One search. *Wired end to end.*"** (conceptual; deck carries the literal explanation).
7. **Eyebrow** → **Swap the 6px accent dot for a tiny trace tick** (dots reserved for junctions).

**Product name:** **JobVault stays** (the rename exploration — Tailr/Atelier/Veska/Cairn/Rolecraft/Cadenza — is parked; brand lockup is a single component, trivially swappable later).

---

## 7a. Closing-section bug to fix (regression from the prototype)

In the prototype the converging SVG traces in the **Closing CTA** cut straight **through** the "Start the search that *stays warm*" headline glyphs (see `landing-shots/c-closing.png`). **The real build must not repeat this.** Required behavior:
- The convergence traces live in a dedicated band **above** the headline; the convergence **junction dot sits ≥32px above the first headline line** with clear vertical clearance — traces never overlap the text glyphs at **any** width.
- Headline + CTA render above the SVG (`z-index`), and the converge SVG is sized/positioned so it occupies the section's top padding only, not the text area.
- Geometry recomputes on resize (responsive); `prefers-reduced-motion` shows the converged static state (dot + settled traces, no pulse).

---

## 8. Implementation architecture (concrete)

**Route:** the landing is `/`. Currently a bare placeholder at `src/app/page.tsx` (outside `(web)`, no theme). **Move it into the `(web)` group** so it inherits the web theme scope + shared chrome:
- **Delete** `src/app/page.tsx`; **create** `src/app/(web)/page.tsx` (server component) that renders the 7 sections.
- `src/app/(web)/layout.tsx` keeps `data-theme-scope="web"`, additionally imports the new `landing.css`.

**Theme:** the `(web)` surface adopts the **warm editorial tokens** (the public surface should match the app brand; the sub-pages are placeholders so this is safe):
- **Rewrite** `src/styles/web/theme.css` → warm-stone + muted-indigo scope tokens mirroring `app/theme.css` (`--background oklch(0.992 0.004 ~75)`, `--primary oklch(0.55 0.12 270)`, ghost tokens, `--hairline`, etc.), **plus** the bespoke landing variables the prototype needs, all scoped to `[data-theme-scope='web']`: `--ink/--ink-soft/--ink-faint`, `--surface/--surface-2`, `--hairline-soft`, `--accent-strong/--accent-soft/--on-accent`, `--trace/--trace-faint`, `--vermilion`, `--fresh/--cool/--cold`, `--ink-bg/--ink-bg-2/--on-ink/--on-ink-soft/--ink-hairline/--trace-ink`, `--ease`, `--maxw: 1180px`.
- **Fonts:** map the prototype's `--font-serif/sans/mono` to the existing next/font vars (`var(--font-newsreader)`, `var(--font-geist-sans)`, `var(--font-geist-mono)`) — **drop the prototype's Google-Fonts `<link>`**.
- **Light-only v1** (prototype is light-first; the web scope has no `.dark` variant, so dark-pref users still get the light landing — no breakage). Dark mode is out of scope for v1.

**CSS:** **`src/styles/web/landing.css`** (new) — the entire prototype `<style>` block ported verbatim-but-adapted (backdrop, typography, `.btn*`, nav, trace/`.node`/`.fork`/sheet/pipe, hero, capture, docs, dark `band-dark`, capabilities, **closing with the §7a fix**, footer, motion utils, responsive, `prefers-reduced-motion`). Custom CSS only — **no shadcn, no Tailwind-utility rewrite** of the bespoke visuals.

**Components** (`'use client'` only on animated leaves; everything else server):
- `src/components/layout/web/web-shell.tsx` — **rewrite** to `<WebNav/>{children}<WebFooter/>`.
- `…/web/web-nav.tsx` (sticky branded nav: brand + How it connects/Documents/Extension anchors + Log in + Start free + seed-trace) and `…/web/web-footer.tsx` (4-col colophon). Shared across all public pages.
- `src/components/web/landing/` — `hero.tsx` (client, the full signal chain), `capture-section.tsx`, `fork-section.tsx`, `documents-section.tsx`, `pipeline-section.tsx`, `capabilities-section.tsx`, `closing-section.tsx` (client where animated).
- `…/landing/trace.ts` + `…/landing/use-reveal.ts` — shared client helpers: orthogonal rounded `<path>` builder, element anchor reader, `ResizeObserver` relayout, `IntersectionObserver` play-once reveal, reduced-motion guard. Reused by every animated section so geometry stays pixel-aligned and reflows responsively.

**CTAs/links:** custom `.btn`/`.btn-primary`/`.btn-ghost` anchors (the `Button` primitive is a plain `<button>` with no `asChild`, and the brief bars shadcn on the landing).

**Verify:** `npm run typecheck && npm run lint && npm run test && npm run build`; then browser smoke against the Docker stack (light, **mobile reflow of the hero chain + closing converge**, reduced-motion). Production build verified via `docker build --target production ./frontend-next` (host `.next` is root-owned).

**Process:** branch first (`landing-page-redesign` ✓); orchestrate via ultracode workflow (foundation → parallel sections → gates → adversarial review → fix). Visual components are lighter on unit tests — lean on build + adversarial review + browser smoke. Commit on the owner's say-so; never push.

---

## 9. Reference artifacts

- **Prototype:** `docs/mocks/landing-prototype.html` — the realised chosen direction (use as the build reference of record).
- **Renders:** `docs/mocks/landing-shots/*.png` (gitignored).
- **Recovered research/synthesis (scratchpad, ephemeral — captured here):** the original 6-agent synthesis (product survey, 3 art directions, full section plan), the reference-website study (Teal/Huntr/Simplify/Linear/Height/Attio/Vercel/Stripe + slateeditor.com techniques), and a rendered capture of `slateeditor.com` (the build-technique reference).
- **Build-technique reference:** https://slateeditor.com/ (HTML/CSS/JS visuals that look like images/video).
