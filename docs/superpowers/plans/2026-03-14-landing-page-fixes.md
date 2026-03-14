# Landing Page Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix animations, layout inconsistencies, GPU performance, and AI-slop patterns on the index landing page.

**Architecture:** Two-tier animation system (CSS v-reveal directive for entrances + GSAP for 3 complex effects). Bento grid feature cards, redesigned horizontal stepper How It Works, BackgroundGradientAnimation optimization, typography/content polish.

**Tech Stack:** Nuxt 4, Nuxt UI v4, Tailwind CSS, GSAP (already installed), Vue 3 custom directives

**Spec:** `docs/superpowers/specs/2026-03-14-landing-page-fixes-design.md`

---

## Chunk 1: Foundation — CSS Updates & v-reveal Directive

### Task 1: Update main.css — Hero Background, Orbs, Scroll Reveal Timing, GPU Hints

**Files:**
- Modify: `frontend/app/assets/css/main.css`

- [ ] **Step 1: Add light-mode `.hero-bg` rule**

Add this rule BEFORE the existing `.dark .hero-bg` rule (around line 106 in main.css, after the hero-grid dark rule):

```css
/* Hero background — light mode */
.hero-bg {
  background-color: #f8f6fc;
  background-image:
    radial-gradient(ellipse at 70% 20%, rgba(91,43,238,0.07) 0%, transparent 55%),
    radial-gradient(ellipse at 20% 80%, rgba(138,107,253,0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 70%, rgba(91,43,238,0.04) 0%, transparent 45%),
    radial-gradient(circle at 85% 10%, transparent 33%, rgba(91,43,238,0.06) 34%, rgba(91,43,238,0.06) 35%, transparent 36%),
    radial-gradient(circle at 10% 90%, transparent 38%, rgba(91,43,238,0.05) 39%, rgba(91,43,238,0.05) 40%, transparent 41%);
}
```

- [ ] **Step 2: Replace `.dark .hero-bg` rule**

Replace the existing `.dark .hero-bg { --arc-color: ... }` rule (line ~154) with:

```css
/* Hero background — dark mode */
.dark .hero-bg {
  background-color: #151022;
  background-image:
    radial-gradient(ellipse at 70% 20%, rgba(138,107,253,0.12) 0%, transparent 55%),
    radial-gradient(ellipse at 20% 80%, rgba(91,43,238,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 70%, rgba(138,107,253,0.06) 0%, transparent 45%),
    radial-gradient(circle at 85% 10%, transparent 33%, rgba(138,107,253,0.08) 34%, rgba(138,107,253,0.08) 35%, transparent 36%),
    radial-gradient(circle at 10% 90%, transparent 38%, rgba(138,107,253,0.06) 39%, rgba(138,107,253,0.06) 40%, transparent 41%);
}
```

- [ ] **Step 3: Simplify orb keyframes**

Replace the 4 existing `@keyframes orb-drift-*` blocks (lines ~222-276) and `.orb-float-*` rules (lines ~209-220) with:

```css
/* Floating orb animations — smooth organic drift */
.orb-float-1 { animation: orb-drift-1 22s ease-in-out infinite; }
.orb-float-2 { animation: orb-drift-2 26s ease-in-out infinite; }
.orb-float-3 { animation: orb-drift-3 28s ease-in-out infinite; }
.orb-float-4 { animation: orb-drift-4 32s ease-in-out infinite; }

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
```

- [ ] **Step 4: Update scroll-reveal timing**

Replace the existing `.scroll-reveal` block (lines ~278-290) with:

Note: Keep `var(--reveal-duration, 0.6s)` to maintain backward compatibility with the legacy `useScrollReveal.ts` composable (used by 5 web/* pages that set `--reveal-duration` per-element). The default changes from 0.8s to 0.6s.

```css
/* Scroll reveal animations (v-reveal directive + legacy composable) */
.scroll-reveal {
  opacity: 0;
  transform: var(--reveal-transform, translateY(30px));
  transition:
    opacity var(--reveal-duration, 0.6s) cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0s),
    transform var(--reveal-duration, 0.6s) cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0s);
}

