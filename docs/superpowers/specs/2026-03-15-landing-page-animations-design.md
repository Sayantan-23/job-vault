# Landing Page Animations & Flowing Line Design

**Date**: 2026-03-15
**Status**: Approved
**Scope**: Hero entrance animation, How It Works vertical timeline, Features horizontal scroll, flowing line, Lenis smooth scroll

## Overview

Enhance the landing page (`frontend/app/pages/index.vue`) with:
1. Cinematic hero entrance animation on page load
2. Restructured "How It Works" section (horizontal → vertical timeline)
3. Reordered sections: How It Works before Features
4. Continuous flowing line connecting How It Works → Features
5. Horizontal scroll carousel for Features section (desktop)
6. Lenis smooth scroll across the entire page

## Tech Stack

- **GSAP + ScrollTrigger**: All scroll-driven animations (already in project)
- **Lenis** (`^1.1.0`): Smooth scroll wrapper (new dependency, install via `docker compose exec app yarn add lenis@^1.1.0`)
- **SVG**: Flowing line paths
- No new CSS spec dependencies; all animations use GSAP or CSS keyframes

## Section Order (Changed)

| # | Section | Change |
|---|---------|--------|
| 1 | Hero | Entrance animation added (replaces v-reveal) |
| 2 | Trust Badges | No changes |
| 3 | **How It Works** | Moved up (was after Features). Horizontal → vertical timeline |
| 4 | **Features** | Moved down. Bento grid → horizontal scroll carousel (desktop) |
| 5 | Testimonials | No changes |
| 6 | Chrome Extension | No changes |
| 7 | Final CTA | No changes |

**Note**: After reorder, the hero's "Learn More" button (`scrollToFeatures()`) should be updated to scroll to `#how-it-works` instead of `#features`, since How It Works is now the next narrative section. Update both `index.vue` (line 15) and `web/Navbar.vue` (line 38) if applicable.

## 1. Hero Entrance Animation

**Trigger**: Immediately on component mount (`onMounted`). No scroll required.

**Sequence** (total ~2.5s):

| Delay | Element | Animation | Duration | Easing |
|-------|---------|-----------|----------|--------|
| 0ms | Background gradient | opacity 0→1, scale 0.95→1 | 800ms | ease-out |
| 200ms | Hero grid pattern | opacity 0→0.15 | 600ms | ease-out |
| 400ms | Heading | y: 30→0, opacity: 0→1 | 600ms | power3.out |
| 400ms | "Ghost-Proof" text | Gradient-clip sweep (purple→white mask slides left-to-right) | 800ms | power2.inOut |
| 700ms | Subtitle | y: 20→0, opacity: 0→1 | 500ms | power3.out |
| 900ms | CTA buttons | y: 20→0, opacity: 0→1 (staggered 100ms) | 400ms each | power3.out |
| 1200ms | Dashboard mockup | x: 60→0, opacity: 0→1 | 800ms | back.out(1.2) |
| 1800ms | Floating orbs | scale: 0→1, opacity: 0→1 (staggered 150ms) | 400ms each | back.out(2) |

**Implementation**:
- Create a GSAP timeline in `onMounted`
- Hero elements use `gsap.set()` for initial hidden state (`opacity: 0, visibility: 'hidden'`) — no separate CSS class needed, GSAP handles both set and animate inline
- GSAP timeline animates each element, setting `visibility: 'visible'` alongside opacity/transform tweens
- Replaces current `v-reveal` directives on hero elements only

**Floating orbs — CSS animation handoff**:
- Orbs currently have CSS `animation: orb-drift-*` for continuous floating
- During hero entrance, orbs start with `animation-play-state: paused` via CSS
- GSAP entrance animates `scale: 0→1, opacity: 0→1`
- On GSAP entrance `onComplete` callback, set `animation-play-state: running` so the CSS drift begins after the orb is visible

**"Ghost-Proof" gradient sweep**:
- The text "Ghost-Proof" uses `background-clip: text` with a linear gradient
- GSAP animates `backgroundPosition` from `-100%` to `0%` creating a left-to-right reveal sweep
- Gradient: transparent → primary-400 → primary-600

