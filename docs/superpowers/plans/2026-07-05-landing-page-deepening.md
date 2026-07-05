# Landing Page Deepening — "Circuit of One Search" v2

**Branch:** `landing-page-redesign` (already on it). Commit per task, never push.
**Mode:** Redesign-evolve. Direction locked (2026-06-30 plan); this finishes and deepens it.
**Copy this plan** to `docs/superpowers/plans/2026-07-05-landing-page-deepening.md` at execution start (repo convention).

## Context

The 2026-06-30 "Circuit of One Search" landing shipped ~60% of its own plan. Audit findings (screenshots + code read, 2026-07-05):

1. **The connective spine is missing** — the full-bleed background trace layer (§3 layer 3 of the original plan) exists in *neither* the build nor the prototype. All wires are per-section islands, so the page never reads as "one circuit".
2. **Personas fork section was cut** — planned §5 section 3 absent from `page.tsx`; personas get one legend row.
3. **Broken vertical rhythm** — huge uneven whitespace, capture popup crops at viewport top, pills orphaned, visuals float unanchored from copy.
4. **Hero chain too sparse** — nodes scattered, wires nearly invisible, cover letter hidden behind résumé, Applied card dangling. Owner: "this area needs to be better" (chose: tighten + enrich in place, not a framed board).
5. **Dead CTAs** — hero `Start free` and closing `Add to Chrome` are `href="#"`.
6. Baseline hairlines cross content; 5/5 sections carry eyebrows; TAILORED stamp looks flat (owner wants it better; treatment: authentic rubber stamp); capabilities legend thin; dark-band board half-empty; no credibility layer; use cases missing (personas, refine flow, exports, timeline/reminders, what "free" means).

**Owner decisions this round:** full work list · hero = tighten-in-place (option b "framed board" parked as viable fallback) · stamp = authentic rubber-stamp upgrade, keep `TAILORED` · timeline is minor → fold into the dark band, no standalone section.

## Existing system to reuse (from CSS inventory)

- **Tokens** in `frontend-next/src/styles/web/theme.css` under `[data-theme-scope='web']`: `--accent/--accent-strong/--accent-soft`, `--trace/--trace-faint`, `--vermilion`, `--fresh/--cool/--cold`, `--ink-bg/--ink-bg-2/--on-ink*/--ink-hairline/--trace-ink`, `--hairline/--hairline-soft`, `--maxw:1180px`, `--ease`. No new colors; light-only stays.
- **`landing.css`** (1345 lines): `.trace/.trace-live/.trace-faint/.junction/.flowing/.energized` + `@keyframes flow`; `.node/.lit/.tap`; `.lines/.ln/.filled`; `.paper/.docline/.refine/.stamp/.stamped/.corner-fold`; `.band-dark/.board/.dcard/[data-stale]/.stale-dot` + `@keyframes pulse`; `.caps-wrap/.rail/.cap`; `.closing/.converge`; `.reveal/.intro` + `@keyframes rise`; `@media (scripting:none)` and full reduced-motion block. Extend these families; don't fork parallel systems.
- **Helpers**: `components/web/landing/trace.ts` — `orth(a,b,r)`, `orthV(a,b,r)`, `anchor(stage,el,side)`, `ns(tag)`; `use-reveal.ts` — `useReveal({threshold})` play-once IO stamping `data-shown`, `prefersReducedMotion()`.
- **Components**: 6 sections in `components/web/landing/`, shell/nav/footer in `components/layout/web/`.

## Final section order (11)

1. Nav (+ seed-trace SVG under brand, unported prototype detail)
2. Hero (recomposed chain)
3. How-it-works strip (new, compact: capture → generate → track)
4. Capture / extension
5. Personas fork (new)
6. Documents (stamp upgrade + refine demo + exports row)
7. Dark band: pipeline + freshness + timeline/reminder strip
8. Capabilities (interactive wiring legend)
9. FAQ (new, inline accordion — NOT a link to `/faq`, that page is a ComingSoon stub)
10. Closing (+ converge, unchanged geometry)
11. Footer (+ exit-trace, unported prototype detail)

Eyebrow budget: 11 sections → max 3. Keep hero + dark band + capabilities; delete the rest (capture, documents get plain heads).

---

## Tasks (commit each)

### T1 — Quick wins: CTAs + eyebrow reduction + copy audit
- `hero.tsx:237` `Start free` → `<Link href="/register">`; closing `Add to Chrome` → `href="#extension"` (until Web Store listing exists).
- Remove eyebrows from `capture-section.tsx` ("The entry point") and `documents-section.tsx` ("The signature output"). Keep hero, pipeline ("The destination, watched"), capabilities ("The whole system").
- Copy self-audit pass over all visible strings (skill §4.9).

### T2 — Rhythm + baseline
- Normalize section vertical scale in `landing.css`: one padding token (`--sec-pad`) with per-section overrides only where a visual needs breathing room; kill the dead field between capture and documents.
- Soften `.bg-baseline`: alpha ~4%→2.5%, spacing 122→160px, keep radial mask. Lines must read as field tooth, never dividers.
- Anchor every visual to its copy block (capture popup + pills become one composed `cap-visual` column, vertically centered against the text).