.scroll-reveal.revealed {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 5: Add GPU optimization hints for BackgroundGradientAnimation**

Add these rules after the `.gradient-blob` rule block (around line ~348):

```css
.gradients-container {
  contain: paint;
}

.gradient-blob {
  will-change: transform;
}
```

Note: `.gradient-blob` already has styles. Add `will-change: transform` to the EXISTING `.gradient-blob` rule rather than creating a duplicate. Similarly, `.gradients-container` already has styles — add `contain: paint` to the existing rule.

- [ ] **Step 6: Verify CSS changes compile**

Run: `cd D:/Projects/job-tracker/frontend && npx nuxi typecheck 2>&1 | head -20` (or just `npm run dev` and check for errors)

---

### Task 2: Create the v-reveal Directive Plugin

**Files:**
- Create: `frontend/app/plugins/reveal-directive.ts`

- [ ] **Step 1: Create the plugin file**

```typescript
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );

  const TRANSFORM_MAP: Record<string, string> = {
    up: 'translateY(30px)',
    down: 'translateY(-30px)',
    left: 'translateX(30px)',
    right: 'translateX(-30px)',
    scale: 'scale(0.95)',
  };

  const DELAY_UNIT = 0.08; // seconds per delay index

  nuxtApp.vueApp.directive('reveal', {
    mounted(el: HTMLElement, binding) {
      const modifiers = binding.modifiers || {};
      const value = (binding.value as { delay?: number } | undefined) || {};

      // Determine transform from modifier
      const direction = Object.keys(modifiers).find((k) => k in TRANSFORM_MAP) || 'up';
      const transform = TRANSFORM_MAP[direction];

      // Apply initial styles
      el.classList.add('scroll-reveal');
      el.style.setProperty('--reveal-transform', transform);

      if (value.delay) {
        el.style.setProperty('--reveal-delay', `${value.delay * DELAY_UNIT}s`);
      }

      // If reduced motion, reveal immediately
      if (prefersReducedMotion) {
        el.classList.add('revealed');
        return;
      }

      observer.observe(el);
    },

    unmounted(el: HTMLElement) {
      observer.unobserve(el);
    },
  });
});
```

- [ ] **Step 2: Verify the plugin auto-loads**

Nuxt auto-imports plugins from the `plugins/` directory. Run: `cd D:/Projects/job-tracker/frontend && npm run dev` and check the console for errors.

---

### Task 3: Deprecate useScrollReveal Composable

**Files:**
- Modify: `frontend/app/composables/useScrollReveal.ts` (line 1)

- [ ] **Step 1: Add deprecation comment**

Add at the very top of the file (before the interface):

```typescript
// @deprecated — use v-reveal directive instead. Kept for web/* pages until they migrate.
```

---

### Task 4: Optimize BackgroundGradientAnimation Component

**Files:**
- Modify: `frontend/app/components/ui/BackgroundGradientAnimation.vue`

- [ ] **Step 1: Remove SVG goo filter and related refs**

In the `<script setup>` section, remove:
- `const containerId = useId();`
- `const filterId = \`blur-${containerId}\`;`

- [ ] **Step 2: Remove SVG element from template**

Remove the entire SVG block:
```html
<!-- SVG goo filter for blob merging -->
<svg xmlns="http://www.w3.org/2000/svg" class="hidden">
  <defs>
    <filter :id="filterId">
      ...
    </filter>
  </defs>
</svg>
```

- [ ] **Step 3: Simplify gradients-container filter**

Change the inline style on the gradients-container div from:
```html
:style="{ filter: `url(#${filterId}) blur(40px)` }"
```
to:
```html
style="filter: blur(40px)"
```

- [ ] **Step 4: Verify the component renders correctly**

Run dev server, navigate to the landing page, verify the gradient background still looks the same. Check both light and dark modes.

---

## Chunk 2: Hero Section Template Fixes

### Task 5: Fix Hero Section in index.vue — Layout, SVG Arcs, Grid Glows, Orbs

**Files:**
- Modify: `frontend/app/pages/index.vue`

- [ ] **Step 1: Fix hero section padding (remove negative margin hack)**

Change the hero section opening tag (line ~136) from:
```html
<section class="hero-bg relative overflow-hidden -mt-16 pt-36 sm:pt-44 lg:pt-52 pb-20 sm:pb-28 lg:pb-36">
```
to:
```html
<section class="hero-bg relative overflow-hidden pt-24 sm:pt-32 lg:pt-40 pb-20 sm:pb-28 lg:pb-36">
```

- [ ] **Step 2: Remove SVG decorative arcs**

Delete the entire SVG element (lines ~153-160):
```html
<!-- Decorative arc lines -->
<svg class="pointer-events-none absolute inset-0 size-full" ...>
  <circle cx="85%" cy="-10%" ... />
  <circle cx="10%" cy="110%" ... />
  <circle cx="95%" cy="60%" ... />
</svg>
```

- [ ] **Step 3: Convert grid glow line positions to percentages**

Change the 6 grid glow divs (lines ~143-149) from hardcoded px to %:

```html
<!-- Horizontal glow lines -->
<div class="grid-glow-h absolute h-px w-32" style="top: 20%; animation-duration: 7s" />
<div class="grid-glow-h absolute h-px w-24" style="top: 50%; animation-duration: 9s; animation-delay: -3s" />
<div class="grid-glow-h absolute h-px w-28" style="top: 70%; animation-duration: 11s; animation-delay: -6s" />
<!-- Vertical glow lines -->
<div class="grid-glow-v absolute w-px h-24" style="left: 15%; animation-duration: 8s; animation-delay: -2s" />
<div class="grid-glow-v absolute w-px h-20" style="left: 40%; animation-duration: 10s; animation-delay: -5s" />
<div class="grid-glow-v absolute w-px h-28" style="left: 65%; animation-duration: 12s; animation-delay: -8s" />
```

- [ ] **Step 4: Add typography fixes to hero text**

Change hero h1 (line ~180) from:
```html
<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-highlighted leading-[1.15]">
```
to:
```html
<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-highlighted leading-[1.15] tracking-tight">
```

Change hero subtitle (line ~184) from:
```html
<p class="mt-6 text-lg sm:text-xl text-muted max-w-xl mx-auto lg:mx-0">
```
to:
```html
<p class="mt-6 text-lg sm:text-xl text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
```

- [ ] **Step 5: Update hero CTA label**

Change the `UiButtonWithIcon` (line ~188-191) label from `"Get Started Free"` to `"Start Tracking"`.

- [ ] **Step 6: Replace useScrollReveal with v-reveal directives on hero elements**

Remove from `<script setup>`:
```typescript
const { reveal, revealStagger } = useScrollReveal();
```

Remove the entire `onMounted` block (lines ~106-130) that calls `reveal()` and `revealStagger()`.

**Keep** the `scrollToFeatures()` function (lines ~15-18) — it is still used by the "Learn More" button.

Add `v-reveal` directives to hero template elements:
- On `#hero-text` div: add `v-reveal.up`
- On `#hero-mockup` div: add `v-reveal.right="{ delay: 2 }"`

- [ ] **Step 7: Add template refs needed by later tasks**

Add these refs to the `<script setup>` section (after existing refs, before `scrollToFeatures`):

```typescript
const featureGridRef = useTemplateRef<HTMLElement>('featureGridRef');
const howItWorksRef = useTemplateRef<HTMLElement>('howItWorksRef');
const stepLineRef = useTemplateRef<SVGLineElement>('stepLineRef');
const stepCircleRefs = ref<HTMLElement[]>([]);
const activatedCircles = reactive(new Set<number>());
```

These are used by Tasks 6, 7, and 9.

---

## Chunk 3: Features Section — Bento Grid

### Task 6: Rebuild Features Section with Bento Grid

**Files:**
- Modify: `frontend/app/pages/index.vue`

- [ ] **Step 1: Update features data array**

Add `hero: true` to the first two features and update heading content:

```typescript
const features = [
  {
    icon: 'i-lucide-columns-3',
    title: 'Kanban Pipeline',
    description: 'Drag-and-drop your applications through stages from Wishlist to Offer.',
    hero: true,
  },
  {
    icon: 'i-lucide-ghost',
    title: 'Ghost Meter',
    description: 'Know exactly which employers have gone silent with automatic ghost detection.',
    hero: true,
  },
  {
    icon: 'i-lucide-camera',
    title: 'Job Snapshot',
    description: 'Preserve job descriptions before they expire. Never lose a posting again.',
  },
  {
    icon: 'i-lucide-sparkles',
    title: 'AI Cover Letters',
    description: 'Generate tailored cover letters using your resume and the job description.',
  },
  {
    icon: 'i-lucide-git-branch',
    title: 'Timeline Tracking',
    description: 'Log every interaction — interviews, follow-ups, offers — in a visual timeline.',
  },
  {
    icon: 'i-lucide-bell-ring',
    title: 'Smart Reminders',
    description: 'Never miss a follow-up. Set reminders tied to specific applications.',
  },
];
```

- [ ] **Step 2: Update trust badges data**

Change the "Built with Vue" badge:
```typescript
const trustBadges = [
  { icon: 'i-lucide-credit-card', label: 'No Credit Card' },
  { icon: 'i-lucide-github', label: 'Open Source' },
  { icon: 'i-lucide-shield-check', label: 'GDPR Compliant' },
  { icon: 'i-lucide-heart', label: '100% Free' },
];
```

- [ ] **Step 3: Replace trust badges template with chip styling**

Replace the trust badges section template (lines ~291-304) with:

```html
<!-- ==================== TRUST BADGES ==================== -->
<section id="trust-badges" v-reveal.up class="py-8 border-y border-[var(--ui-color-primary-200)]/30 dark:border-white/10">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex flex-wrap justify-center gap-4 sm:gap-6">
      <div
        v-for="(badge, i) in trustBadges"
        :key="badge.label"
        v-reveal.up="{ delay: i }"
        class="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted"
      >
        <UIcon :name="badge.icon" class="size-4" />
        <span>{{ badge.label }}</span>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Replace features section heading**

**Important:** Preserve `id="features"` on the `<section>` tag — it is the scroll target for the "Learn More" button. Only replace the inner heading div:

```html
<div class="text-center mb-14">
  <h2 class="text-3xl sm:text-4xl font-bold text-highlighted tracking-tight leading-tight mb-4">
    Six tools. Zero ghosting.
  </h2>
  <p class="text-lg text-muted max-w-2xl mx-auto">
    From tracking applications to generating cover letters, JobVault has you covered.
  </p>
</div>
```

The section tag should remain: `<section id="features" class="py-16 sm:py-24">`

- [ ] **Step 5: Replace features grid with bento grid template**

Replace the features grid (lines ~318-330) with the bento grid. This includes the GSAP icon hover setup:

```html
<div ref="featureGridRef" class="bento-grid">
  <div
    v-for="(feature, i) in features"
    :key="feature.title"
    v-reveal.up="{ delay: i }"
    class="bento-card group rounded-2xl shadow-sm shadow-black/5 transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/8"
    :class="[
      feature.hero
        ? 'bento-hero bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-primary/10 dark:border-primary/15 p-7 sm:p-8'
        : 'bg-white/80 dark:bg-gray-800/80 border border-white/20 dark:border-gray-700/30 p-6'
    ]"
  >
    <!-- Icon -->
    <div
      class="feature-icon flex items-center justify-center rounded-xl bg-primary/10 mb-4 will-change-transform"
      :class="feature.hero ? 'size-14' : 'size-12'"
    >
      <UIcon
        :name="feature.icon"
        class="text-primary"
        :class="feature.hero ? 'size-7' : 'size-6'"
      />
    </div>

    <!-- Text -->
    <h3
      class="font-semibold text-highlighted mb-2"
      :class="feature.hero ? 'text-xl' : 'text-lg'"
    >
      {{ feature.title }}
    </h3>
    <p
      class="text-muted leading-relaxed"
      :class="feature.hero ? 'text-base' : 'text-sm'"
    >
      {{ feature.description }}
    </p>

    <!-- Hero card: Kanban mini-illustration -->
    <div v-if="feature.hero && feature.icon === 'i-lucide-columns-3'" class="mt-5 flex gap-1.5">
      <div v-for="n in 3" :key="n" class="flex-1 space-y-1.5">
        <div class="h-1.5 rounded-full bg-primary/15 dark:bg-primary/25" />
        <div
          v-for="m in (4 - n)"
          :key="m"
          class="h-6 rounded-lg border border-white/30 dark:border-gray-600/30 bg-white/60 dark:bg-gray-700/40"
        />
      </div>
    </div>

    <!-- Hero card: Ghost meter mini-illustration -->
    <div v-if="feature.hero && feature.icon === 'i-lucide-ghost'" class="mt-5 flex items-end gap-1.5 h-10">
      <div
        v-for="(h, idx) in [40, 65, 30, 85, 55, 45, 75]"
        :key="idx"
        class="flex-1 rounded-t-sm transition-colors"
        :class="h > 60 ? 'bg-red-400/40 dark:bg-red-400/30' : 'bg-primary/15 dark:bg-primary/25'"
        :style="{ height: `${h}%` }"
      />
    </div>
  </div>
</div>
```

- [ ] **Step 6: Add bento grid scoped styles**

Add a `<style scoped>` block at the end of `index.vue` (or append to existing if present):

```css
<style scoped>
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

@media (prefers-reduced-motion: reduce) {
  .bento-card { opacity: 1 !important; transform: none !important; }
}
</style>
```

---

## Chunk 4: How It Works Redesign

### Task 7: Redesign How It Works Section

**Files:**
- Modify: `frontend/app/pages/index.vue`

- [ ] **Step 1: Replace How It Works section template**

Replace the entire How It Works section (lines ~335-368 approximately) with:

```html
<!-- ==================== HOW IT WORKS ==================== -->
<section ref="howItWorksRef" class="py-16 sm:py-24">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-highlighted tracking-tight leading-tight mb-4">How it works</h2>
      <p class="text-lg text-muted max-w-2xl mx-auto">
        Get started in minutes. No complicated setup required.
      </p>
    </div>

    <div class="relative">
      <!-- SVG connecting line (desktop) -->
      <svg
        class="hidden md:block absolute top-6 left-[16.67%] right-[16.67%] h-1 overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <line
          ref="stepLineRef"
          x1="0" y1="0" x2="100%" y2="0"
          stroke="var(--ui-color-primary-300)"
          stroke-width="2"
          stroke-linecap="round"
          class="dark:stroke-primary/40"
        />
      </svg>

      <!-- Mobile vertical line -->
      <div class="md:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-primary/20" />

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div
          v-for="(step, i) in steps"
          :key="step.number"
          class="relative flex flex-col items-center text-center"
        >
          <!-- Numbered circle — uses reactive `activatedCircles` set for class binding -->
          <div
            :ref="(el) => { if (el) stepCircleRefs[i] = el as HTMLElement }"
            class="relative z-10 mb-6 flex size-12 items-center justify-center rounded-full font-bold text-lg transition-all duration-300"
            :class="activatedCircles.has(i)
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'md:bg-primary/10 md:text-primary bg-primary text-white shadow-lg shadow-primary/25'"
          >
            {{ step.number }}
          </div>

          <!-- Content card -->
          <div
            v-reveal.up="{ delay: i }"
            class="rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg p-6 shadow-sm shadow-black/5 w-full"
          >
            <div class="flex items-center justify-center gap-2 mb-3">
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

- [ ] **Step 2: Verify template refs work**

The template refs (`featureGridRef`, `howItWorksRef`, `stepLineRef`, `stepCircleRefs`, `activatedCircles`) were already declared in Task 5 Step 7. Verify the How It Works template `ref="howItWorksRef"` and `ref="stepLineRef"` attributes match the declared refs.

---

## Chunk 5: Testimonials, Extension, CTA Updates + GSAP Setup

### Task 8: Update Testimonials, Chrome Extension, and Final CTA Sections

**Files:**
- Modify: `frontend/app/pages/index.vue`

- [ ] **Step 1: Update testimonials section with glass variation + v-reveal**

Replace the testimonials section (the grid cards part) with:

```html
<!-- ==================== TESTIMONIALS ==================== -->
<section class="py-16 sm:py-24">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-highlighted tracking-tight leading-tight mb-4">Loved by job seekers</h2>
      <p class="text-lg text-muted max-w-2xl mx-auto">
        See what our users have to say about their experience with JobVault.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="(testimonial, i) in testimonials"
        :key="testimonial.name"
        v-reveal.up="{ delay: i }"
        class="testimonial-card rounded-2xl p-6 shadow-sm shadow-black/5"
        :class="[
          i === 1
            ? 'bg-white/80 dark:bg-gray-800/80 border border-primary/10 dark:border-primary/15 md:scale-[1.02]'
            : 'bg-white/80 dark:bg-gray-800/80 border border-white/20 dark:border-gray-700/30'
        ]"
      >
        <!-- Stars -->
        <div class="flex gap-0.5 mb-4">
          <UIcon
            v-for="s in testimonial.stars"
            :key="s"
            name="i-lucide-star"
            class="size-4 fill-amber-400 text-amber-400"
          />
        </div>

        <!-- Quote -->
        <p class="text-sm text-muted italic leading-relaxed mb-6">
          "{{ testimonial.quote }}"
        </p>

        <!-- Divider -->
        <USeparator class="mb-4" />

        <!-- Author -->
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary shrink-0">
            {{ testimonial.initials }}
          </div>
          <div>
            <div class="text-sm font-semibold text-highlighted">{{ testimonial.name }}</div>
            <div class="text-xs text-muted">{{ testimonial.title }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Update Chrome Extension section — v-reveal + typography**

On the extension promo section tag, keep `id="extension-promo"` and add `v-reveal.up`:
```html
<section id="extension-promo" v-reveal.up class="py-16 sm:py-24">
```

Also add `tracking-tight leading-tight` to the Chrome Extension h2:
```html
<h2 class="text-3xl sm:text-4xl font-bold text-highlighted tracking-tight leading-tight mb-4">
```

- [ ] **Step 3: Update Final CTA section**

Update the final CTA content and add v-reveal:

Change section opening to (preserve `id="final-cta"`):
```html
<section id="final-cta" v-reveal.scale class="py-16 sm:py-24">
```

Change the CTA button label from `"Get Started — It's Free"` to `"Create Your Board"`.

Change the subheading text from `"Join thousands of job seekers who never lose track of an application."` to `"Take control of your job search. Never lose track of an application again."`.

Add `tracking-tight leading-tight` to the CTA h2 class.

---

### Task 9: Add GSAP Animations — Icon Hover, Line Draw, Circle Activation

**Files:**
- Modify: `frontend/app/pages/index.vue`

- [ ] **Step 1: Add GSAP setup in onMounted**

Add this `onMounted` block in the `<script setup>` section (after the template refs):

```typescript
const gsapTriggers: any[] = [];
const abortController = new AbortController(); // For cleaning up event listeners

onMounted(async () => {
  if (!import.meta.client) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const gsap = (await import('gsap')).default;
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);

  // === Feature card icon hover ===
  if (featureGridRef.value) {
    const cards = featureGridRef.value.querySelectorAll('.bento-card');
    cards.forEach((card) => {
      const icon = card.querySelector('.feature-icon');
      if (!icon) return;

      card.addEventListener('mouseenter', () => {
        gsap.to(icon, { scale: 1.2, rotate: 8, duration: 0.3, ease: 'back.out(2)' });
      }, { signal: abortController.signal });
      card.addEventListener('mouseleave', () => {
        gsap.to(icon, { scale: 1, rotate: 0, duration: 0.3, ease: 'power2.out' });
      }, { signal: abortController.signal });
    });
  }

  // === How It Works line draw (desktop only) ===
  if (stepLineRef.value && window.innerWidth >= 768) {
    const lineEl = stepLineRef.value as unknown as SVGGeometryElement;
    const length = lineEl.getTotalLength
      ? lineEl.getTotalLength()
      : lineEl.getBoundingClientRect().width;

    gsap.set(lineEl, { strokeDasharray: length, strokeDashoffset: length });

    const lineTween = gsap.to(lineEl, {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: howItWorksRef.value,
        start: 'top 60%',
        end: 'bottom 50%',
        scrub: 1.5,
        onUpdate: (self) => {
          const progress = self.progress;
          // Activate circles at thresholds using reactive state (not classList)
          stepCircleRefs.value.forEach((circle, i) => {
            if (!circle) return;
            const threshold = i / (stepCircleRefs.value.length - 1);
            if (progress >= threshold && !activatedCircles.has(i)) {
              activatedCircles.add(i);
              // Scale pop animation via GSAP
              gsap.fromTo(circle,
                { scale: 1 },
                { scale: 1.15, duration: 0.2, ease: 'back.out(2)', yoyo: true, repeat: 1 },
              );
            }
          });
        },
      },
    });
    gsapTriggers.push(lineTween);
    gsapTriggers.push(ScrollTrigger.getAll().at(-1));
  }
});

