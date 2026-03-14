# Landing Page Animations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cinematic hero entrance, Lenis smooth scroll, a flowing SVG line connecting How It Works → Features, and a horizontal-scroll feature carousel to the landing page.

**Architecture:** GSAP + ScrollTrigger handles all scroll-driven animations and the hero entrance timeline. Lenis wraps the page for buttery smooth scroll. Two separate SVGs (one per section) create a continuous flowing line with a traveling comet-tail effect. Features section uses ScrollTrigger pin+scrub for horizontal scroll on desktop, vertical stack on mobile.

**Tech Stack:** Nuxt 4, GSAP + ScrollTrigger (existing), Lenis ^1.1.0 (new), SVG, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-15-landing-page-animations-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/app/plugins/lenis.client.ts` | Create | Lenis smooth scroll plugin with GSAP sync |
| `frontend/app/assets/css/main.css` | Modify | Remove `scroll-behavior: smooth`, add orb paused states, scrollbar hiding, flowing line z-index, hero initial hidden state |
| `frontend/app/components/web/Navbar.vue` | Modify | Replace `scrollIntoView` with Lenis `scrollTo`, update nav link href from `#features` to `#how-it-works` |
| `frontend/app/pages/index.vue` | Modify | Reorder sections, hero GSAP timeline, How It Works vertical layout, Features horizontal scroll, flowing line SVGs, update `scrollToFeatures` |
| `frontend/package.json` / `yarn.lock` | Modify | Add `lenis@^1.1.0` via yarn |

---

## Chunk 1: Foundation (Lenis + CSS + Navigation)

### Task 1: Install Lenis dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install lenis via Docker**

Run from project root:
```bash
cd frontend && docker compose exec app yarn add lenis@^1.1.0
```

- [ ] **Step 2: Verify installation**

Run:
```bash
cd frontend && docker compose exec app yarn list --pattern lenis
```
Expected: Shows `lenis@1.1.x` in output.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/yarn.lock
git commit -m "chore: add lenis smooth scroll dependency"
```

---

### Task 2: Create Lenis plugin

**Files:**
- Create: `frontend/app/plugins/lenis.client.ts`

- [ ] **Step 1: Create the Lenis client plugin**

```ts
// frontend/app/plugins/lenis.client.ts
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default defineNuxtPlugin((nuxtApp) => {
  gsap.registerPlugin(ScrollTrigger)

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 2,
  })

  // Sync Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time: number) => lenis.raf(time * 1000))

  // Intentionally global — ensures Lenis-GSAP sync is smooth across all pages
  gsap.ticker.lagSmoothing(0)

  // Reset scroll position on route change
  nuxtApp.hook('page:finish', () => {
    lenis.scrollTo(0, { immediate: true })
  })

  return {
    provide: { lenis },
  }
})
```

- [ ] **Step 2: Verify the app still boots**

Run:
```bash
cd frontend && docker compose exec app yarn dev
```
Open `http://localhost:8080` (or whatever port the dev server uses). Page should load with smooth scrolling active. Verify scrolling feels different (smoother momentum).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/plugins/lenis.client.ts
git commit -m "feat: add Lenis smooth scroll plugin with GSAP sync"
```

---

### Task 3: CSS foundation changes

**Files:**
- Modify: `frontend/app/assets/css/main.css`

- [ ] **Step 1: Remove `scroll-behavior: smooth` from html**

In `frontend/app/assets/css/main.css`, replace lines 8-10:

```css
html {
  scroll-behavior: smooth;
}
```

with:

```css
/* scroll-behavior removed — Lenis handles smooth scrolling */
```

- [ ] **Step 2: Add orb animation paused initial state**

In `main.css`, replace lines 222-226:

```css
.orb-float-1 { animation: orb-drift-1 22s ease-in-out infinite; }
.orb-float-2 { animation: orb-drift-2 26s ease-in-out infinite; }
.orb-float-3 { animation: orb-drift-3 28s ease-in-out infinite; }
.orb-float-4 { animation: orb-drift-4 32s ease-in-out infinite; }
```

with:

```css
.orb-float-1 { animation: orb-drift-1 22s ease-in-out infinite; animation-play-state: paused; }
.orb-float-2 { animation: orb-drift-2 26s ease-in-out infinite; animation-play-state: paused; }
.orb-float-3 { animation: orb-drift-3 28s ease-in-out infinite; animation-play-state: paused; }
.orb-float-4 { animation: orb-drift-4 32s ease-in-out infinite; animation-play-state: paused; }

