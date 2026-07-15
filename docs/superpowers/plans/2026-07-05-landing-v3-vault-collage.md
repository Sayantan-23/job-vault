# Landing v3 — "The Vault Collage"

**Branch:** `landing-page-redesign` (continue on it). Commit per task, never push.
**Mode:** Redesign-overhaul of the v2 landing. The circuit/trace concept is retired; the new cohesion model comes from the 4 reference teardowns (tasteskill.dev, floria, collectiveos, caveman.so).
**Status:** EXECUTED 2026-07-05 (12 tasks, commits `55ddee4..3842847`; gates green incl. production Docker build).
**v3.1 (2026-07-06, commits `44e1362..583556e`):** owner-feedback round after the v3 browser pass, executed against fresh reference re-reads (`frontend-next/references/screenshots/`). `motion` v12 adopted (owner authorized; scroll effects planned). Changes: tactile background (paper grain + hero atmosphere + `.viz-glow`), collage rebalance (wider popup, modern phone with dynamic island + tab bar), Floria-style numbered/iconed how-it-works, capture card-stack beat (previous state stays visible), dark Track band as inset rounded panel (seams deleted), statement-size interstitial, lucide FAQ pluses, and a merged dark finale (closing CTA + footer, wordmark band between them). **v3.2 (2026-07-07, commits `f45983d..86b16d5`):** headline picked ("Applications go quiet. *Yours won't*."), atmosphere +1 notch, collage back to the original v3 composition with the new card designs (phone 214x441), capture stack now an interactive drag-to-flip motion deck (`capture-deck.tsx`).

## Owner decisions (this round)

- Header carries **page links** (FAQ, About, Contact — routes exist as stubs, real pages later) + Login + one CTA. No section anchors in the nav.
- Hero must show the **whole product identity**, not one feature — a tasteskill-style collage of surfaces, not a single board mockup.
- **Circuit retired**: no drawn spine, no nav seed-trace, no footer exit-trace, no fork fan, no converge wires.
- **Mobile app** gets mentioned (it is planned, not built — copy must stay honest: "in development").
- **No animation library.** Extend the existing `use-reveal.ts` IO + CSS system. Motion/GSAP rejected deliberately (CollectiveOS proves IO + CSS transitions suffice at this motion level).
- Implementation via cheaper subagents (opus; haiku for mechanical edits). Sonnet 4.6/4.7 preferred by owner but not selectable in this harness; **never Sonnet 5**. Fable orchestrates/reviews/commits.

## Design read (taste skill §0.B)

Redesign-overhaul, SaaS landing for job-seekers, warm editorial serif+mono language, flat muted-indigo accent, native CSS + IO reveals, product-truth mockups as the visual payload. Dials: VARIANCE 7 / MOTION 5 / DENSITY 3.

**Brand tokens preserved (redesign protocol §11.C):** warm-stone canvas, `--accent` muted indigo, Newsreader serif display (existing brand asset across app; the one italic-accent-phrase move stays), Geist sans body, Geist Mono for every number/date/label, hairlines, near-zero shadows, light-only web surface (existing decision). Vermilion only on the TAILORED stamp.

## Cohesion model (replaces the spine)

1. **One warm canvas**; exactly **one theme flip** (the dark Track band, taste skill §4.11 allows one deliberate inversion). Footer stays light-warm.
2. **Gradient seams** at both dark-band boundaries (Floria device) — no hard border, fixes the "line direction change not visible at section border" complaint class.
3. **Uniform reveal choreography**: one fade-rise pattern + per-child stagger (`--i` delay) on every section via `use-reveal`. No bespoke per-section choreography systems.
4. **Recurring motifs**: mono uppercase micro-labels (rationed), hairline cards at one radius scale (12px cards / pill buttons, documented rule), faithful product surfaces, the ghost/freshness signal (green/amber/rose) as the only non-indigo color, giant ghost wordmark texture (Floria) used once.
5. **Numbered typographic spine**: How-it-works uses plain verb-noun terminals (no "Step 1/2/3" labels — banned), features read in the same order the product works.

## Mockup fidelity contract (the core fix)

