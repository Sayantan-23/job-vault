# Landing Page (index.vue) — Animation, Layout & Quality Fixes

**Date:** 2026-03-14
**Approach:** Hybrid (CSS v-reveal directive + GSAP for key moments)
**Scope:** Fix non-standard animations, layout inconsistencies, GPU performance, and AI-slop patterns on the index landing page.

---

## 1. Animation Architecture

### Tier 1 — CSS `v-reveal` Directive

A custom Vue directive replacing the `useScrollReveal` composable.

**Registration:** Create a Nuxt plugin at `frontend/app/plugins/reveal-directive.ts` that registers the directive globally:
```typescript
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', { /* ... */ });
});
```

**Mechanism:** IntersectionObserver (threshold 0.1), fires once per element, adds `.revealed` class to trigger CSS transitions.

**CSS classes:** Reuse and update the existing `.scroll-reveal` / `.scroll-reveal.revealed` rules in `main.css`. The directive adds `.scroll-reveal` class on `mounted` and sets CSS custom properties for the transform based on modifiers.

**Modifier → Transform mapping:**
| Modifier | `--reveal-transform` |
|---|---|
| (none) / `.up` | `translateY(30px)` |
| `.down` | `translateY(-30px)` |
| `.left` | `translateX(30px)` |
| `.right` | `translateX(-30px)` |
| `.scale` | `scale(0.95)` |

**Delay via binding value:** Use `v-reveal.up="{ delay: 2 }"` (object with delay index). Each delay unit = 0.08s. This avoids the Vue modifier hyphen limitation. Default delay = 0.

Examples:
```html
<div v-reveal.up>Simple fade up</div>
<div v-reveal.left="{ delay: 1 }">Slide from left, delayed 0.08s</div>
<div v-reveal.scale="{ delay: 3 }">Scale in, delayed 0.24s</div>
```

**Reduced motion:** The directive checks `prefers-reduced-motion: reduce`. If true, it skips observation and immediately adds `.revealed` (element appears without animation). Additionally, add a CSS rule:
```css
@media (prefers-reduced-motion: reduce) {
  .scroll-reveal { opacity: 1 !important; transform: none !important; }
}
```

**Used for:** Hero text, trust badges, feature cards (staggered via delay values), testimonial cards, chrome extension promo, final CTA.

**Replaces (in index.vue only):** All `useScrollReveal` calls and `document.querySelector()` usage in `onMounted` on the index page.

**useScrollReveal.ts:** KEEP this file (do NOT delete). It is still imported by 5 other pages (`web/contact.vue`, `web/faq.vue`, `web/about.vue`, `web/terms.vue`, `web/privacy.vue`) which are out of scope. Mark it as deprecated with a comment: `// @deprecated — use v-reveal directive instead. Kept for web/* pages until they migrate.`

The existing `.scroll-reveal` / `.scroll-reveal.revealed` CSS rules in `main.css` are KEPT and updated with the new timing values (both the directive and the legacy composable share the same CSS classes).

### Tier 2 — GSAP (Dynamically Imported)

```typescript
const gsap = (await import('gsap')).default;
const { ScrollTrigger } = await import('gsap/ScrollTrigger');
gsap.registerPlugin(ScrollTrigger);
```

Used for exactly 3 effects:
1. **How It Works line draw** — SVG `strokeDashoffset` animated via ScrollTrigger scrub
2. **Feature card icon hover** — `scale(1.2) + rotate(8deg)` with `back.out(2)` easing
3. **Step circle activation** — circles scale-pop + color fill as the scroll-scrub line reaches them

**GSAP cleanup:** Store all ScrollTrigger instances and GSAP tweens in an array. In `onUnmounted`, call `.kill()` on each to prevent memory leaks:
```typescript
const triggers: (ScrollTrigger | gsap.core.Tween)[] = [];
// ... push each created trigger/tween to the array ...
onUnmounted(() => {
  triggers.forEach((t) => t?.kill());
  triggers.length = 0;
});
```