### T3 — Hero chain recompose (owner priority)
In `hero.tsx` + `.stage` CSS (option a: tighten + enrich in place):
- Pull node geometry tighter (stage stays ~600×480 but nodes occupy it; shrink dead gaps between persona/job column and fork).
- Wires: dormant stroke 1.5→2px, slightly darker `--trace`; keep `orth()` routing with 12px PCB corners; junction dot at fork stays the page's anchor moment.
- Fan the sheets so BOTH read: cover letter rotated out further (~-7°) with its `stype` + 2 lines visible; résumé keeps focus. Give the résumé mini-sheet a touch more type-set detail (name serif, one accent line as now, add a mono date column).
- Enrich nodes: Persona card gets a 20px serif-initial monogram chip + 2 mono skill chips; Job card gets salary line (`$160–190k` mono) under location; keep `via extension` tap.
- Dock the Applied pipeline card ON the wire: the docs→pipe trace terminates in a junction dot that touches the card's top border; card sits within the stage's right column, not dangling below-right.
- Keep the load traversal choreography exactly as is (constant-speed current, reduced-motion final-state, ≤720px vertical spine reroute). Only geometry/density changes.

### T4 — Documents section: stamp + refine demo + exports
- **Stamp** (`.stamp` SVG in `documents-section.tsx`): authentic rubber-stamp — rotation ~-6° (already -8°, fine), add SVG `feTurbulence`-based displacement/erode filter on the rects+text for distressed ink edges, uneven-pressure opacity via a radial mask, slight ink-bleed (1px blur duplicate underneath at low alpha). Keep `TAILORED`, keep bounce-in.
- **Refine demo**: make the dead `.rchip` row demonstrate. On `stage.shown` (after lines fill): the `Humanize` chip lights (accent border+bg), the struck line draws its strikethrough, the replacement `.new` line wipes in with the `HUMANIZE` tag — one sequenced ~2s beat via existing class toggles + CSS transitions. Reduced-motion: final state instant. Chips stay non-interactive (`aria-hidden` on the choreography, real text in DOM).
- **Exports row**: under the docstage, one mono row: `PDF` · `LaTeX` · `Open in Overleaf` styled as `.pill`-family chips with tiny glyphs (reuse corner-fold motif). States the real product capability (6b shipped these).