**Reduced motion**: If `prefers-reduced-motion: reduce`, all elements fade in together over 300ms with no transforms. Orb CSS animations start immediately.

## 2. How It Works (Vertical Timeline)

**Layout change**: Convert from 3-column horizontal grid to vertical timeline.

### Desktop Layout
```
            "How It Works"
              Subtext

    ┃
    ┃  ┌──────────────────────┐
   (1) │ Sign Up Free          │
    ┃  │ Create account...     │
    ┃  └──────────────────────┘
    ┃
    ┃  ┌──────────────────────┐
   (2) │ Add Your Jobs         │
    ┃  │ Paste URLs or...      │
    ┃  └──────────────────────┘
    ┃
    ┃  ┌──────────────────────┐
   (3) │ Stay On Top           │
    ┃  │ Track, get reminders  │
    ┃  └──────────────────────┘
    ┃
    ╰────────────────────────── (smooth curve into horizontal)
```

### Structure
- Centered container (`max-w-2xl` or similar)
- Left side: SVG line + numbered circles
- Right side: Glass cards with icon + title + description
- The vertical line is its own SVG scoped to this section (see Section 3 for details)

### Mobile Layout
- Same vertical layout (already vertical)
- Line on the left, cards filling remaining width

## 3. Flowing Line (SVG)

### Architecture: Two Separate SVGs

The flowing line is split into **two separate SVG elements**, each scoped to its own section. This avoids issues with ScrollTrigger pinning (which pulls the Features section out of normal flow, invalidating cross-section absolute positioning).

| SVG | Scope | Path |
|-----|-------|------|
| SVG 1 (vertical) | How It Works section | Straight vertical line through 3 steps, ending with a curve that exits bottom-right |
| SVG 2 (horizontal) | Features section (inside pinned container) | Horizontal line through the 6 feature cards |

The two SVGs are visually aligned so the end of SVG 1 and the start of SVG 2 appear as one continuous path. SVG 1's curve exits at the right edge at the same Y-position where SVG 2's horizontal line begins.

Both SVGs share the same ScrollTrigger progress variable so the traveling segment appears to cross seamlessly from one to the other.

### Three Layers (per SVG)

| Layer | Purpose | Style |
|-------|---------|-------|
| Base track | Faint visible path | `stroke: var(--ui-primary)`, `opacity: 0.15`, `stroke-width: 2` |
| Glow | Ambient purple glow | Same path, `filter: blur(8px)`, `opacity: 0.08`, `stroke-width: 6` |
| Traveling segment | Comet tail effect | `linearGradient` stroke, GSAP animates `strokeDashoffset` |

### Z-Index Layering

The current page wraps post-hero sections in `<UiBackgroundGradientAnimation>` which has animated gradient blobs. The flowing line SVGs should be layered:
- Gradient blobs: `z-index: 0` (background)
- Flowing line SVGs: `z-index: 1` (above blobs)
- Section content (cards, text): `z-index: 2` (foreground)

The SVGs use `pointer-events: none` so they don't block card interactions.

### Traveling Segment (Comet Tail)

- Each SVG path uses `stroke-dasharray` with pattern `[segmentLength, totalLength - segmentLength]`
- `segmentLength` = ~15% of total path length
- GSAP ScrollTrigger with `scrub: 1.5` animates `strokeDashoffset` from `totalLength` to `-segmentLength`
- A `<linearGradient>` on the segment creates fade-in/fade-out at both ends (transparent → bright purple → transparent)
- The bright center of the segment appears as a "traveling light"

### Scroll Coordination

A single ScrollTrigger spans the combined scroll range of How It Works + Features sections. Its `onUpdate` callback maps progress to the appropriate SVG:
- Progress 0–0.4: Traveling segment moves through SVG 1 (vertical)
- Progress 0.4–1.0: Traveling segment moves through SVG 2 (horizontal)

### Path Shape