### Timing Scale

| Category | Duration | Easing |
|---|---|---|
| Entrance reveals (v-reveal) | 0.6s | `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) |
| Hover transitions | 0.3s | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Stagger delay increment | 0.08s per item | — |
| Ambient loops (orbs) | 22–32s | `ease-in-out` |
| Ambient loops (blobs) | 25–40s | `ease` / `linear` (existing) |

All ambient animations respect `prefers-reduced-motion: reduce`.

---

## 2. Hero Section Fixes

### 2.1 Background — Both Modes

**Light mode (.hero-bg):**
```css
.hero-bg {
  background-color: #f8f6fc;
  background-image:
    radial-gradient(ellipse at 70% 20%, rgba(91,43,238,0.07) 0%, transparent 55%),
    radial-gradient(ellipse at 20% 80%, rgba(138,107,253,0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 70%, rgba(91,43,238,0.04) 0%, transparent 45%),
    /* Arc replacements (from SVG removal): */
    radial-gradient(circle at 85% 10%, transparent 33%, rgba(91,43,238,0.06) 34%, rgba(91,43,238,0.06) 35%, transparent 36%),
    radial-gradient(circle at 10% 90%, transparent 38%, rgba(91,43,238,0.05) 39%, rgba(91,43,238,0.05) 40%, transparent 41%);
}
```

**Dark mode (.dark .hero-bg):**
```css
.dark .hero-bg {
  background-color: #151022;
  background-image:
    radial-gradient(ellipse at 70% 20%, rgba(138,107,253,0.12) 0%, transparent 55%),
    radial-gradient(ellipse at 20% 80%, rgba(91,43,238,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 70%, rgba(138,107,253,0.06) 0%, transparent 45%),
    /* Arc replacements: */
    radial-gradient(circle at 85% 10%, transparent 33%, rgba(138,107,253,0.08) 34%, rgba(138,107,253,0.08) 35%, transparent 36%),
    radial-gradient(circle at 10% 90%, transparent 38%, rgba(138,107,253,0.06) 39%, rgba(138,107,253,0.06) 40%, transparent 41%);
}
```

Remove the old `.dark .hero-bg { --arc-color: ... }` rule (no longer needed since SVG arcs are removed).

### 2.2 SVG Arc Removal

Remove the `<svg>` element with decorative arc circles from `index.vue` template. The visual is replaced by CSS radial-gradient ring layers in `.hero-bg` (see above).

### 2.3 Grid Glow Line Positions

Convert hardcoded pixel positions to responsive percentages:

| Current | New |
|---|---|
| `top: 128px` | `top: 20%` |
| `top: 320px` | `top: 50%` |
| `top: 448px` | `top: 70%` |
| `left: 192px` | `left: 15%` |
| `left: 512px` | `left: 40%` |
| `left: 832px` | `left: 65%` |

### 2.4 Floating Orb Animation Simplification

Replace 10+ keyframe stops with 4 stops. Remove all `scale()` transforms. Switch from `linear` to `ease-in-out`.

All 4 orbs get unique keyframes with durations: 22s, 26s, 28s, 32s:

```css
@keyframes orb-drift-1 {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(20px, -15px); }
  50%  { transform: translate(-10px, 20px); }
  75%  { transform: translate(-20px, -10px); }
  100% { transform: translate(0, 0); }
}

@keyframes orb-drift-2 {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(-18px, 12px); }
  50%  { transform: translate(15px, 22px); }
  75%  { transform: translate(20px, -14px); }
  100% { transform: translate(0, 0); }
}

@keyframes orb-drift-3 {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(16px, 18px); }
  50%  { transform: translate(-22px, -8px); }
  75%  { transform: translate(12px, -20px); }
  100% { transform: translate(0, 0); }
}