@media (prefers-reduced-motion: reduce) {
  .orb-float-1, .orb-float-2, .orb-float-3, .orb-float-4 {
    animation-play-state: running;
  }
}
```

- [ ] **Step 3: Add scrollbar hiding + flowing line + feature track styles**

Append to end of `main.css` (before the last `@media (prefers-reduced-motion)` block for gradient blobs):

```css
/* Features horizontal scroll — hidden scrollbar */
.features-track-wrapper {
  overflow: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.features-track-wrapper::-webkit-scrollbar {
  display: none;
}

/* Flowing line z-index layering */
.flowing-line-svg {
  position: absolute;
  pointer-events: none;
  z-index: 1;
}

.section-content {
  position: relative;
  z-index: 2;
}
```

- [ ] **Step 4: Verify page still renders correctly**

Reload the page. Floating orbs should be invisible initially (paused at frame 0 with opacity from their position). Scrolling should still feel smooth via Lenis.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/assets/css/main.css
git commit -m "feat: CSS foundation for animations — remove scroll-behavior, pause orbs, add track styles"
```

---

### Task 4: Update Navbar + index.vue scroll targets

**Files:**
- Modify: `frontend/app/components/web/Navbar.vue`
- Modify: `frontend/app/pages/index.vue` (only the scroll function + nav link, NOT template reorder yet)

- [ ] **Step 1: Update Navbar — replace scrollIntoView + change anchor href**

In `frontend/app/components/web/Navbar.vue`, replace lines 22-24:

```ts
  if (isHomePage.value) {
    links.push({ label: 'Features', href: '/#features', isAnchor: true });
  }
```

with:

```ts
  if (isHomePage.value) {
    links.push({ label: 'How It Works', href: '/#how-it-works', isAnchor: true });
  }
```

Then replace lines 33-42 (`onNavLinkClick` function):

```ts
function onNavLinkClick(link: { isAnchor: boolean; href?: string }) {
  if (link.isAnchor && link.href) {
    isMobileMenuOpen.value = false;
    const target = document.querySelector(link.href.replace('/', ''));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  } else {
    isMobileMenuOpen.value = false;
  }
}
```

with:

```ts
function onNavLinkClick(link: { isAnchor: boolean; href?: string }) {
  if (link.isAnchor && link.href) {
    isMobileMenuOpen.value = false;
    const selector = link.href.replace('/', '');
    useNuxtApp().$lenis.scrollTo(selector);
  } else {
    isMobileMenuOpen.value = false;
  }
}
```

- [ ] **Step 2: Update index.vue — replace scrollToFeatures**

In `frontend/app/pages/index.vue`, replace lines 13-17:

```ts
function scrollToFeatures() {
  if (import.meta.client) {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }
}
```

with:

```ts
function scrollToHowItWorks() {
  if (import.meta.client) {
    useNuxtApp().$lenis.scrollTo('#how-it-works');
  }
}
```

Then in the template, update the "Learn More" button (line 242) from:

```html
@click.prevent="scrollToFeatures"
```

to:

```html
@click.prevent="scrollToHowItWorks"
```

- [ ] **Step 3: Verify both clicks work**

Click "Learn More" button in hero — should smooth-scroll to How It Works section. Click "How It Works" in navbar — same behavior.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/components/web/Navbar.vue frontend/app/pages/index.vue
git commit -m "feat: replace scrollIntoView with Lenis scrollTo, retarget nav to how-it-works"
```

---

## Chunk 2: Hero Entrance Animation

### Task 5: Hero cinematic entrance with GSAP timeline

**Files:**
- Modify: `frontend/app/pages/index.vue` (script section only)

- [ ] **Step 1: Add hero entrance refs**

In `index.vue` `<script setup>`, add template refs for hero elements after the existing refs (line ~22):

```ts
const heroBgRef = useTemplateRef<HTMLElement>('heroBgRef');
const heroGridRef = useTemplateRef<HTMLElement>('heroGridRef');
const heroTextRef = useTemplateRef<HTMLElement>('heroTextRef');
const heroHeadingRef = useTemplateRef<HTMLElement>('heroHeadingRef');
const ghostProofRef = useTemplateRef<HTMLElement>('ghostProofRef');
const heroSubtitleRef = useTemplateRef<HTMLElement>('heroSubtitleRef');
const heroCtasRef = useTemplateRef<HTMLElement>('heroCtasRef');
const heroMockupRef = useTemplateRef<HTMLElement>('heroMockupRef');
const orbRefs = ref<HTMLElement[]>([]);
```

- [ ] **Step 2: Build the hero GSAP timeline in onMounted**

Inside the existing `onMounted` callback, after the GSAP imports and `registerPlugin` (line ~123), add the hero timeline. Place it BEFORE the feature card icon hover section:

```ts
  // === Hero entrance animation ===
  const heroTl = gsap.timeline();

  // Initial hidden state — all gsap.set() calls BEFORE timeline tweens
  const heroElements = [
    heroBgRef.value,
    heroGridRef.value,
    heroHeadingRef.value,
    heroSubtitleRef.value,
    heroCtasRef.value,
    heroMockupRef.value,
  ].filter(Boolean);
  gsap.set(heroElements, { opacity: 0, visibility: 'hidden' });
  gsap.set(orbRefs.value, { opacity: 0, visibility: 'hidden', scale: 0 });
  gsap.set(heroBgRef.value, { scale: 0.95 });
  gsap.set(heroHeadingRef.value, { y: 30 });
  gsap.set(heroSubtitleRef.value, { y: 20 });
  gsap.set(heroMockupRef.value, { x: 60 });
  if (ghostProofRef.value) {
    gsap.set(ghostProofRef.value, { backgroundPosition: '-100% 0' });
  }
  if (heroCtasRef.value) {
    gsap.set(heroCtasRef.value.children, { y: 20, opacity: 0 });
  }

  // 0ms: Background gradient bloom
  heroTl.to(heroBgRef.value, {
    opacity: 1,
    scale: 1,
    visibility: 'visible',
    duration: 0.8,
    ease: 'power2.out',
  }, 0);

  // 200ms: Hero grid pattern fade
  heroTl.to(heroGridRef.value, {
    opacity: 0.15,
    visibility: 'visible',
    duration: 0.6,
    ease: 'power2.out',
  }, 0.2);

  // 400ms: Heading slides up
  heroTl.to(heroHeadingRef.value, {
    y: 0,
    opacity: 1,
    visibility: 'visible',
    duration: 0.6,
    ease: 'power3.out',
  }, 0.4);

  // 400ms: "Ghost-Proof" gradient sweep
  if (ghostProofRef.value) {
    heroTl.to(ghostProofRef.value, {
      backgroundPosition: '0% 0',
      duration: 0.8,
      ease: 'power2.inOut',
    }, 0.4);
  }

  // 700ms: Subtitle fades in
  heroTl.to(heroSubtitleRef.value, {
    y: 0,
    opacity: 1,
    visibility: 'visible',
    duration: 0.5,
    ease: 'power3.out',
  }, 0.7);

  // 900ms: CTA buttons stagger
  if (heroCtasRef.value) {
    heroTl.set(heroCtasRef.value, { visibility: 'visible', opacity: 1 }, 0.9);
    heroTl.to(heroCtasRef.value.children, {
      y: 0,
      opacity: 1,
      duration: 0.4,
      ease: 'power3.out',
      stagger: 0.1,
    }, 0.9);
  }

  // 1200ms: Dashboard mockup sweeps from right
  heroTl.to(heroMockupRef.value, {
    x: 0,
    opacity: 1,
    visibility: 'visible',
    duration: 0.8,
    ease: 'back.out(1.2)',
  }, 1.2);

  // 1800ms: Floating orbs pop in
  heroTl.to(orbRefs.value, {
    scale: 1,
    opacity: 1,
    visibility: 'visible',
    duration: 0.4,
    ease: 'back.out(2)',
    stagger: 0.15,
    onComplete: () => {
      // Hand off to CSS drift animation
      orbRefs.value.forEach((orb) => {
        if (orb) orb.style.animationPlayState = 'running';
      });
    },
  }, 1.8);

  gsapTriggers.push(heroTl);
```

- [ ] **Step 3: Update the template — add refs, remove v-reveal from hero**

In the template section of `index.vue`:

**Hero section container** (line 189) — add ref:
```html
<section ref="heroBgRef" class="hero-bg relative overflow-hidden -mt-16 pt-36 sm:pt-44 lg:pt-52 pb-20 sm:pb-28 lg:pb-36">
```

**Hero grid** (line 191) — add ref:
```html
<div ref="heroGridRef" class="hero-grid pointer-events-none absolute inset-0" />
```

**Floating orbs** (lines 206-217) — add `:ref` binding to each orb. Replace each orb div's opening tag to include the ref. For example the first orb becomes:
```html
<div :ref="(el) => { if (el) orbRefs[0] = el as HTMLElement }" class="orb-float-1 pointer-events-none absolute right-[8%] top-[10%] ...">
```
Do the same for orbs 1-3 (indices 0-3).

**Hero text wrapper** (line 222) — remove `v-reveal.up`, add ref:
```html
<div id="hero-text" ref="heroTextRef" class="flex-1 text-center lg:text-left">
```

**Heading** (line 223) — add ref:
```html
<h1 ref="heroHeadingRef" class="text-4xl sm:text-5xl lg:text-6xl font-bold text-highlighted leading-[1.15] tracking-tight">
```

**"Ghost-Proof" span** (line 224) — add ref and gradient sweep classes:
```html
<span ref="ghostProofRef" class="text-primary ghost-proof-sweep">Ghost-Proof</span>
```

**Subtitle** (line 227) — add ref:
```html
<p ref="heroSubtitleRef" class="mt-6 text-lg sm:text-xl text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
```

**CTAs wrapper** (line 230) — add ref:
```html
<div ref="heroCtasRef" class="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
```

**Dashboard mockup** (line 248) — remove `v-reveal.right`, add ref:
```html
<div id="hero-mockup" ref="heroMockupRef" class="flex-1 w-full max-w-lg mx-auto lg:mx-0">
```

- [ ] **Step 4: Add Ghost-Proof gradient sweep CSS**

In the `<style scoped>` section of `index.vue`, add:

```css
.ghost-proof-sweep {
  /* Uses --ui-primary which already switches between light/dark mode via :root/.dark */
  background: linear-gradient(
    90deg,
    var(--ui-primary) 0%,
    var(--ui-primary) 50%,
    transparent 50%
  );
  background-size: 200% 100%;
  background-position: -100% 0;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

Note: `--ui-primary` is defined as `var(--ui-color-primary-600)` in light mode and `var(--ui-color-primary-400)` in dark mode (via `:root` and `.dark` in `main.css`), so this automatically adapts to both themes. No `.dark` ancestor selector needed inside scoped styles.

- [ ] **Step 5: Handle reduced motion fallback**

Add a reactive `prefersReducedMotion` ref at the top of the `<script setup>` (before `onMounted`):

```ts
const prefersReducedMotion = ref(false);
```

The existing `if (prefersReducedMotion) return;` on line 119 short-circuits the entire `onMounted`. Update it to handle the hero gracefully AND set the reactive ref:

Replace:
```ts
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;
```

with:
```ts
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  prefersReducedMotion.value = reducedMotion;
  if (reducedMotion) {
    // Make orbs visible and let CSS animations run
    orbRefs.value.forEach((orb) => {
      if (orb) orb.style.animationPlayState = 'running';
    });
    return;
  }
```

Then in the **Features template** (Task 8, Step 1), update the desktop/mobile visibility classes to account for reduced motion. Change:

```html
<div class="features-track-wrapper hidden lg:block section-content">
```
to:
```html
<div v-if="!prefersReducedMotion" class="features-track-wrapper hidden lg:block section-content">
```

And change:
```html
<div ref="featureGridRef" class="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
```
to:
```html
<div ref="featureGridRef" :class="prefersReducedMotion ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4'">
```

This ensures that when reduced motion is enabled, the horizontal track is completely removed and the vertical grid is always shown, regardless of viewport width.

- [ ] **Step 6: Verify hero entrance**

Reload the page. The hero should:
1. Background fades in with slight scale
2. Grid fades in
3. Heading slides up, "Ghost-Proof" does gradient sweep
4. Subtitle fades in
5. CTA buttons stagger in
6. Mockup sweeps from right
7. Orbs pop in, then start drifting

- [ ] **Step 7: Commit**

```bash
git add frontend/app/pages/index.vue
git commit -m "feat: cinematic hero entrance animation with GSAP timeline"
```

---

## Chunk 3: Section Reorder + How It Works Vertical Timeline

### Task 6: Reorder sections — move How It Works before Features

**Files:**
- Modify: `frontend/app/pages/index.vue` (template only)

- [ ] **Step 1: Move the How It Works section above Features**

In the template, cut the entire `<!-- HOW IT WORKS -->` section (lines 422-484) and paste it ABOVE the `<!-- FEATURES SECTION -->` (currently at line 345). The order inside `<UiBackgroundGradientAnimation>` should become:

1. Trust Badges
2. **How It Works** (moved up)
3. **Features** (moved down)
4. Testimonials
5. Chrome Extension
6. Final CTA

- [ ] **Step 2: Verify page renders with new order**

Reload. How It Works should appear after Trust Badges, before Features. All content should still be visible.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/pages/index.vue
git commit -m "feat: reorder sections — How It Works before Features"
```

---

### Task 7: How It Works — convert to vertical timeline layout

**Files:**
- Modify: `frontend/app/pages/index.vue` (How It Works template section + script)

- [ ] **Step 1: Replace the How It Works template with vertical timeline**

Replace the entire How It Works section template (the `<section ref="howItWorksRef" ...>` and everything inside) with:

```html
      <!-- ==================== HOW IT WORKS ==================== -->
      <section id="how-it-works" ref="howItWorksRef" class="py-16 sm:py-24">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <h2 v-reveal.up class="text-3xl sm:text-4xl font-bold text-highlighted tracking-tight leading-tight mb-4">How it works</h2>
            <p v-reveal.up="{ delay: 1 }" class="text-lg text-muted max-w-2xl mx-auto">
              Get started in minutes. No complicated setup required.
            </p>
          </div>

          <!-- Vertical timeline layout -->
          <div class="relative mx-auto max-w-2xl">
            <!-- Static dashed line (mobile) / will be replaced by SVG on desktop -->
            <div class="lg:hidden absolute left-6 top-0 bottom-0 w-px border-l-2 border-dashed border-primary/20" />

            <div class="flex flex-col gap-10">
              <div
                v-for="(step, i) in steps"
                :key="step.number"
                v-reveal.up="{ delay: i }"
                class="relative flex items-start gap-6"
              >
                <!-- Numbered circle -->
                <div
                  :ref="(el) => { if (el) stepCircleRefs[i] = el as HTMLElement }"
                  class="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full font-bold text-lg transition-all duration-300"
                  :class="activatedCircles.has(i)
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'lg:bg-primary/10 lg:text-primary bg-primary text-white shadow-lg shadow-primary/25'"
                >
                  {{ step.number }}
                </div>

                <!-- Content card -->
                <div class="flex-1 rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg p-6 shadow-sm shadow-black/5">
                  <div class="flex items-center gap-2 mb-3">
                    <UIcon :name="step.icon" class="size-5 text-primary" />
                    <h3 class="text-lg font-semibold text-highlighted">{{ step.title }}</h3>
                  </div>
                  <p class="text-sm text-muted leading-relaxed">{{ step.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Remove old How It Works GSAP line-draw code from script**

In the `onMounted` callback, remove the entire `// === How It Works line draw (desktop only) ===` block (lines ~141-176). This will be replaced by the flowing line in Task 8.

Also remove the `stepLineRef` template ref declaration since we no longer use it:
```ts
// Remove this line:
const stepLineRef = useTemplateRef<SVGLineElement>('stepLineRef');
```

- [ ] **Step 3: Verify vertical timeline renders**

Reload. How It Works should show:
- Steps stacked vertically
- Numbered circles on the left
- Glass cards on the right
- Dashed line on mobile
- No connecting line on desktop yet (that comes in Task 8)

- [ ] **Step 4: Commit**

```bash
git add frontend/app/pages/index.vue
git commit -m "feat: How It Works vertical timeline layout"
```

---

## Chunk 4: Features Horizontal Scroll

### Task 8: Features section — horizontal scroll carousel (desktop) + vertical stack (mobile)

**Files:**
- Modify: `frontend/app/pages/index.vue` (Features template + script)

- [ ] **Step 1: Replace the Features section template**

Replace the entire Features `<section id="features" ...>` block with:

```html
      <!-- ==================== FEATURES SECTION ==================== -->
      <section id="features" ref="featuresSectionRef" class="features-section py-16 sm:py-24">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="features-header text-center mb-14 section-content">
            <h2 v-reveal.up class="text-3xl sm:text-4xl font-bold text-highlighted tracking-tight leading-tight mb-4">
              Six tools. Zero ghosting.
            </h2>
            <p v-reveal.up="{ delay: 1 }" class="text-lg text-muted max-w-2xl mx-auto">
              From tracking applications to generating cover letters, JobVault has you covered.
            </p>
          </div>

          <!-- Desktop: horizontal scroll track -->
          <div class="features-track-wrapper hidden lg:block section-content">
            <div ref="featuresTrackRef" class="features-track flex gap-6">
              <div
                v-for="feature in features"
                :key="feature.title"
                class="feature-card group shrink-0 w-80 rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-white/20 dark:border-gray-700/30 p-6 shadow-sm shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/8"
              >
                <div class="feature-icon flex size-12 items-center justify-center rounded-xl bg-primary/10 mb-4 will-change-transform">
                  <UIcon :name="feature.icon" class="size-6 text-primary" />
                </div>
                <h3 class="text-lg font-semibold text-highlighted mb-2">{{ feature.title }}</h3>
                <p class="text-sm text-muted leading-relaxed">{{ feature.description }}</p>
              </div>
            </div>
          </div>

          <!-- Mobile: vertical stack (same as before but simplified) -->
          <div ref="featureGridRef" class="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              v-for="(feature, i) in features"
              :key="feature.title"
              v-reveal.up="{ delay: i }"
              class="bento-card group rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/20 dark:border-gray-700/30 p-6 shadow-sm shadow-black/5 transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/8"
            >
              <div class="feature-icon flex size-12 items-center justify-center rounded-xl bg-primary/10 mb-4 will-change-transform">
                <UIcon :name="feature.icon" class="size-6 text-primary" />
              </div>
              <h3 class="text-lg font-semibold text-highlighted mb-2">{{ feature.title }}</h3>
              <p class="text-sm text-muted leading-relaxed">{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Add features template refs in script**

Add after existing refs:

```ts
const featuresSectionRef = useTemplateRef<HTMLElement>('featuresSectionRef');
const featuresTrackRef = useTemplateRef<HTMLElement>('featuresTrackRef');
```

- [ ] **Step 3: Add horizontal scroll ScrollTrigger in onMounted**

Inside `onMounted`, after the hero timeline code, add:

```ts
  // === Features horizontal scroll (desktop only) ===
  ScrollTrigger.matchMedia({
    '(min-width: 1024px)': () => {
      if (!featuresTrackRef.value || !featuresSectionRef.value) return;

      const track = featuresTrackRef.value;
      const section = featuresSectionRef.value;

      // Calculate total scroll distance
      const totalWidth = track.scrollWidth;
      const viewportWidth = section.offsetWidth;
      const scrollDistance = totalWidth - viewportWidth + 100; // 100px padding

      const featuresTween = gsap.to(track, {
        x: -scrollDistance,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${scrollDistance * 1.5}px`,
          pin: true,
          scrub: 1.5,
          invalidateOnRefresh: true,
        },
      });

      gsapTriggers.push(featuresTween);
      gsapTriggers.push(ScrollTrigger.getAll().at(-1));

      return () => {
        featuresTween.kill();
      };
    },
  });
```

- [ ] **Step 4: Update feature card icon hover to work with both desktop and mobile grids**

The existing icon hover code targets `.bento-card` elements. Update the selector to also work with `.feature-card`:

Replace:
```ts
    const cards = featureGridRef.value.querySelectorAll('.bento-card');
```

with:
```ts
    const allCards = [
      ...(featureGridRef.value?.querySelectorAll('.bento-card') || []),
      ...(featuresTrackRef.value?.querySelectorAll('.feature-card') || []),
    ];
```

And update the `if (featureGridRef.value)` guard to:
```ts
  if (featureGridRef.value || featuresTrackRef.value) {
```

Then change `cards.forEach` to `allCards.forEach`.

- [ ] **Step 5: Remove old bento grid scoped styles if no longer used**

In `<style scoped>`, the `.bento-grid` and `.bento-hero` styles are still used by the mobile grid. Keep them but they can be simplified since the mobile grid no longer has hero cards. Leave as-is for now — they still work.

- [ ] **Step 6: Verify horizontal scroll on desktop**

On desktop (>=1024px):
- Scroll down to Features section
- The section should pin to the viewport
- Continued scrolling moves feature cards horizontally
- Once all 6 cards have passed, section unpins and normal scroll resumes

On mobile (<1024px):
- Features should stack vertically in a grid
- Normal scroll behavior

- [ ] **Step 7: Commit**

```bash
git add frontend/app/pages/index.vue
git commit -m "feat: features horizontal scroll carousel with pin+scrub on desktop"
```

---

## Chunk 5: Flowing Line SVGs

### Task 9: Flowing line SVG 1 — How It Works vertical line

**Files:**
- Modify: `frontend/app/pages/index.vue`

- [ ] **Step 1: Add SVG to How It Works section template**

Inside the How It Works section, add the SVG right after the opening `<div class="relative mx-auto max-w-2xl">` and before the mobile dashed line div:

```html
            <!-- Flowing line SVG (desktop) -->
            <svg
              ref="flowLineSvg1Ref"
              class="flowing-line-svg hidden lg:block inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="glowFilter1">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="cometGrad1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="var(--ui-primary)" stop-opacity="0" />
                  <stop offset="40%" stop-color="var(--ui-primary)" stop-opacity="0.8" />
                  <stop offset="60%" stop-color="var(--ui-primary)" stop-opacity="0.8" />
                  <stop offset="100%" stop-color="var(--ui-primary)" stop-opacity="0" />
                </linearGradient>
              </defs>
              <!-- Base track -->
              <path ref="flowPath1BaseRef" stroke="var(--ui-primary)" stroke-width="2" fill="none" opacity="0.15" />
              <!-- Glow layer -->
              <path ref="flowPath1GlowRef" stroke="var(--ui-primary)" stroke-width="6" fill="none" opacity="0.08" filter="url(#glowFilter1)" />
              <!-- Traveling segment -->
              <path ref="flowPath1TravelRef" stroke="url(#cometGrad1)" stroke-width="2.5" fill="none" />
            </svg>
```

- [ ] **Step 2: Add SVG refs**

```ts
const flowLineSvg1Ref = useTemplateRef<SVGSVGElement>('flowLineSvg1Ref');
const flowPath1BaseRef = useTemplateRef<SVGPathElement>('flowPath1BaseRef');
const flowPath1GlowRef = useTemplateRef<SVGPathElement>('flowPath1GlowRef');
const flowPath1TravelRef = useTemplateRef<SVGPathElement>('flowPath1TravelRef');
```

- [ ] **Step 3: Add path calculation + animation in onMounted**

Add after the features horizontal scroll code in `onMounted`:

```ts
  // === Flowing line SVG 1 (How It Works — vertical) ===
  if (
    flowLineSvg1Ref.value &&
    flowPath1BaseRef.value &&
    flowPath1GlowRef.value &&
    flowPath1TravelRef.value &&
    howItWorksRef.value &&
    window.innerWidth >= 1024
  ) {
    await nextTick();
    requestAnimationFrame(() => {
      const svg = flowLineSvg1Ref.value!;
      const section = howItWorksRef.value!;
      const sectionRect = section.getBoundingClientRect();
      const circles = stepCircleRefs.value;

      if (circles.length < 3) return;

      // Calculate path through step circles
      const circlePositions = circles.map((circle) => {
        const rect = circle.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 - sectionRect.left,
          y: rect.top + rect.height / 2 - sectionRect.top,
        };
      });

      const centerX = circlePositions[0].x;
      const topY = circlePositions[0].y - 40;
      const bottomY = circlePositions[2].y + 60;

      // Path: straight vertical through circles, then curve to bottom-right
      const pathD = [
        `M ${centerX} ${topY}`,
        `L ${centerX} ${circlePositions[0].y}`,
        `L ${centerX} ${circlePositions[1].y}`,
        `L ${centerX} ${circlePositions[2].y}`,
        `C ${centerX} ${bottomY}, ${centerX + 100} ${bottomY}, ${sectionRect.width - 40} ${bottomY}`,
      ].join(' ');

      // Set SVG viewBox to match section size
      svg.setAttribute('viewBox', `0 0 ${sectionRect.width} ${bottomY + 20}`);
      svg.style.height = `${bottomY + 20}px`;

      // Apply path to all three layers
      [flowPath1BaseRef.value!, flowPath1GlowRef.value!, flowPath1TravelRef.value!].forEach((p) => {
        p.setAttribute('d', pathD);
      });

      // Setup traveling segment animation
      const pathLength = flowPath1TravelRef.value!.getTotalLength();
      const segmentLength = pathLength * 0.15;

      gsap.set(flowPath1TravelRef.value!, {
        strokeDasharray: `${segmentLength} ${pathLength - segmentLength}`,
        strokeDashoffset: pathLength,
      });

      const lineTween1 = gsap.to(flowPath1TravelRef.value!, {
        strokeDashoffset: -segmentLength,
        ease: 'none',
        scrollTrigger: {
          trigger: howItWorksRef.value,
          start: 'top 60%',
          end: 'bottom 30%',
          scrub: 1.5,
          onUpdate: (self: any) => {
            const progress = self.progress;
            stepCircleRefs.value.forEach((circle, i) => {
              if (!circle) return;
              const threshold = (i + 1) / (stepCircleRefs.value.length + 1);
              if (progress >= threshold && !activatedCircles.has(i)) {
                activatedCircles.add(i);
                gsap.fromTo(circle,
                  { scale: 1 },
                  { scale: 1.15, duration: 0.2, ease: 'back.out(2)', yoyo: true, repeat: 1 },
                );
              }
            });
          },
        },
      });

      gsapTriggers.push(lineTween1);
      gsapTriggers.push(ScrollTrigger.getAll().at(-1));
    });
  }
```

- [ ] **Step 4: Verify the vertical flowing line**

On desktop (>=1024px):
- A faint purple line should appear running vertically through the step circles
- As you scroll, a bright segment (comet tail) travels down the line
- Step circles pulse as the segment passes them
- Line curves to the right at the bottom

- [ ] **Step 5: Commit**

```bash
git add frontend/app/pages/index.vue
git commit -m "feat: flowing line SVG 1 — vertical line through How It Works with comet trail"
```

---

### Task 10: Flowing line SVG 2 — Features horizontal line + unified scroll coordination

**Files:**
- Modify: `frontend/app/pages/index.vue`

- [ ] **Step 1: Add SVG inside the features track wrapper**

Inside the Features section, add the SVG inside `.features-track-wrapper` just before the `.features-track` div. Use a `<path>` element (not `<line>`) so `strokeDashoffset` works correctly for the comet trail:

```html
            <!-- Flowing line SVG 2 (horizontal, inside pinned container) -->
            <svg
              ref="flowLineSvg2Ref"
              class="flowing-line-svg inset-0 w-full"
              style="height: 20px; top: 50%; transform: translateY(-50%);"
              xmlns="http://www.w3.org/2000/svg"
            >
              <!-- Base track -->
              <path ref="flowPath2BaseRef" stroke="var(--ui-primary)" stroke-width="2" fill="none" opacity="0.15" />
              <!-- Glow -->
              <path ref="flowPath2GlowRef" stroke="var(--ui-primary)" stroke-width="6" fill="none" opacity="0.08" filter="url(#glowFilter1)" />
              <!-- Traveling segment (uses same gradient defs from SVG 1) -->
              <path ref="flowPath2TravelRef" stroke="var(--ui-primary)" stroke-width="2.5" fill="none" opacity="0.8" />
              <!-- Node dots between cards -->
              <circle v-for="n in 5" :key="n" :cx="`${n * 16.67}%`" cy="10" r="3" fill="var(--ui-primary)" opacity="0.2" />
            </svg>
```

- [ ] **Step 2: Add SVG 2 refs**

```ts
const flowLineSvg2Ref = useTemplateRef<SVGSVGElement>('flowLineSvg2Ref');
const flowPath2BaseRef = useTemplateRef<SVGPathElement>('flowPath2BaseRef');
const flowPath2GlowRef = useTemplateRef<SVGPathElement>('flowPath2GlowRef');
const flowPath2TravelRef = useTemplateRef<SVGPathElement>('flowPath2TravelRef');
```

- [ ] **Step 3: Set SVG 2 path and animate with unified scroll coordination**

Inside the `ScrollTrigger.matchMedia` for desktop, AFTER the features tween is created, set up SVG 2's path and unify the scroll coordination between both SVGs.

First, set the horizontal path dynamically based on track width:

```ts
      // Setup SVG 2 horizontal path
      if (flowPath2BaseRef.value && flowPath2GlowRef.value && flowPath2TravelRef.value && flowLineSvg2Ref.value) {
        const trackWidth = track.scrollWidth;
        const pathD = `M 0 10 L ${trackWidth} 10`;
        const svg2 = flowLineSvg2Ref.value;
        svg2.setAttribute('viewBox', `0 0 ${trackWidth} 20`);
        svg2.style.width = `${trackWidth}px`;

        [flowPath2BaseRef.value, flowPath2GlowRef.value, flowPath2TravelRef.value].forEach((p) => {
          p.setAttribute('d', pathD);
        });

        // Setup traveling segment
        const path2Length = flowPath2TravelRef.value.getTotalLength();
        const seg2Length = path2Length * 0.15;
        gsap.set(flowPath2TravelRef.value, {
          strokeDasharray: `${seg2Length} ${path2Length - seg2Length}`,
          strokeDashoffset: path2Length,
        });
      }
```

Then, create a **unified ScrollTrigger** that coordinates both SVGs. This replaces the separate SVG 1 ScrollTrigger from Task 9. Remove the SVG 1 ScrollTrigger from Task 9's `onMounted` code and instead add this unified trigger:

```ts
      // === Unified scroll coordination for both SVGs ===
      // Single trigger spans from How It Works top to Features bottom
      if (howItWorksRef.value && flowPath1TravelRef.value && flowPath2TravelRef.value) {
        const path1Length = flowPath1TravelRef.value.getTotalLength();
        const seg1Length = path1Length * 0.15;
        const path2Length = flowPath2TravelRef.value.getTotalLength();
        const seg2Length = path2Length * 0.15;

        // Ensure SVG 1 is set up for unified control
        gsap.set(flowPath1TravelRef.value, {
          strokeDasharray: `${seg1Length} ${path1Length - seg1Length}`,
          strokeDashoffset: path1Length,
        });

        ScrollTrigger.create({
          trigger: howItWorksRef.value,
          start: 'top 60%',
          endTrigger: section, // Features section (pinned)
          end: 'bottom bottom',
          scrub: 1.5,
          onUpdate: (self) => {
            const progress = self.progress;

            if (progress <= 0.4) {
              // Progress 0-0.4: animate SVG 1 (vertical)
              const svg1Progress = progress / 0.4; // normalize to 0-1
              const offset1 = path1Length - (svg1Progress * (path1Length + seg1Length));
              gsap.set(flowPath1TravelRef.value!, {
                strokeDashoffset: offset1,
              });
              // Reset SVG 2 to start
              gsap.set(flowPath2TravelRef.value!, {
                strokeDashoffset: path2Length,
              });

              // Step circle pulses
              stepCircleRefs.value.forEach((circle, i) => {
                if (!circle) return;
                const threshold = (i + 1) / (stepCircleRefs.value.length + 1);
                if (svg1Progress >= threshold && !activatedCircles.has(i)) {
                  activatedCircles.add(i);
                  gsap.fromTo(circle,
                    { scale: 1 },
                    { scale: 1.15, duration: 0.2, ease: 'back.out(2)', yoyo: true, repeat: 1 },
                  );
                }
              });
            } else {
              // Progress 0.4-1.0: animate SVG 2 (horizontal)
              const svg2Progress = (progress - 0.4) / 0.6; // normalize to 0-1
              const offset2 = path2Length - (svg2Progress * (path2Length + seg2Length));
              gsap.set(flowPath2TravelRef.value!, {
                strokeDashoffset: offset2,
              });
              // SVG 1 segment should be fully past the end (invisible)
              gsap.set(flowPath1TravelRef.value!, {
                strokeDashoffset: -seg1Length,
              });
            }
          },
        });

        gsapTriggers.push(ScrollTrigger.getAll().at(-1));
      }
```

- [ ] **Step 4: Update Task 9 — remove standalone SVG 1 ScrollTrigger**

The SVG 1 animation code from Task 9 Step 3 should ONLY handle path calculation and element setup. The `ScrollTrigger` and `onUpdate` for SVG 1 should be REMOVED from Task 9 (since it's now handled by the unified trigger above). Keep only the path `d` attribute calculation and the SVG viewBox setup from Task 9.

Specifically, remove everything from `// Setup traveling segment animation` onwards in Task 9 Step 3, keeping only the path calculation and path attribute setting.

- [ ] **Step 5: Verify unified flowing line**

On desktop:
1. Scroll down into How It Works — comet tail travels DOWN through the vertical line
2. Step circles pulse as the light passes
3. As you continue scrolling, the light reaches the curve at the bottom of SVG 1
4. **Seamlessly**, the comet tail appears at the LEFT of SVG 2 (Features horizontal line)
5. As Features cards scroll horizontally, the comet tail travels RIGHT along the horizontal line
6. Node dots between cards are visible

The transition should feel like ONE continuous traveling light, not two independent animations.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/pages/index.vue
git commit -m "feat: flowing line SVG 2 + unified scroll coordination for seamless comet trail"
```

---

### Task 11: Final polish + cleanup

**Files:**
- Modify: `frontend/app/pages/index.vue`

- [ ] **Step 1: Remove the `hero` property from features data**

Since the features section no longer uses hero-sized cards with mini-illustrations, remove the `hero` property from the features array. Remove these lines:

```ts
    hero: true,
```

from the Kanban Pipeline and Ghost Meter objects (lines 31, 37).

- [ ] **Step 2: Clean up unused hero card template code**

The old bento grid had hero card mini-illustrations (kanban columns + ghost meter bars). The mobile grid no longer uses `bento-hero` class or hero illustrations. Remove the `feature.hero` references from the mobile grid template and the mini-illustration `<div v-if="feature.hero ...">` blocks — they were only in the old bento grid which is now replaced.

If the mobile grid still references `feature.hero` for styling, change it to use the same card style for all features.

- [ ] **Step 3: Remove unused bento-grid scoped styles**

Remove from `<style scoped>`:
```css
.bento-grid { ... }
@media (min-width: 640px) { .bento-grid { ... } .bento-hero { ... } }
@media (min-width: 1024px) { .bento-grid { ... } .bento-hero { ... } }
```

These are no longer needed since the desktop uses horizontal track and mobile uses a simple grid.

- [ ] **Step 4: Add resize handler for SVG 1 path recalculation**

Add a debounced resize handler to recalculate SVG 1 coordinates:

```ts
let resizeTimer: ReturnType<typeof setTimeout>;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    ScrollTrigger.refresh();
  }, 200);
}

onMounted(async () => {
  // ... existing code ...
  window.addEventListener('resize', onResize, { signal: abortController.signal });
});
```

`ScrollTrigger.refresh()` recalculates all trigger positions. For SVG 1's path, wrap the path calculation in a function and call it on resize too, or rely on `invalidateOnRefresh: true` on the ScrollTrigger.

- [ ] **Step 5: Full visual QA**

Test the complete flow:
1. Page loads → hero entrance animation plays
2. Scroll down → trust badges appear
3. Continue → How It Works section, vertical timeline with flowing line
4. Comet tail travels down the vertical line, circles pulse
5. Continue → Features section pins, cards scroll horizontally
6. Horizontal comet tail synced with card movement
7. All 6 cards pass → section unpins
8. Testimonials, Chrome Extension, CTA follow normally
9. Dark mode toggle → all animations work in both themes
10. Mobile (<1024px) → no horizontal scroll, vertical stacks, no desktop-only SVGs
11. Reduce motion → everything static, no transforms

- [ ] **Step 6: Commit**

```bash
git add frontend/app/pages/index.vue frontend/app/assets/css/main.css
git commit -m "feat: final polish — cleanup old bento styles, add resize handler"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install Lenis | package.json, yarn.lock |
| 2 | Create Lenis plugin | plugins/lenis.client.ts |
| 3 | CSS foundation | main.css |
| 4 | Update nav scroll targets | Navbar.vue, index.vue |
| 5 | Hero entrance animation | index.vue |
| 6 | Reorder sections | index.vue |
| 7 | How It Works vertical timeline | index.vue |
| 8 | Features horizontal scroll | index.vue |
| 9 | Flowing line SVG 1 (vertical) | index.vue |
| 10 | Flowing line SVG 2 (horizontal) | index.vue |
| 11 | Final polish + cleanup | index.vue, main.css |

**Total commits:** 11