**SVG 1 (How It Works — vertical)**:
```
M centerX, topY
L centerX, step1Y
L centerX, step2Y
L centerX, step3Y
C centerX, controlY, rightEdgeX, bottomY, rightEdgeX, bottomY
```

**SVG 2 (Features — horizontal)**:
```
M 0, centerY
L card1X, centerY
L card2X, centerY
... through card 6
L endX, centerY
```

Path coordinates for SVG 1 are calculated once on mount (via `requestAnimationFrame` → `nextTick` to ensure layout is settled) and recalculated on debounced resize. SVG 2 coordinates are relative to the features track and don't need recalculation.

### Step Circle Interactions

When the traveling segment reaches each numbered circle:
- Circle pulses: `scale(1) → scale(1.15) → scale(1)` over 300ms
- Circle fill: `transparent → rgba(91,43,238,0.2)`
- Adjacent card: subtle border glow pulse

Implemented via ScrollTrigger `onUpdate` checking progress thresholds.

### Node Dots Between Feature Cards

Small dots (r=4) positioned between cards along the horizontal line. Pulse when the traveling segment passes.

### Mobile (<1024px)

On mobile, the flowing line is **desktop-only**. Mobile shows a simpler alternative:
- How It Works: A static dashed vertical line (`stroke-dasharray: 4,8`, `opacity: 0.2`) on the left side connecting the step circles. No traveling segment, no glow layer.
- Features: No connecting line (cards stack vertically with `v-reveal.up`).

This keeps mobile performance clean and avoids complex responsive SVG path management.

## 4. Features Horizontal Scroll

### Desktop (>=1024px): Pin + Scrub

**Container structure**:
```html
<section class="features-section">        <!-- ScrollTrigger trigger -->
  <div class="features-header">            <!-- heading + subtext, visible above -->
    <h2>6 Tools, Zero Ghosting</h2>
    <p>Subtext...</p>
  </div>
  <div class="features-track-wrapper">     <!-- overflow: hidden -->
    <div class="features-track">           <!-- flex row, GSAP animates x -->
      <div class="feature-card">...</div>  <!-- 6 cards -->
      ...
    </div>
  </div>
</section>
```

**ScrollTrigger config**:
```js
ScrollTrigger.create({
  trigger: '.features-section',
  start: 'top top',
  end: () => `+=${totalScrollDistance}px`,  // ~300vh worth of scroll
  pin: true,
  scrub: 1.5,
  onUpdate: (self) => {
    // Animate features-track x position
    // Animate flowing line traveling segment (SVG 2)
  }
})
```

**Scroll distance**: `totalScrollDistance = (6 cards * cardWidth + gaps) - viewportWidth + padding`. Approximately 300vh of vertical scroll maps to the full horizontal traverse.

**Cards**: ~320px wide, 24px gap, glass styling:
- `bg-white/70 dark:bg-gray-800/70`
- `backdrop-blur-lg`
- `border border-white/20 dark:border-gray-700/30`
- `rounded-2xl`
- `p-6`
- Hover: `translateY(-4px)` + increased shadow

**Card content**: Icon (in rounded primary/10 container) + title + 2-line description.

**Scrollbar hidden**:
```css
.features-track-wrapper {
  overflow: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.features-track-wrapper::-webkit-scrollbar {
  display: none;
}
```

### Mobile (<1024px): Vertical Stack

- Cards stack in a single column with `gap-6`
- No pinning, no horizontal scroll
- No flowing line (desktop-only)
- Each card uses `v-reveal.up` with staggered delays (current behavior)

### Responsive Breakpoint

- `>=1024px`: Horizontal scroll with pin+scrub + flowing line
- `<1024px`: Vertical stack with v-reveal, no line
- ScrollTrigger instance created/destroyed on resize via `matchMedia`

```js
ScrollTrigger.matchMedia({
  '(min-width: 1024px)': () => {
    // Create horizontal scroll ScrollTrigger + flowing line
    return () => { /* cleanup: kill triggers, remove SVG listeners */ }
  }
})
```

## 5. Lenis Smooth Scroll

### Installation
```bash
docker compose exec app yarn add lenis@^1.1.0
```