@keyframes orb-drift-4 {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(-12px, -20px); }
  50%  { transform: translate(18px, 14px); }
  75%  { transform: translate(-16px, 10px); }
  100% { transform: translate(0, 0); }
}

.orb-float-1 { animation: orb-drift-1 22s ease-in-out infinite; }
.orb-float-2 { animation: orb-drift-2 26s ease-in-out infinite; }
.orb-float-3 { animation: orb-drift-3 28s ease-in-out infinite; }
.orb-float-4 { animation: orb-drift-4 32s ease-in-out infinite; }
```

### 2.5 Layout Fix

Remove negative margin hack:
- **Remove:** `-mt-16` on the hero section
- **Remove:** Compensating `pt-36 sm:pt-44 lg:pt-52`
- **Add:** `pt-24 sm:pt-32 lg:pt-40` (accounts for 4rem navbar + desired padding)

### 2.6 scrollToFeatures() Function

The `scrollToFeatures()` function and "Learn More" button are KEPT. The features section `id="features"` is unchanged, so the smooth scroll target remains valid.

---

## 3. Feature Cards — Bento Grid + Anti-Slop

### Data Change

Add `hero: true` to the features array for "Kanban Pipeline" and "Ghost Meter":
```typescript
const features = [
  { icon: 'i-lucide-columns-3', title: 'Kanban Pipeline', description: '...', hero: true },
  { icon: 'i-lucide-ghost', title: 'Ghost Meter', description: '...', hero: true },
  // ... 4 standard features (no hero property)
];
```

### Layout (Bento Grid)

Use the same bento grid CSS from test-landing (scoped `<style>`):
```css
.bento-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 640px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
  .bento-hero { grid-column: span 2; }
}
@media (min-width: 1024px) {
  .bento-grid { grid-template-columns: repeat(4, 1fr); }
  .bento-hero { grid-column: span 2; }
}
```

### Hover Effects

- **Remove:** `hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10` (translate lift)
- **Add:** `transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/8` (shadow elevation only)
- **Add:** GSAP icon hover: `scale(1.2) + rotate(8deg)` on mouseenter, clean reset on mouseleave, with `back.out(2)` easing. The icon element needs `will-change-transform` class.

### Glass Variation Table

| Element | Classes |
|---|---|
| Feature hero cards | `bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-primary/10 dark:border-primary/15` |
| Feature standard cards | `bg-white/80 dark:bg-gray-800/80 border border-white/20 dark:border-gray-700/30` (NO backdrop-blur) |
| Hero mockup card | `bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/30 dark:border-gray-700/40` (existing, keep) |
| How It Works content cards | `bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-white/20 dark:border-gray-700/30` |
| Testimonial cards (non-center) | `bg-white/80 dark:bg-gray-800/80 border border-white/20 dark:border-gray-700/30` (NO backdrop-blur) |
| Testimonial center card (index 1) | Same as non-center + `md:scale-[1.02] border-primary/10 dark:border-primary/15` |
| Final CTA card | `bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-white/20 dark:border-gray-700/30` (existing, keep) |
| Chrome extension icon boxes | `bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg` (existing, keep) |

### Hero Card Mini-Illustrations

Kanban Pipeline card: 3 mini-columns with placeholder bars (adapted from test-landing `Features.vue` lines 146-155).
Ghost Meter card: Bar chart visualization (adapted from test-landing `Features.vue` lines 157-165).

These are only rendered inside hero cards via `v-if="feature.hero && feature.icon === '...'`.

---

## 4. How It Works — Redesigned Horizontal Stepper

### Desktop (md+)

- 3-column grid (`grid grid-cols-1 md:grid-cols-3 gap-8`), each column centered
- Horizontal connecting line at the vertical center of the numbered circles
- Numbered circles (size-12, bg-primary/10, text-primary, font-bold) sit ON the line with z-10
- Icon from each step is placed next to the title inside the content card (e.g., `<UIcon :name="step.icon" /> <h3>step.title</h3>`)
- Glass content card below each circle: icon + title + description