Every product surface shown on the landing MUST mirror the real UI. Source of truth = the extracted spec (below). No invented chrome: **no macOS traffic-light dots anywhere** (the extension popup and phone are not desktop windows). Real component styling: hairline borders, white cards, 8px inner radius, Geist/mono/serif per app rules.

### Real-UI spec extract (from source, 2026-07-05)

- **Extension popup**: 360px wide, `border-radius 14px`, warm off-white body. TopBar = 20px indigo rounded square w/ white glyph + "JobVault" serif wordmark + gear icon right, hairline bottom border. Body `p-5 space-y-4`: "Captured from" + pill badge (`bg-primary/10 text-primary` "LinkedIn"); three labeled fields (Title / Company / Location) — label `text-xs muted` above `h-10 rounded-lg border bg-field` input; full-width indigo button "Save to JobVault". Success view (no TopBar): centered 48px green-tinted circle w/ check, serif "Saved to JobVault", `title · Company` subtext, primary "Open in JobVault ↗" + ghost "Done".
- **Persona card**: `rounded-lg border-hairline p-4`, name `font-medium` + count line `{N} roles · {M} skill groups` (numbers mono), pencil/trash icon buttons top-right, 2-line muted summary, full-width outline button "Generate résumé".
- **Cover letter**: plain business letter — stacked contact block (name/email/phone as soft-break lines), gap, "Dear …," greeting, 3–4 paragraphs, "Sincerely," + name. No card-in-card, no rule lines. Screen: `text-sm leading-relaxed`, bold = font-semibold, links indigo underline.
- **Résumé**: single-column ATS — centered bold name (22pt-scale), centered contact line joined by `|`, section titles bold with a 1pt accent bottom rule ("Professional Summary", "Experience", "Skills", "Education"), experience rows = bold company left / date right, role line, • bullets.
- **Board card**: `rounded-lg border-hairline bg-card p-3`, title `text-sm font-medium`, `company · location` muted xs, GhostMeter row: clock (green "active") / timer (amber "stale") / ghost (rose "ghosted") icon + mono `5d`.
- **Jobs list row**: borderless, `divide-y hairline`; title over company·location left; StatusChip (`mono 10px uppercase`; Interviewing `bg-primary/10 text-primary`, Offer solid indigo) + GhostMeter + mono date right.

## Final section order (10)

1. **Nav** — floating pill bar: logo chip (indigo square glyph + "JobVault" serif) left; FAQ / About / Contact / Login; "Start free" pill CTA right. One line, ≤72px.
2. **Hero** — split. Left: copy stack (≤4 elements): headline ≤2 lines serif w/ one italic accent word, ≤20-word subtext, "Start free" (primary, `/register`) + "Add to Chrome" (outline, `#extension`). Right: **the vault collage** — 5 faithful mini-surfaces at graded depth/slight rotation: board column (2 cards w/ GhostMeter), extension popup (compact), résumé sheet, cover letter sheet, **phone frame** (mobile app teaser, mini board inside, small mono "in development" tag). 2–3 floating mono stat badges (`float` keyframes). Load-time staggered rise. Fits 100dvh; `min-h-[100dvh]` never `h-screen`.
3. **How it works** — slim band, three verb-noun terminals (Capture / Generate / Track) + one-liners. No rail line, no numbers-as-eyebrows; typographic only.
4. **Capture** (`#extension`) — copy + faithful popup w/ a two-beat capture→success swap on reveal; source pills (LinkedIn / Indeed / Naukri / Greenhouse / + any site) forced one line.
5. **Personas** — copy + real persona card left, evenly spaced doc list right (grid rows, equal gaps, hairline separators; no curved SVG).
6. **Documents** — cover letter that looks like a letter + résumé that looks like a résumé, fanned; TAILORED stamp kept; refine beat kept (simplified); exports row (PDF / LaTeX / Overleaf).
7. **Track (dark band — the one theme flip)** — gradient seams top+bottom; board w/ real dcards; freshness legend; watchline strip w/ larger type; giant ghost "JOBVAULT" wordmark texture at ~3% opacity behind.
8. **Kinetic interstitial** — one full-width serif line ("Every application, *accounted for*." style), letter/word-staggered rise on reveal. Light canvas.
9. **FAQ** — keep current 4 native `<details>` items, restyle to match (no changes to mechanism).
10. **Closing + footer** — centered serif close ("Start the search that *stays warm*."), 2 CTAs (same labels as hero — no duplicate-intent variants); light-warm footer: giant ghost wordmark, link columns (Product / Pages / Contact), colophon. Plus a one-line honest mobile note ("iOS and Android app in development.") near the footer columns.