### Integration (Nuxt Plugin)

Create `frontend/app/plugins/lenis.client.ts`:

```ts
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default defineNuxtPlugin((nuxtApp) => {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 2,
  })

  // Sync Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))

  // Note: lagSmoothing(0) is a global GSAP setting — intentionally applied app-wide
  // to ensure Lenis-GSAP sync is smooth across all pages
  gsap.ticker.lagSmoothing(0)

  // Cleanup on app unmount
  nuxtApp.hook('app:beforeMount', () => {
    // Reset scroll position on route change
    nuxtApp.hook('page:finish', () => {
      lenis.scrollTo(0, { immediate: true })
    })
  })

  // Provide lenis instance for components that need scrollTo or pause/resume
  return {
    provide: { lenis }
  }
})
```

### Replacing Existing scrollIntoView Calls

All existing `scrollIntoView({ behavior: 'smooth' })` calls must be replaced with Lenis `scrollTo()`:

| File | Line | Current | Replace with |
|------|------|---------|-------------|
| `index.vue` | ~15 | `document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })` | `useNuxtApp().$lenis.scrollTo('#how-it-works')` |
| `web/Navbar.vue` | ~38 | `scrollIntoView({ behavior: 'smooth' })` | `useNuxtApp().$lenis.scrollTo(targetSelector)` |

### CSS Changes

Remove `scroll-behavior: smooth` from `html` in `main.css` (line 9) — Lenis handles all smooth scrolling now.

### Considerations
- Lenis is global and always active across all routes
- Forms and dropdowns: Lenis ignores elements with `data-lenis-prevent` attribute — add this to any Nuxt UI modal/dropdown containers if scroll conflicts arise
- Route changes: Lenis scroll position resets via the `page:finish` hook above

## 6. Accessibility

- All animations respect `prefers-reduced-motion: reduce` (already implemented in v-reveal directive)
- New GSAP animations check `window.matchMedia('(prefers-reduced-motion: reduce)')` before creating timelines
- If reduced motion: hero fades in immediately (300ms, no transforms), static line shown (no traveling segment), no pin+scrub (features show as vertical stack on all breakpoints)
- Lenis respects system settings

## 7. Files to Modify

| File | Changes |
|------|---------|
| `frontend/app/pages/index.vue` | Reorder sections, hero GSAP timeline, How It Works vertical layout, Features horizontal scroll, flowing line SVGs, update `scrollToFeatures()` target |
| `frontend/app/plugins/lenis.client.ts` | **New file** — Lenis smooth scroll plugin with GSAP sync |
| `frontend/app/assets/css/main.css` | Remove `scroll-behavior: smooth` from `html`, add scrollbar hiding for features track, add flowing line z-index styles, add `orb-float-*` initial `animation-play-state: paused` |
| `frontend/app/components/web/Navbar.vue` | Replace `scrollIntoView` with Lenis `scrollTo` |
| `frontend/package.json` | Add `lenis@^1.1.0` dependency |

## 8. Deferred (Future TODOs)

- [ ] Parallax on decorative elements (floating orbs, background gradients) with subtle depth (0.9x-1.1x speed)
- [ ] Section transition effects: overlapping gradients between sections for continuous canvas feel
- [ ] Consider adding progress indicators during the pin+scrub section (dots or mini progress bar)

## 9. Performance Considerations

- SVG path calculations use `requestAnimationFrame` + `nextTick` before initial calculation to ensure layout is settled
- GSAP ScrollTrigger `scrub` uses requestAnimationFrame, no layout thrashing
- Lenis uses transform-based scrolling, composited on GPU
- `will-change: transform` on animated elements (features track, flowing line)
- All heavy animations (line, horizontal scroll) are behind `matchMedia` — mobile gets simpler animations
- Cleanup: All ScrollTrigger instances, GSAP timelines, resize listeners, and Lenis are properly cleaned up in `onUnmounted` to prevent memory leaks on navigation
- `gsap.ticker.lagSmoothing(0)` is set globally — intentional for Lenis sync, acceptable trade-off since all pages benefit from Lenis smooth scroll