### SVG Horizontal Line

A new SVG element overlays the grid at circle height. The path is a simple horizontal line:
```html
<svg class="hidden md:block absolute top-6 left-[16.67%] right-[16.67%] h-1 overflow-visible" preserveAspectRatio="none">
  <line ref="lineRef" x1="0" y1="0" x2="100%" y2="0"
    stroke="var(--ui-color-primary-300)" stroke-width="2" stroke-linecap="round"
    class="dark:stroke-primary/40" />
</svg>
```

Note: The SVG uses a `<line>` element, not `<path>`, positioned from 16.67% to 83.33% (center of first column to center of last column in a 3-column grid). For GSAP `strokeDashoffset` to work on a `<line>`, it needs `stroke-dasharray` set to its computed length first.

**TypeScript note:** `<line>` inherits from `SVGGeometryElement` which has `getTotalLength()`, but TS types may not reflect this. Cast to `SVGGeometryElement` or use `as any` when calling `getTotalLength()`.

### GSAP Scroll Animation

```typescript
// Get the line element and calculate its length
const lineEl = lineRef.value;
const length = lineEl.getTotalLength ? lineEl.getTotalLength() : lineEl.getBoundingClientRect().width;

gsap.set(lineEl, { strokeDasharray: length, strokeDashoffset: length });
gsap.to(lineEl, {
  strokeDashoffset: 0,
  ease: 'none',
  scrollTrigger: {
    trigger: sectionRef.value,
    start: 'top 60%',
    end: 'bottom 50%',
    scrub: 1.5,
  },
});
```

Circle activation: Use ScrollTrigger `onUpdate` callback to check progress. At 0%, 50%, 100% progress thresholds, animate the corresponding circle:
```typescript
gsap.to(circleEl, { scale: 1.15, duration: 0.3, ease: 'back.out(2)' });
gsap.to(circleEl, { scale: 1, delay: 0.15, duration: 0.2 });
// Also toggle classes: remove bg-primary/10 text-primary, add bg-primary text-white
```

Circles start as `bg-primary/10 text-primary` (inactive) and transition to `bg-primary text-white shadow-lg shadow-primary/25` (activated).

### Mobile

Vertical stepper using a simple `<div>` for the vertical line (NOT SVG), matching the test-landing mobile approach:
```html
<div class="md:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-primary/20" />
```

On mobile:
- No GSAP scroll animation (line is static)
- Circles start in their activated state (`bg-primary text-white`)
- Content cards use `v-reveal` directive for entrance animation

### Testimonials

Testimonials remain a **separate section** below How It Works (not merged into steps). This is the current index page structure and it's better because:
- Each section has a clear purpose (How It Works = process explanation, Testimonials = social proof)
- The test-landing merging approach dilutes both sections
- With only 3 steps and 3 testimonials, it works cleanly as separate sections

---

## 5. Typography Fixes

| Element | Current | Fix |
|---|---|---|
| Hero h1 | `leading-[1.15]` | Add `tracking-tight` |
| Section headings (h2) | No tracking/leading | Add `tracking-tight leading-tight` |
| Hero subtitle | Default line-height | Add `leading-relaxed` |
| Trust badge labels | `text-sm text-muted` | Change to `text-xs font-medium uppercase tracking-wide` |

---

## 6. Content Rewrites

| Location | Current | New |
|---|---|---|
| Features heading | "Everything you need to land your next role" | "Six tools. Zero ghosting." |
| Features subheading | (keep as-is) | (keep as-is) |
| Hero CTA (primary) | "Get Started Free" | "Start Tracking" |
| Final CTA button | "Get Started — It's Free" | "Create Your Board" |
| Final CTA heading | (keep as-is) | (keep as-is) |
| Final CTA subheading | "Join thousands of job seekers who never lose track of an application." | "Take control of your job search. Never lose track of an application again." |
| Trust badge label | "Built with Vue" | "No Credit Card" |
| Trust badge icon | `i-lucide-code-2` | `i-lucide-credit-card` (pairs with "No Credit Card" label) |