Eyebrow budget: ≤3 across 10 sections. Em-dashes: zero. Mid-dot: max 1/line. Copy self-audit per §4.9 in T11.

## Tasks (commit each; sequential — shared landing.css)

- **T1 Demolition** (opus): delete `spine.tsx`, nav seed-trace, footer exit-trace, capture stub traces, fork fan SVG, closing converge, steps rail SVG, hero chain choreography + all now-dead CSS (`.spine*`, `.nav-seed`, `.footer-exit`, `.cap-stub*`, trace/junction families where unused). Keep `use-reveal.ts`, tokens, section shells compiling (temporary plain layouts OK). Gates: typecheck + lint + tests still green (delete/adjust dead tests).
- **T2 Nav + footer shells** (opus): pill nav per spec; light footer w/ ghost watermark + columns + mobile-app line. Kill old nav/footer trace remnants.
- **T3 Hero vault collage** (opus, the big one): new `hero.tsx` + `vault-collage.tsx` (client leaf) w/ 5 mini-surface components (shared with later sections where sensible: `mini/board-column.tsx`, `mini/extension-popup.tsx`, `mini/resume-sheet.tsx`, `mini/letter-sheet.tsx`, `mini/phone-frame.tsx` under `components/web/landing/mini/`). Faithful per spec. Graded depth (scale/rotate/z), float keyframes, badges, load stagger, reduced-motion final state, ≤720px simplified stack (collage collapses to 2 surfaces).
- **T4 Reveal unification** (opus): one `.reveal` fade-rise + `--i` stagger applied to every section; strip remaining bespoke choreography classes; extend reduced-motion + `scripting:none` blocks.
- **T5 Capture section** (opus): faithful popup (reuse `mini/extension-popup.tsx` at full 360px), capture→success two-beat on reveal, one-line pills.
- **T6 Personas section** (opus): real persona card (reuse or full-size variant), even doc list grid.
- **T7 Documents section** (opus): letter-true letter + résumé-true résumé (reuse mini sheets at larger scale), stamp kept, simplified refine beat, exports row.
- **T8 Dark band** (opus): gradient seams, real dcards, watchline type bump (≥13px labels), ghost wordmark texture, legend kept.
- **T9 Interstitial + steps + FAQ restyle + closing** (opus): kinetic serif interstitial, steps strip simplified, FAQ visual pass, closing per spec.
- **T10 Copy + pre-flight audit** (opus): every visible string re-read (§4.9), eyebrow count, em-dash scan, CTA duplicate-intent check, mid-dot ration, hero stack count.
- **T11 Mobile / reduced-motion / no-JS audit** (opus): 390/720/1024/1440, reduced-motion final states, `scripting:none` visibility.
- **T12 Gates + visual verify + docs** (Fable-led): typecheck + lint + tests + production Docker build; CDP-scrolled full-page capture reviewed by Fable; update `progress.md`, this plan's status, memory.

## Verification checklist

- Nav: page links only, one line, pill bar.
- Hero: one glance = whole product (board + docs + extension + phone); every surface recognizably matches real UI; no window chrome anywhere; fits viewport.
- Zero drawn connector lines page-wide. Zero em/en dashes. Eyebrows ≤3. No decorative dots (GhostMeter dots are semantic).
- Dark band boundaries are gradient seams; watchline legible.
- Mobile app mentioned honestly (hero phone tag + footer line).
- One radius system: 12–14px cards / pill CTAs / 8px inputs, documented in landing.css header comment.
- Gates green incl. production build; CDP full-page shot reviewed.