### T5 — Capture section recompose
- Popup + source pills composed as one unit (pills tucked to the popup's bottom edge, slight overlap, shared contact-shadow); whole visual vertically centered vs copy.
- Add a short routed trace entering the popup from the section's left edge and exiting right (stub ends for the spine to visually pick up later, static, `trace-faint`).
- Headline/copy unchanged except audited; eyebrow already removed in T1.

### T6 — Personas fork section (new)
New `components/web/landing/fork-section.tsx` + CSS, inserted after capture:
- Headline: `One persona. <em>Every tailored draft.</em>` Deck ≤20 words: personas are role profiles (up to five), built from your profile or imported from a résumé PDF.
- Left: one Persona node (reuse `.node` family, richer: monogram, `3 / 5 used` mono, 3 skill chips).
- Right: borderless stack of 4 document rows (title serif, mono context `Ramp · Senior PM`, persona name, date) — reuse the app's borderless-list idiom, hairline-separated sparsely (no border-t+border-b).
- Fan-out: one SVG (built with `orth()` + `anchor()`) from the node's right side splitting to each row's left edge; rows light top-to-bottom on reveal (`useReveal`, stagger). Reduced-motion: all lit.
- Mobile: node above, rows below, vertical `orthV` spine.

### T7 — Dark band deepen (+ timeline/reminders)
In `pipeline-section.tsx`:
- Fill the board honestly: 2 cards per column (add one Offer-column card e.g. `negotiating start date`), so no empty wells.
- Make freshness the visible story: a small legend row above the board — `fresh` (green, `0–3d`) → `cooling` (amber, `4–9d`) → `cold` (red, `10d+`) with the mono day-ranges; ticks on cards stay.
- **Timeline strip** (owner-decided placement): under the board, one thin horizontal event-strip — 5 mono events on a hairline rail with junction dots: `saved via extension → applied → reminder set → quiet 14d · ghost alert → follow-up sent`. The ghost-alert dot pulses (reuse `@keyframes pulse`); last event resolves it green. One-line caption: every job keeps its own timeline, reminders land in real time.
- Layout stays copy-left / board-right; strip spans full width beneath.

### T8 — Capabilities interactive legend
In `capabilities-section.tsx` + CSS:
- Keep borderless two-column `.caps`. Add: hovering a row lights its `::before` junction AND the rail segment beside it (rail becomes 6 stacked spans or an SVG with per-row segments; accent transition). Pure CSS where possible.
- Add per-row mono count/fact where honest (`up to 5` personas, `any site` extension); no fake numbers.
- Rows link where a section exists (`#pipeline`, `#documents`, `#extension`).

### T9 — How-it-works strip (new)
New `components/web/landing/steps-strip.tsx` directly under hero:
- One slim band, 3 verb-noun terminals on a single horizontal trace with junction dots: `Capture` (one click, any board) · `Generate` (résumé + letter per job) · `Track` (one pipeline, watched). NO "Step 1/2/3" labels (banned).
- Mono terms + one-line sans description each; the trace between them is the first visible continuation of the hero's wire.
- Mobile: vertical with `orthV`-style spine.

### T10 — FAQ section (new)
New `components/web/landing/faq-section.tsx` before closing:
- 4 inline Q/As, native `<details>/<summary>` (no Radix on the public surface), hairline-separated, serif questions / sans answers:
  1. Is it free? (what free includes, honest)
  2. Where does the AI get my data? (personas/profile you provide; Gemini generates; you edit)
  3. Does the extension work outside LinkedIn? (any site, on-demand extraction)
  4. Can I export? (PDF, LaTeX, Overleaf)
- No link to `/faq` (stub). Plain head, no eyebrow.

### T11 — The connective spine (signature piece, after sections stabilize)
New `components/web/landing/spine.tsx` (client), rendered once in `(web)/page.tsx` behind sections:
- Absolutely-positioned full-height SVG (`inset:0`, `z-index:0`, sections' `.wrap` content at `z-index:1`; `pointer-events:none`).
- Routes ONE continuous orthogonal trace (reuse `orth`/`orthV` + `ns`) from the hero stage's exit, past each section's visual anchor (capture popup stub from T5, fork node, docstage, dark-band board edge, capabilities rail top, into the closing converge's entry band), alternating page sides so it threads *under* content surfaces.
- Geometry: measure section wrappers via `getElementById` refs + `getBoundingClientRect`, rebuild on `ResizeObserver` (rAF-throttled, pattern already in `closing-section.tsx`).
- Motion: segments are dormant `--trace-faint`; each segment gets one `flow` pulse when its section first reveals (hook into a tiny shared event or per-segment IO), then settles `.energized`. Cap: ≤2 concurrent animated paths (existing discipline). Reduced-motion: fully static lit. No scroll listeners.
- Inside the dark band the spine switches to `--trace-ink` (mask or per-segment class).
- Also: port the two prototype leftovers — nav `seed-trace` SVG under the brand (`web-nav.tsx`), footer exit-trace below the colophon (`web-footer.tsx`).

### T12 — Mobile + reduced-motion + no-JS pass
- ≤720px: verify hero vertical spine, new sections' vertical fallbacks (fork, steps, timeline strip), spine routing simplified to a single left-gutter vertical rail on mobile.
- Reduced-motion: every new choreography (stamp distress is static anyway, refine demo, fork fan-out, spine pulses, timeline pulse) resolves to final lit state — extend the existing `prefers-reduced-motion` block.
- `@media (scripting:none)`: new reveal-gated content visible.

### T13 — Gates + visual verification
- `cd frontend-next && npm run typecheck && npm run lint && npm run test && npm run build`.
- Docker stack already runs at :8080. Headless visual smoke (Chrome extension unavailable): `google-chrome --headless --screenshot=... --window-size=1905x950 http://localhost:8080/` at 1905px, 1280px, 390px widths + a full-page capture; eyeball against the audit issues.
- Update `progress.md` + the repo plan doc status.

## Verification checklist (acceptance)

- One continuous circuit visible: spine threads hero → …→ closing; no section reads as an island.
- Hero: both sheets legible, wires clearly visible, Applied card docked, no dangling elements; chain still traverses on load; fits one viewport at 1440px.
- No `href="#"` CTAs. Eyebrows ≤3. No em-dashes anywhere (audit strings).
- Stamp reads as pressed rubber ink; refine demo plays once on scroll; exports row present.
- Personas, refine, exports, timeline/reminders, FAQ/free-clarity all present on page.
- Dark band: no empty board wells; freshness legend legible; timeline strip pulses once.
- All gates green; reduced-motion + 390px + no-JS sane in headless shots.

## Execution strategy (owner directive)

- Implementation tasks run as **cheaper-model subagents**: `model: "opus"` for section/CSS build tasks, `"haiku"` for mechanical edits (T1). **Never Sonnet 5.**
- Fable (main loop) only orchestrates: dispatches one task at a time (T2–T11 touch shared `landing.css`/sections, so sequential; independent new-component tasks T6/T9/T10 may run in parallel worktrees if conflict-free), reviews each diff against this plan + the taste skill, runs gates, commits.
- Commit per task on `landing-page-redesign`; no push.

## Out of scope

- Dark mode for the web surface (still light-only v1).
- `/about`, `/faq`, `/contact` real pages (stay ComingSoon stubs).
- Real Chrome Web Store link (extension unpublished; CTA anchors to #extension).
- Hero option (b) "framed schematic board" — parked; revisit only if (a) disappoints in review.