---

## 7. Anti-AI-Slop Patterns

### Trust Badges

Replace flat icon+text with chip styling:
```html
<div class="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted">
  <UIcon :name="badge.icon" class="size-4" />
  <span>{{ badge.label }}</span>
</div>
```

### Testimonial Variation

Center testimonial card (index 1) gets subtle elevation:
- Add `md:scale-[1.02]` and `border-primary/10 dark:border-primary/15` tint
- Other cards use light glass (see Glass Variation Table in section 3)

### Glass Variation

See consolidated Glass Variation Table in section 3. The key principle: reserve `backdrop-blur-lg` for focal elements (hero mockup, hero feature cards, CTA). Standard/repeated cards use opaque backgrounds without blur.

---

## 8. BackgroundGradientAnimation Optimization

### Changes

1. Remove SVG `<defs><filter>` element and related `filterId` ref/computed
2. Change gradients-container inline style from `filter: url(#${filterId}) blur(40px)` to `filter: blur(40px)`
3. Add `will-change: transform` on `.gradient-blob` CSS class in `main.css`
4. Add `contain: paint` on `.gradients-container` CSS class in `main.css`
5. Keep all 5 blobs + interactive blob
6. Keep existing `prefers-reduced-motion` handling
7. Remove the `containerId`/`filterId` refs that were only used for the SVG filter

### Rationale

The SVG goo filter (feGaussianBlur + feColorMatrix) is imperceptible at 40px CSS blur. Removing it eliminates a GPU-intensive double-filter pass with zero visual loss.

---

## 9. Files Modified

| File | Action | Changes |
|---|---|---|
| `frontend/app/assets/css/main.css` | Modify | Add `.hero-bg` light mode + update `.dark .hero-bg`. Simplify orb keyframes (4 stops, no scale). Update `.scroll-reveal` timing to 0.6s expo-out. Add `@media (prefers-reduced-motion)` for scroll-reveal. Add `.gradient-blob { will-change: transform }` and `.gradients-container { contain: paint }`. Remove old `.dark .hero-bg { --arc-color }` rule. |
| `frontend/app/pages/index.vue` | Modify | Remove SVG arcs, convert grid glow px→%, fix hero padding, add bento grid + hero feature data, redesign How It Works to horizontal stepper with GSAP, replace useScrollReveal with v-reveal directives, content rewrites, typography classes, GSAP icon hover setup + cleanup. |
| `frontend/app/plugins/reveal-directive.ts` | **New** | Vue directive registered globally via Nuxt plugin. IntersectionObserver, modifier→transform mapping, reduced-motion check. |
| `frontend/app/composables/useScrollReveal.ts` | Modify | Add deprecation comment. NOT deleted — still used by 5 web/* pages out of scope. |
| `frontend/app/components/ui/BackgroundGradientAnimation.vue` | Modify | Remove SVG goo filter element, simplify filter to CSS-only blur(40px), remove filterId/containerId refs. |

---

## 10. Out of Scope

- Navbar (`components/web/Navbar.vue`) — not changing
- Footer (`components/web/Footer.vue`) — not changing
- Test-landing page (`pages/web/test-landing.vue` and `components/test-landing/*`) — separate page, not part of this fix. Remains as-is.
- Other web pages (faq, about, contact, privacy, terms) — not affected
- ButtonWithIcon component — keeping the slide animation as-is
- `app.config.ts` — no changes to Nuxt UI theme config

---

## 11. Dependencies

- **GSAP** (`gsap`): Must be installed as a project dependency. Check if already in `frontend/package.json`. If not, `npm install gsap`.
- No other new dependencies.