onUnmounted(() => {
  abortController.abort(); // Clean up all event listeners
  gsapTriggers.forEach((t) => t?.kill?.());
  gsapTriggers.length = 0;
});
```

- [ ] **Step 2: Verify the full page works**

Run: `cd D:/Projects/job-tracker/frontend && npm run dev`

Check:
1. Hero section: light-mode bg gradient visible, orbs float smoothly (no scale), grid glows animate, no SVG arcs
2. Trust badges: chip styling, uppercase, staggered reveal
3. Features: bento grid layout (2 hero cards span 2 cols), shadow hover, icon pulse on hover
4. How It Works: horizontal stepper, line draws on scroll, circles activate
5. Testimonials: center card elevated, staggered reveal
6. CTA: updated text, scale reveal
7. Dark mode: all sections look correct
8. Mobile: single column, vertical stepper line, no GSAP scroll animation

---

## Chunk 6: Final Verification

### Task 10: Visual QA and Cleanup

**Files:**
- Verify: `frontend/app/pages/index.vue`
- Verify: `frontend/app/assets/css/main.css`
- Verify: `frontend/app/components/ui/BackgroundGradientAnimation.vue`

- [ ] **Step 1: Check for unused imports**

Ensure `useScrollReveal` is no longer imported in `index.vue`. If there's a leftover import, remove it.

- [ ] **Step 2: Check no duplicate CSS rules**

Verify `main.css` doesn't have duplicate `.gradient-blob` or `.gradients-container` rule blocks. The `will-change` and `contain` properties should be added to existing rules, not new ones.

- [ ] **Step 3: Test reduced motion**

In browser DevTools, enable "prefers-reduced-motion: reduce" emulation. Verify:
- All `v-reveal` elements appear immediately (no animation)
- Orbs are static
- Background blobs are static
- GSAP animations don't run

- [ ] **Step 4: Test mobile responsive**

Resize browser to mobile width. Verify:
- Bento grid is single column
- How It Works shows vertical line with pre-activated circles
- Trust badges wrap properly
- All sections are readable
