# JobVault Landing Page — Complete Documentation

This document fully describes the JobVault landing page so that someone could recreate it from scratch. Every file, component, animation, color value, data array, and CSS class is included.

---

## Table of Contents

1. [Tech Stack & Dependencies](#1-tech-stack--dependencies)
2. [File Structure](#2-file-structure)
3. [Design System](#3-design-system)
4. [Layout — `web.vue`](#4-layout--webvue)
5. [Navbar](#5-navbar)
6. [Hero Section](#6-hero-section)
7. [Background Gradient Animation](#7-background-gradient-animation)
8. [Trust Badges](#8-trust-badges)
9. [Features Section](#9-features-section)
10. [How It Works](#10-how-it-works)
11. [Testimonials](#11-testimonials)
12. [Chrome Extension Promo](#12-chrome-extension-promo)
13. [Final CTA](#13-final-cta)
14. [Footer](#14-footer)
15. [Scroll Reveal System](#15-scroll-reveal-system)
16. [ButtonWithIcon Component](#16-buttonwithicon-component)
17. [All CSS — `main.css`](#17-all-css--maincss)
18. [All Data](#18-all-data)

---

## 1. Tech Stack & Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| Nuxt | ^4.3.1 | Framework (SSR for public pages, SPA for `/app/**`) |
| @nuxt/ui | ^4.4.0 | Component library (UButton, UIcon, USlideover, USeparator, UBadge) |
| Tailwind CSS | ^4.1.18 | Utility-first styling (imported via `@nuxt/ui`) |
| Lucide icons | `@iconify-json/lucide` ^1.2.91 | All icons (prefixed `i-lucide-*`) |
| Simple Icons | `@iconify-json/simple-icons` ^1.2.71 | Social icons in footer (`i-simple-icons-*`) |
| Manrope font | Google Fonts (loaded externally or system fallback) | Primary typeface |
| Vue | ^3.5.28 | Reactive framework |

### Nuxt Modules

```ts
// nuxt.config.ts
modules: ['@nuxt/ui']
```

### Icon Configuration

```ts
// nuxt.config.ts
icon: {
  clientBundle: { scan: true },
  serverBundle: 'local',
}
```

### Route Rules

```ts
// nuxt.config.ts
routeRules: {
  '/api/**': { proxy: { to: 'http://localhost:3000/**' } },
  '/app/**': { ssr: false },  // SPA mode for app routes
}
// Public pages (/, /web/**) use SSR by default
```

---

## 2. File Structure

```
frontend/
├── app/
│   ├── app.vue                                  # Root: <UApp><NuxtLayout><NuxtPage/></NuxtLayout></UApp>
│   ├── assets/css/main.css                      # All custom CSS, keyframes, variables
│   ├── layouts/
│   │   └── web.vue                              # Public page layout (navbar + slot + footer)
│   ├── pages/
│   │   └── index.vue                            # Landing page (this document)
│   ├── components/
│   │   ├── web/
│   │   │   ├── Navbar.vue                       # Responsive navbar with pill scroll effect
│   │   │   └── Footer.vue                       # 4-column footer
│   │   └── ui/
│   │       ├── ButtonWithIcon.vue               # Animated CTA button
│   │       └── BackgroundGradientAnimation.vue  # Animated blob gradient background
│   └── composables/
│       ├── useScrollReveal.ts                   # IntersectionObserver scroll animations
│       └── useAuth.ts                           # Auth state (used by navbar for conditional buttons)
├── app.config.ts                                # Nuxt UI theme overrides
├── nuxt.config.ts                               # Nuxt configuration
└── package.json                                 # Dependencies
```

### File Roles

| File | Role |
|---|---|
| `pages/index.vue` | Landing page template + script. Contains all section markup, data arrays (features, steps, testimonials, trustBadges), scroll reveal setup, and SEO meta. |
| `layouts/web.vue` | Wraps public pages with Navbar (top) + Footer (bottom). Adds `min-h-screen bg-default flex flex-col` and `pt-16` on `<main>` to offset fixed navbar. |
| `components/web/Navbar.vue` | Fixed-position navbar. Full-width by default, morphs into floating pill on scroll. Responsive: desktop links + mobile slideover. Auth-aware CTA. |
| `components/web/Footer.vue` | 4-column grid footer with brand, product, company, legal links + social icons + copyright. |
| `components/ui/ButtonWithIcon.vue` | Reusable CTA button with sliding icon circle animation. |
| `components/ui/BackgroundGradientAnimation.vue` | Full-section animated gradient blob background with SVG goo filter and interactive mouse-following blob. |
| `composables/useScrollReveal.ts` | Composable returning `reveal()` and `revealStagger()` using IntersectionObserver. |
| `composables/useAuth.ts` | Auth state composable. Navbar uses `isAuthenticated` to show Login vs Dashboard. |
| `assets/css/main.css` | All custom styles: color variables, grid background, glow lines, orb animations, navbar pill transitions, gradient blob animations, scroll reveal classes, button styles. |
| `app.config.ts` | Nuxt UI component theme overrides (colors, card radius, button shape, input style, form labels). |

---

## 3. Design System

### Color Palette

All colors are CSS custom properties set on `:root` in `main.css`:

| Variable | Value | Usage |
|---|---|---|
| `--ui-color-primary-50` | `#f3eeff` | Lightest tint |
| `--ui-color-primary-100` | `#e4d9ff` | |
| `--ui-color-primary-200` | `#cdb8ff` | |
| `--ui-color-primary-300` | `#ae8bff` | |
| `--ui-color-primary-400` | `#8f5cff` | Dark mode primary |
| `--ui-color-primary-500` | `#7535ff` | |
| `--ui-color-primary-600` | `#5b2bee` | **Light mode primary** |
| `--ui-color-primary-700` | `#4f1fd4` | |
| `--ui-color-primary-800` | `#421bab` | |
| `--ui-color-primary-900` | `#37178a` | |
| `--ui-color-primary-950` | `#200b5e` | Darkest shade |

```css
:root {
  --ui-primary: var(--ui-color-primary-600);  /* #5b2bee */
}
.dark {
  --ui-primary: var(--ui-color-primary-400);  /* #8f5cff */
}
```

### Nuxt UI Semantic Colors (`app.config.ts`)

```ts
colors: {
  primary: 'violet',
  secondary: 'indigo',
  success: 'emerald',
  info: 'sky',
  warning: 'amber',
  error: 'rose',
  neutral: 'zinc',
}
```

### Typography

```css
@theme {
  --font-sans: 'Manrope', system-ui, -apple-system, sans-serif;
}
```

- Headings: `font-bold text-highlighted`
- Body: `text-muted`
- Small text: `text-sm`, `text-xs`
- Hero H1: `text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.15]`
- Section H2: `text-3xl sm:text-4xl font-bold`

### Border Radius

```css
:root {
  --ui-radius: 0.75rem;  /* 12px — global default */
}
```

- Cards: `rounded-2xl` (16px)
- Buttons: `rounded-full` (pill shape via app.config)
- Icons: `rounded-xl` (12px)
- Orbs: `rounded-full`

### Glassmorphism Recipe

Used on feature cards, testimonial cards, hero mockup, extension promo, final CTA, and footer:

```
Light mode:
  background: white/60–80% (bg-white/60, bg-white/70, bg-white/80)
  border: white/20–30% (border-white/20, border-white/30)
  backdrop-filter: blur(12–40px) (backdrop-blur-lg, backdrop-blur-xl)
  shadow: shadow-sm shadow-black/5 → hover: shadow-lg shadow-black/10

Dark mode:
  background: gray-800/60–80% (dark:bg-gray-800/70, dark:bg-gray-900/60)
  border: gray-700/30–40% (dark:border-gray-700/30, dark:border-gray-700/40)
  Same blur and shadow values
```

### Dark Mode

- Toggled via `useColorMode()` from Nuxt UI
- Toggle button in navbar swaps `i-lucide-sun` / `i-lucide-moon`
- All custom CSS has `.dark` variants
- Tailwind `dark:` prefix used throughout templates

---

## 4. Layout — `web.vue`

**Path**: `frontend/app/layouts/web.vue`

```vue
<template>
  <div class="min-h-screen bg-default flex flex-col">
    <WebNavbar />
    <main class="flex-1 pt-16">
      <slot />
    </main>
    <WebFooter />
  </div>
</template>
```

- `min-h-screen`: Full viewport height minimum
- `bg-default`: Nuxt UI's semantic background color
- `flex flex-col`: Vertical flex layout
- `pt-16`: 64px top padding to offset the fixed navbar (navbar height = `4rem`)
- `flex-1` on `<main>`: Fills remaining space so footer stays at bottom

---

## 5. Navbar

**Path**: `frontend/app/components/web/Navbar.vue`

### Behavior

1. **Default state**: Full-width transparent bar, no border, no blur
2. **Scrolled state** (after `window.scrollY > 10`): Morphs into a floating pill with:
   - `max-width: 64rem` (1024px)
   - `border-radius: 9999px` (pill)
   - Frosted glass: `backdrop-filter: blur(8px) saturate(1.8)`
   - Light bg: `rgba(255,255,255,0.55)`, border `rgba(255,255,255,0.5)`
   - Dark bg: `rgba(17,24,39,0.5)`, border `rgba(255,255,255,0.08)`
   - Height shrinks from `4rem` to `3.5rem`
   - Margin-top `0.75rem` (floats below top edge)
   - Box shadow with inset highlight

### Structure

```
<header class="fixed left-0 right-0 z-50">
  <nav class="navbar-pill mx-auto flex items-center justify-between border [is-scrolled?]">
    ├── Logo: <NuxtLink to="/"> UIcon(briefcase) + "JobVault" </NuxtLink>
    ├── Desktop Links (hidden lg:flex): Features*, FAQ, About, Contact
    ├── Desktop Right (hidden lg:flex):
    │   ├── If authenticated: UButton → Dashboard
    │   ├── If not: UButton.btn-gradient → Login
    │   └── Color mode toggle button
    └── Mobile (<lg): USlideover (hamburger trigger)
        └── #body slot:
            ├── Same nav links (full-width rows)
            ├── USeparator
            ├── Auth buttons (Login/Sign Up or Dashboard)
            └── Dark mode toggle row
  </nav>
</header>
```

*Features link only shown on homepage (`isHomePage`), uses anchor scroll (`/#features`).

### Nav Links Logic

```ts
const navLinks = computed(() => {
  const links = [];
  if (isHomePage.value) {
    links.push({ label: 'Features', href: '/#features', isAnchor: true });
  }
  links.push(
    { label: 'FAQ', to: '/web/faq', isAnchor: false },
    { label: 'About', to: '/web/about', isAnchor: false },
    { label: 'Contact', to: '/web/contact', isAnchor: false },
  );
  return links;
});
```

### Scroll Listener

```ts
const isScrolled = ref(false);
function onScroll() { isScrolled.value = window.scrollY > 10; }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', onScroll));
```

### Anchor Link Handler

```ts
function onNavLinkClick(link: { isAnchor: boolean; href?: string }) {
  if (link.isAnchor && link.href) {
    isMobileMenuOpen.value = false;
    const target = document.querySelector(link.href.replace('/', ''));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  } else {
    isMobileMenuOpen.value = false;
  }
}
```

### Auth State

```ts
const auth = useAuth();
const isClientAuthenticated = ref(false);
onMounted(() => {
  isClientAuthenticated.value = auth.isAuthenticated.value;
  watch(() => auth.isAuthenticated.value, (val) => {
    isClientAuthenticated.value = val;
  });
});
```

### Mobile Slideover Config

```vue
<USlideover
  v-model:open="isMobileMenuOpen"
  side="right"
  title="Menu"
  :ui="{ content: 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl' }"
>
```

### Desktop Link Styling

```
text-sm font-medium text-muted hover:text-highlighted transition-colors
```

### Mobile Link Styling

```
flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-elevated hover:text-highlighted transition-colors
```

### Navbar Pill CSS (full)

```css
.navbar-pill {
  max-width: 80rem;
  height: 4rem;
  margin-top: 0;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 0;
  border-color: transparent;
  background: transparent;
  backdrop-filter: none;
  box-shadow: none;
  transition: max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              margin-top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              border-radius 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.3s ease,
              background 0.3s ease,
              backdrop-filter 0.3s ease,
              box-shadow 0.3s ease;
}

@media (min-width: 640px) {
  .navbar-pill { padding-left: 1.5rem; padding-right: 1.5rem; }
}
@media (min-width: 1024px) {
  .navbar-pill { padding-left: 2rem; padding-right: 2rem; }
}

.navbar-pill.is-scrolled {
  max-width: 64rem;
  height: 3.5rem;
  margin-top: 0.75rem;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
  border-radius: 9999px;
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px) saturate(1.8);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04),
              inset 0 0 0 0.5px rgba(255, 255, 255, 0.4);
}

.dark .navbar-pill.is-scrolled {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(17, 24, 39, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1),
              inset 0 0 0 0.5px rgba(255, 255, 255, 0.05);
}
```

---

## 6. Hero Section

**Location**: Top of `pages/index.vue`, inside `<section class="hero-bg ...">`

### Container

```html
<section class="hero-bg relative overflow-hidden -mt-16 pt-36 sm:pt-44 lg:pt-52 pb-20 sm:pb-28 lg:pb-36">
```

- `-mt-16`: Pulls section up behind the fixed navbar
- Responsive padding: mobile `pt-36 pb-20`, tablet `pt-44 pb-28`, desktop `pt-52 pb-36`

### Background Layers (inside hero section)

#### 1. Grid Pattern

```html
<div class="hero-grid pointer-events-none absolute inset-0" />
```

CSS:

```css
.hero-grid {
  background-image:
    linear-gradient(rgba(91, 43, 238, 0.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91, 43, 238, 0.5) 1px, transparent 1px);
  background-size: 64px 64px;
  opacity: 0.1;
  mask-image: radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%);
}
.dark .hero-grid { opacity: 0.15; }
```

- 64px x 64px grid lines in primary violet with 0.5 alpha
- 10% overall opacity (15% dark mode)
- Radial fade mask centered at 50% 40%, fading at 70%

#### 2. Animated Glow Lines

```html
<div class="pointer-events-none absolute inset-0 overflow-hidden">
  <!-- Horizontal glow lines -->
  <div class="grid-glow-h absolute h-px w-32" style="top: 128px; animation-duration: 7s" />
  <div class="grid-glow-h absolute h-px w-24" style="top: 320px; animation-duration: 9s; animation-delay: -3s" />
  <div class="grid-glow-h absolute h-px w-28" style="top: 448px; animation-duration: 11s; animation-delay: -6s" />
  <!-- Vertical glow lines -->
  <div class="grid-glow-v absolute w-px h-24" style="left: 192px; animation-duration: 8s; animation-delay: -2s" />
  <div class="grid-glow-v absolute w-px h-20" style="left: 512px; animation-duration: 10s; animation-delay: -5s" />
  <div class="grid-glow-v absolute w-px h-28" style="left: 832px; animation-duration: 12s; animation-delay: -8s" />
</div>
```

CSS:

```css
.grid-glow-h {
  background: linear-gradient(90deg, transparent, rgba(91, 43, 238, 0.4), transparent);
  animation: grid-glow-horizontal 8s linear infinite;
}
.grid-glow-v {
  background: linear-gradient(180deg, transparent, rgba(91, 43, 238, 0.4), transparent);
  animation: grid-glow-vertical 8s linear infinite;
}

/* Dark mode uses rgba(138, 107, 253, 0.5) for both */

@keyframes grid-glow-horizontal {
  0%   { transform: translateX(-100%); opacity: 0; }
  5%   { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateX(calc(100vw + 100%)); opacity: 0; }
}

@keyframes grid-glow-vertical {
  0%   { transform: translateY(-100%); opacity: 0; }
  5%   { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(calc(100vh + 100%)); opacity: 0; }
}
```

| Line | Type | Position | Width/Height | Duration | Delay |
|---|---|---|---|---|---|
| 1 | H | top: 128px | w-32 (128px) | 7s | 0 |
| 2 | H | top: 320px | w-24 (96px) | 9s | -3s |
| 3 | H | top: 448px | w-28 (112px) | 11s | -6s |
| 4 | V | left: 192px | h-24 (96px) | 8s | -2s |
| 5 | V | left: 512px | h-20 (80px) | 10s | -5s |
| 6 | V | left: 832px | h-28 (112px) | 12s | -8s |

All positions are multiples of 64px (grid-aligned).

#### 3. Decorative Arc SVGs

```html
<svg class="pointer-events-none absolute inset-0 size-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <circle cx="85%" cy="-10%" r="35%" fill="none" stroke="var(--arc-color, rgba(91,43,238,0.08))" stroke-width="1" />
  <circle cx="10%" cy="110%" r="40%" fill="none" stroke="var(--arc-color, rgba(91,43,238,0.08))" stroke-width="1" />
  <circle cx="95%" cy="60%" r="20%" fill="none" stroke="var(--arc-color, rgba(91,43,238,0.06))" stroke-width="1" />
</svg>
```

Dark mode override:

```css
.dark .hero-bg {
  --arc-color: rgba(138, 107, 253, 0.12);
}
```

| Circle | cx | cy | r | Stroke opacity |
|---|---|---|---|---|
| Large (top-right) | 85% | -10% | 35% | 0.08 |
| Medium (bottom-left) | 10% | 110% | 40% | 0.08 |
| Small (center-right) | 95% | 60% | 20% | 0.06 |

#### 4. Floating Glass Orbs

Four floating orbs with icons, each with a unique drift animation:

```html
<!-- Orb 1: Briefcase — top right -->
<div class="orb-float-1 pointer-events-none absolute right-[8%] top-[10%] flex size-16 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
  <UIcon name="i-lucide-briefcase" class="size-7 text-primary/40" />
</div>

<!-- Orb 2: Sparkles — top left -->
<div class="orb-float-2 pointer-events-none absolute left-[5%] top-[25%] flex size-12 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
  <UIcon name="i-lucide-sparkles" class="size-5 text-primary/40" />
</div>

<!-- Orb 3: Bar Chart — bottom left -->
<div class="orb-float-3 pointer-events-none absolute bottom-[5%] left-[12%] flex size-14 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
  <UIcon name="i-lucide-bar-chart-3" class="size-6 text-primary/40" />
</div>

<!-- Orb 4: Ghost — bottom right -->
<div class="orb-float-4 pointer-events-none absolute bottom-[20%] right-[15%] flex size-10 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
  <UIcon name="i-lucide-ghost" class="size-4 text-primary/40" />
</div>
```

| Orb | Class | Position | Size | Icon | Icon Size | Animation Duration |
|---|---|---|---|---|---|---|
| 1 | `orb-float-1` | right:8% top:10% | 16 (64px) | briefcase | 7 (28px) | 23s |
| 2 | `orb-float-2` | left:5% top:25% | 12 (48px) | sparkles | 5 (20px) | 29s |
| 3 | `orb-float-3` | bottom:5% left:12% | 14 (56px) | bar-chart-3 | 6 (24px) | 26s |
| 4 | `orb-float-4` | bottom:20% right:15% | 10 (40px) | ghost | 4 (16px) | 31s |

Orb styling: `rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm`
Dark: `dark:border-purple-700/30 dark:bg-white/5`

Each orb's keyframe animation has ~10 waypoints with translate(Xpx, Ypx) and scale(0.95–1.08) variations for organic movement. Full keyframes in [Section 17](#17-all-css--maincss).

### Hero Content

```html
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  <div class="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
    <!-- Left: Text -->  <!-- Right: Mockup -->
  </div>
</div>
```

Stacks vertically on mobile, side-by-side on `lg:`.

#### Left — Text Content

```html
<div id="hero-text" class="flex-1 text-center lg:text-left">
  <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-highlighted leading-[1.15]">
    Ghost-Proof Your
    <span class="text-primary">Job Search</span>
  </h1>
  <p class="mt-6 text-lg sm:text-xl text-muted max-w-xl mx-auto lg:mx-0">
    Track applications, preserve job postings before they vanish, and generate
    AI-powered cover letters — all in one place.
  </p>
  <div class="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
    <UiButtonWithIcon to="/app/auth/register" label="Get Started Free" />
    <UButton
      variant="outline" size="xl" label="Learn More"
      icon="i-lucide-chevron-down" trailing
      class="rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
      @click.prevent="scrollToFeatures"
    />
  </div>
</div>
```

- Primary CTA: `ButtonWithIcon` → `/app/auth/register`
- Secondary CTA: Outline `UButton` with chevron-down, scrolls to `#features`

#### Right — Dashboard Mockup

A glassmorphic card simulating a mini Kanban dashboard:

```html
<div id="hero-mockup" class="flex-1 w-full max-w-lg mx-auto lg:mx-0">
  <div class="rounded-2xl border border-white/30 dark:border-gray-700/40 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-5 shadow-2xl shadow-primary/10">
```

**Internal structure:**

1. **Mock window controls**: 3 colored dots (red-400, amber-400, green-400) + 2 placeholder bars
2. **Stats row**: 3-column grid showing "12 Applied" (primary), "5 Interviewing" (amber-500), "3 Offers" (emerald-500)
3. **Kanban columns**: 3-column grid with placeholder cards
   - Applied: 3 cards with `border-white/20 bg-white/80 dark:border-gray-700/30 dark:bg-gray-800/80`
   - Interviewing: 2 cards with `border-amber-200/40 bg-amber-50/50 dark:border-amber-700/30 dark:bg-amber-900/20`
   - Offers: 1 card with `border-emerald-200/40 bg-emerald-50/50 dark:border-emerald-700/30 dark:bg-emerald-900/20` + green status dot

All content inside the mockup is skeleton-style (colored rounded divs of varying widths, no real text except stats).

### Scroll Reveal Config (Hero)

```ts
reveal('#hero-text', { direction: 'up', duration: 1 });
reveal('#hero-mockup', { direction: 'right', duration: 1, delay: 0.2 });
```

---

## 7. Background Gradient Animation

**Path**: `frontend/app/components/ui/BackgroundGradientAnimation.vue`

Wraps all sections after the hero (trust badges through final CTA).

### Usage

```html
<UiBackgroundGradientAnimation>
  <!-- trust badges, features, how-it-works, testimonials, extension promo, final CTA -->
</UiBackgroundGradientAnimation>
```

### Props

```ts
const props = withDefaults(defineProps<{
  interactive?: boolean
}>(), {
  interactive: true,
});
```

### Template Structure

```html
<div ref="containerRef" class="gradient-bg" @mousemove="handleMouseMove">
  <!-- SVG goo filter (hidden) -->
  <svg xmlns="http://www.w3.org/2000/svg" class="hidden">
    <defs>
      <filter :id="filterId">
        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
        <feColorMatrix in="blur" mode="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
        <feBlend in="SourceGraphic" in2="goo" />
      </filter>
    </defs>
  </svg>

  <!-- Blobs container (filtered + blurred) -->
  <div class="gradients-container" :style="{ filter: `url(#${filterId}) blur(40px)` }">
    <div class="gradient-blob gradient-blob-1" />
    <div class="gradient-blob gradient-blob-2" />
    <div class="gradient-blob gradient-blob-3" />
    <div class="gradient-blob gradient-blob-4" />
    <div class="gradient-blob gradient-blob-5" />
    <div v-if="interactive" ref="interactiveRef" class="gradient-blob gradient-blob-interactive" />
  </div>

  <!-- Content (z-10, above blobs) -->
  <div class="relative z-10">
    <slot />
  </div>
</div>
```

### Interactive Mouse Tracking

```ts
let curX = 0, curY = 0, tgX = 0, tgY = 0;
let rafId: number | null = null;

function move() {
  curX += (tgX - curX) / 20;  // Eased interpolation (1/20 per frame)
  curY += (tgY - curY) / 20;
  if (interactiveRef.value) {
    interactiveRef.value.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
  }
  rafId = requestAnimationFrame(move);
}

function handleMouseMove(event: MouseEvent) {
  const rect = containerRef.value.getBoundingClientRect();
  tgX = event.clientX - rect.left;
  tgY = event.clientY - rect.top;
}
```

Skipped on:
- `interactive: false`
- Touch-only devices (`'ontouchstart' in window && !matchMedia('(pointer: fine)')`)
- `prefers-reduced-motion: reduce`

Pauses on `visibilitychange` (tab hidden), resumes when visible.

### Blob Colors

#### Light Mode

| Blob | CSS Variable | RGB Value |
|---|---|---|
| 1 | `--blob-color-1` | 205, 184, 255 |
| 2 | `--blob-color-2` | 228, 217, 255 |
| 3 | `--blob-color-3` | 214, 200, 255 |
| 4 | `--blob-color-4` | 195, 170, 255 |
| 5 | `--blob-color-5` | 235, 228, 255 |
| Interactive | `--blob-color-interactive` | 235, 228, 255 |

#### Dark Mode

| Blob | RGB Value |
|---|---|
| 1 | 91, 43, 238 |
| 2 | 117, 53, 255 |
| 3 | 79, 31, 212 |
| 4 | 143, 92, 255 |
| 5 | 174, 139, 255 |
| Interactive | 143, 92, 255 |

### Blob Config

```css
--blob-size: 65%;
--blob-opacity: 0.6;       /* Light */
--blob-opacity: 0.4;       /* Dark */
--blob-blend: normal;
```

| Blob | Animation | Duration | Direction | Transform Origin |
|---|---|---|---|---|
| 1 | moveVertical | 30s | ease | center center |
| 2 | moveInCircle | 20s | reverse | calc(50% - 400px) |
| 3 | moveInCircle | 40s | linear | calc(50% + 400px) |
| 4 | moveHorizontal | 40s | ease | calc(50% - 200px) |
| 5 | moveInCircle | 35s | linear | calc(50% - 800px) calc(50% + 800px) |
| Interactive | none (mouse) | — | — | — |

Blob 4 opacity: `calc(var(--blob-opacity) * 0.875)`
Interactive opacity: `calc(var(--blob-opacity) * 0.7)`
Interactive size: `width: 50%; height: 50%; top: -25%; left: -25%`

### Blob Keyframes

```css
@keyframes moveVertical {
  0%   { transform: translateY(-50%); }
  50%  { transform: translateY(50%); }
  100% { transform: translateY(-50%); }
}

@keyframes moveInCircle {
  0%   { transform: rotate(0deg); }
  50%  { transform: rotate(180deg); }
  100% { transform: rotate(360deg); }
}

@keyframes moveHorizontal {
  0%   { transform: translateX(-50%) translateY(-10%); }
  50%  { transform: translateX(50%) translateY(10%); }
  100% { transform: translateX(-50%) translateY(-10%); }
}
```

### SVG Goo Filter Values

```xml
<feGaussianBlur stdDeviation="10" />
<feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" />
```

The matrix amplifies alpha (18x) and subtracts 8, creating a threshold effect that merges overlapping blobs.

The entire `gradients-container` also has `blur(40px)` applied via inline style.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .gradient-blob { animation: none !important; }
  .gradient-blob-interactive { display: none; }
}
```

---

## 8. Trust Badges

**Location**: First section inside `<UiBackgroundGradientAnimation>`

```html
<section id="trust-badges" class="py-8 border-y border-[var(--ui-color-primary-200)]/30 dark:border-white/10">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex flex-wrap justify-center gap-6 sm:gap-12">
      <div v-for="badge in trustBadges" :key="badge.label"
        class="flex items-center gap-2 text-sm text-muted">
        <UIcon :name="badge.icon" class="size-5" />
        <span>{{ badge.label }}</span>
      </div>
    </div>
  </div>
</section>
```

### Data

```ts
const trustBadges = [
  { icon: 'i-lucide-code-2', label: 'Built with Vue' },
  { icon: 'i-lucide-github', label: 'Open Source' },
  { icon: 'i-lucide-shield-check', label: 'GDPR Compliant' },
  { icon: 'i-lucide-heart', label: '100% Free' },
];
```

### Scroll Reveal

```ts
reveal('#trust-badges', { direction: 'up', duration: 0.6 });
```

---

## 9. Features Section

```html
<section id="features" class="py-16 sm:py-24">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="text-center mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-highlighted mb-4">
        Everything you need to land your next role
      </h2>
      <p class="text-lg text-muted max-w-2xl mx-auto">
        From tracking applications to generating cover letters, JobVault has you covered.
      </p>
    </div>

    <!-- Cards grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="feature in features" :key="feature.title"
        class="feature-card rounded-2xl border border-white/20 dark:border-gray-700/30
               bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg p-6
               shadow-sm shadow-black/5 transition-all duration-200
               hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10">
        <!-- Icon -->
        <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
          <UIcon :name="feature.icon" class="size-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold text-highlighted mb-2">{{ feature.title }}</h3>
        <p class="text-sm text-muted leading-relaxed">{{ feature.description }}</p>
      </div>
    </div>
  </div>
</section>
```

### Card Anatomy

```
┌─ rounded-2xl glass card ─────────────────────┐
│  ┌── 48x48 rounded-xl icon box (bg-primary/10)│
│  │  UIcon (size-6, text-primary)               │
│  └─────────────────────────────────────────────┤
│  <h3> Title (text-lg font-semibold)            │
│  <p> Description (text-sm text-muted)          │
└────────────────────────────────────────────────┘
```

### Hover Effect

```
transition-all duration-200
hover:-translate-y-1           → lifts up 4px
hover:shadow-lg shadow-black/10 → stronger shadow
```

### Data

See [Section 18 — Features Array](#features-array).

### Scroll Reveal

```ts
revealStagger('.feature-card', { direction: 'up', stagger: 0.1 });
```

---

## 10. How It Works

```html
<section class="py-16 sm:py-24">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="text-center mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-highlighted mb-4">How it works</h2>
      <p class="text-lg text-muted max-w-2xl mx-auto">
        Get started in minutes. No complicated setup required.
      </p>
    </div>

    <div class="relative">
      <!-- Connecting line (desktop only) -->
      <div class="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-0.5 bg-primary/20" />

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div v-for="step in steps" :id="`step-${step.number}`" :key="step.number"
          class="relative flex flex-col items-center text-center">
          <!-- Numbered circle -->
          <div class="relative z-10 mb-4 flex size-12 items-center justify-center rounded-full
                      bg-primary text-white font-bold text-lg shadow-lg shadow-primary/25">
            {{ step.number }}
          </div>
          <!-- Icon box -->
          <div class="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <UIcon :name="step.icon" class="size-7 text-primary" />
          </div>
          <h3 class="text-lg font-semibold text-highlighted mb-2">{{ step.title }}</h3>
          <p class="text-sm text-muted leading-relaxed max-w-xs">{{ step.description }}</p>
        </div>
      </div>
    </div>
  </div>
</section>
```

### Connecting Line

- Desktop only (`hidden md:block`)
- Position: `absolute top-12` (48px, aligned with center of numbered circle)
- Horizontal span: `left-[16.67%] right-[16.67%]` (center third of each column)
- Style: `h-0.5 bg-primary/20` (2px tall, 20% opacity primary)

### Step Card Anatomy

```
         ┌─ 48x48 circle ─┐
         │  Number (bold)  │   ← bg-primary, text-white, shadow-lg shadow-primary/25
         └─────────────────┘
         ┌─ 56x56 box ────┐
         │  Icon           │   ← rounded-2xl bg-primary/10
         └─────────────────┘
         Title (text-lg)
         Description (text-sm, max-w-xs)
```

### Data

See [Section 18 — Steps Array](#steps-array).

### Scroll Reveal

```ts
reveal('#step-1', { direction: 'left', delay: 0 });
reveal('#step-2', { direction: 'up', delay: 0.15 });
reveal('#step-3', { direction: 'right', delay: 0.3 });
```

Steps enter from different directions: left, center-up, right.

---

## 11. Testimonials

```html
<section class="py-16 sm:py-24">
  <!-- Header: "Loved by job seekers" + subtitle -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div v-for="testimonial in testimonials" :key="testimonial.name"
      class="testimonial-card rounded-2xl border border-white/20 dark:border-gray-700/30
             bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg p-6
             shadow-sm shadow-black/5">
      <!-- Stars -->
      <div class="flex gap-0.5 mb-4">
        <UIcon v-for="i in testimonial.stars" :key="i"
          name="i-lucide-star" class="size-4 fill-amber-400 text-amber-400" />
      </div>
      <!-- Quote -->
      <p class="text-sm text-muted italic leading-relaxed mb-6">
        "{{ testimonial.quote }}"
      </p>
      <!-- Divider -->
      <USeparator class="mb-4" />
      <!-- Author -->
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-full
                    bg-primary/10 text-sm font-semibold text-primary shrink-0">
          {{ testimonial.initials }}
        </div>
        <div>
          <div class="text-sm font-semibold text-highlighted">{{ testimonial.name }}</div>
          <div class="text-xs text-muted">{{ testimonial.title }}</div>
        </div>
      </div>
    </div>
  </div>
</section>
```

### Card Anatomy

```
┌─ glassmorphic card ──────────────────┐
│  ★★★★★ (amber-400, filled)          │
│                                       │
│  "Quote text here"                    │
│  (italic, text-sm, text-muted)        │
│                                       │
│  ─────── separator ───────            │
│                                       │
│  [SC] Sarah Chen                      │
│       Software Engineer               │
└───────────────────────────────────────┘
```

- Stars: `UIcon i-lucide-star` with both `fill-amber-400` and `text-amber-400`
- Avatar: 40x40 circle with `bg-primary/10 text-primary` showing initials
- Divider: `<USeparator class="mb-4" />`

### Data

See [Section 18 — Testimonials Array](#testimonials-array).

### Scroll Reveal

```ts
revealStagger('.testimonial-card', { direction: 'up', stagger: 0.1 });
```

---

## 12. Chrome Extension Promo

```html
<section id="extension-promo" class="py-16 sm:py-24">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
    <UBadge color="primary" variant="subtle" class="mb-4">Coming Soon</UBadge>
    <h2 class="text-3xl sm:text-4xl font-bold text-highlighted mb-4">
      Save Jobs from Anywhere
    </h2>
    <p class="text-lg text-muted max-w-2xl mx-auto mb-8">
      Our Chrome extension lets you save jobs directly from LinkedIn, Indeed,
      and any job board with a single click.
    </p>
    <!-- Icon composition -->
    <div class="flex items-center justify-center gap-4">
      <div class="flex size-20 items-center justify-center rounded-2xl border border-white/20
                  dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/70
                  backdrop-blur-lg shadow-lg">
        <UIcon name="i-lucide-chrome" class="size-10 text-primary" />
      </div>
      <UIcon name="i-lucide-plus" class="size-6 text-muted" />
      <div class="flex size-20 items-center justify-center rounded-2xl border border-white/20
                  dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/70
                  backdrop-blur-lg shadow-lg">
        <UIcon name="i-lucide-briefcase" class="size-10 text-primary" />
      </div>
    </div>
  </div>
</section>
```

Visual: `[Chrome icon] + [Briefcase icon]` — two 80x80 glassmorphic boxes with a plus sign between them.

### Scroll Reveal

```ts
reveal('#extension-promo', { direction: 'up' });
```

---

## 13. Final CTA

```html
<section id="final-cta" class="py-16 sm:py-24">
  <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
    <div class="rounded-2xl border border-white/20 dark:border-gray-700/30
                bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg
                p-8 sm:p-12 shadow-xl shadow-black/5">
      <h2 class="text-3xl sm:text-4xl font-bold text-highlighted mb-4">
        Ready to ghost-proof your job search?
      </h2>
      <p class="text-lg text-muted max-w-xl mx-auto mb-8">
        Join thousands of job seekers who never lose track of an application.
      </p>
      <UiButtonWithIcon to="/app/auth/register" label="Get Started — It's Free" />
    </div>
  </div>
</section>
```

- Container: `max-w-3xl` (narrower than other sections)
- Card: Glassmorphic with `shadow-xl`
- Padding: `p-8 sm:p-12`

### Scroll Reveal

```ts
reveal('#final-cta', { scale: 0.95, duration: 0.8 });
```

Uses scale animation (starts at 95% size) instead of directional slide.

---

## 14. Footer

**Path**: `frontend/app/components/web/Footer.vue`

### Container

```html
<footer class="bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg
               border-t border-white/20 dark:border-gray-700/30">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
```

### 4-Column Grid

```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-8">
```

| Column | Span | Content |
|---|---|---|
| Brand | `col-span-2 md:col-span-1` | Logo (UIcon briefcase + "JobVault"), tagline |
| Product | 1 col | Features (anchor), FAQ |
| Company | 1 col | About, Contact |
| Legal | 1 col | Privacy Policy, Terms & Conditions |

### Link Styling

```
text-sm text-muted hover:text-highlighted transition-colors
```

Column headers: `text-sm font-semibold text-highlighted mb-4`

### Social Icons Row

```html
<div class="flex gap-4 justify-center mt-10">
  <a v-for="social in socialLinks" :key="social.label" :href="social.href"
    class="flex size-10 items-center justify-center rounded-full
           text-muted hover:text-highlighted hover:bg-elevated
           transition-all duration-200">
    <UIcon :name="social.icon" class="size-5" />
  </a>
</div>
```

### Copyright Bar

```html
<div class="border-t border-default/50 pt-6 mt-8 text-center">
  <p class="text-sm text-muted">&copy; {{ currentYear }} JobVault. All rights reserved.</p>
</div>
```

### Data

See [Section 18 — Footer Links](#footer-links).

---

## 15. Scroll Reveal System

**Path**: `frontend/app/composables/useScrollReveal.ts`

### API

```ts
const { reveal, revealStagger } = useScrollReveal();
```

#### `reveal(el, options?)`

Animates a single element when it enters the viewport.

- `el`: `HTMLElement | string` (CSS selector)
- `options`:
  - `direction`: `'up' | 'down' | 'left' | 'right'` (default: `'up'`)
  - `delay`: number in seconds (default: `0`)
  - `duration`: number in seconds (default: `0.8`)
  - `distance`: number in pixels (default: `30`)
  - `scale`: number (e.g. `0.95`) — if set, uses scale instead of translate

#### `revealStagger(selector, options?)`

Animates multiple elements with sequential delay.

- `selector`: CSS selector string (e.g. `'.feature-card'`)
- Additional option: `stagger`: delay increment per element in seconds (default: `0.1`)

### Mechanism

1. Creates one `IntersectionObserver` with `threshold: 0.1`
2. For each element: adds `scroll-reveal` class + sets CSS custom properties
3. On intersection: adds `revealed` class + unobserves (one-shot)

### Direction → Transform Mapping

| Direction | `--reveal-transform` |
|---|---|
| `up` | `translateY(30px)` |
| `down` | `translateY(-30px)` |
| `left` | `translateX(30px)` |
| `right` | `translateX(-30px)` |
| (scale) | `scale(0.95)` |

### CSS Classes

```css
.scroll-reveal {
  opacity: 0;
  transform: var(--reveal-transform, translateY(30px));
  transition:
    opacity var(--reveal-duration, 0.8s) ease-out var(--reveal-delay, 0s),
    transform var(--reveal-duration, 0.8s) ease-out var(--reveal-delay, 0s);
}

.scroll-reveal.revealed {
  opacity: 1;
  transform: none;
}
```

### Landing Page Reveal Configuration

| Section | Selector | Direction | Duration | Delay | Stagger |
|---|---|---|---|---|---|
| Hero text | `#hero-text` | up | 1s | 0 | — |
| Hero mockup | `#hero-mockup` | right | 1s | 0.2s | — |
| Trust badges | `#trust-badges` | up | 0.6s | 0 | — |
| Feature cards | `.feature-card` | up | 0.8s | 0 | 0.1s |
| Step 1 | `#step-1` | left | 0.8s | 0 | — |
| Step 2 | `#step-2` | up | 0.8s | 0.15s | — |
| Step 3 | `#step-3` | right | 0.8s | 0.3s | — |
| Testimonials | `.testimonial-card` | up | 0.8s | 0 | 0.1s |
| Extension promo | `#extension-promo` | up | 0.8s | 0 | — |
| Final CTA | `#final-cta` | scale(0.95) | 0.8s | 0 | — |

---

## 16. ButtonWithIcon Component

**Path**: `frontend/app/components/ui/ButtonWithIcon.vue`

### Props

```ts
defineProps<{
  to?: string;
  label?: string;
}>();
```

Default label: `'Get Started Free'`

### Template

```vue
<NuxtLink
  :to="to"
  class="btn-icon-slide group relative inline-flex h-12 cursor-pointer items-center
         overflow-hidden rounded-full p-1 ps-6 pe-14 text-sm font-medium text-white
         transition-all duration-500 hover:ps-14 hover:pe-6"
>
  <span class="relative z-10 transition-all duration-500">
    {{ label ?? 'Get Started Free' }}
  </span>
  <div
    class="absolute right-1 flex size-10 items-center justify-center rounded-full
           bg-white text-gray-900 transition-all duration-500
           group-hover:right-[calc(100%-44px)] group-hover:rotate-45
           dark:bg-gray-900 dark:text-white"
  >
    <UIcon name="i-lucide-arrow-up-right" class="size-4" />
  </div>
</NuxtLink>
```

### Animation

1. **Default state**: Text on left (`ps-6 pe-14`), icon circle on right (`right-1`)
2. **Hover**: Text shifts right (`hover:ps-14 hover:pe-6`), icon circle slides to left (`group-hover:right-[calc(100%-44px)]`), icon rotates 45deg
3. All transitions: `duration-500`

### Icon Circle

- Size: 40x40 (`size-10`)
- Shape: `rounded-full`
- Light: `bg-white text-gray-900`
- Dark: `dark:bg-gray-900 dark:text-white`
- Icon: `i-lucide-arrow-up-right` (size-4, 16px)

### Button Background (CSS)

```css
.btn-icon-slide {
  background: linear-gradient(135deg, var(--ui-color-primary-600) 0%, var(--ui-color-primary-400) 100%);
  box-shadow: 0 4px 14px 0 rgba(91, 43, 238, 0.25);
}
.btn-icon-slide:hover {
  background: linear-gradient(135deg, var(--ui-color-primary-700) 0%, var(--ui-color-primary-500) 100%);
  box-shadow: 0 6px 20px 0 rgba(91, 43, 238, 0.35);
}
/* Dark: swaps to primary-500→400 (hover 600→500), shadow uses rgba(143, 92, 255, ...) */
```

---

## 17. All CSS — `main.css`

**Path**: `frontend/app/assets/css/main.css`

Complete file (417 lines):

```css
@import "tailwindcss";
@import "@nuxt/ui";

@theme {
  --font-sans: 'Manrope', system-ui, -apple-system, sans-serif;
}

html {
  scroll-behavior: smooth;
}

:root {
  --ui-radius: 0.75rem;
  --ui-color-primary-50: #f3eeff;
  --ui-color-primary-100: #e4d9ff;
  --ui-color-primary-200: #cdb8ff;
  --ui-color-primary-300: #ae8bff;
  --ui-color-primary-400: #8f5cff;
  --ui-color-primary-500: #7535ff;
  --ui-color-primary-600: #5b2bee;
  --ui-color-primary-700: #4f1fd4;
  --ui-color-primary-800: #421bab;
  --ui-color-primary-900: #37178a;
  --ui-color-primary-950: #200b5e;
  --ui-primary: var(--ui-color-primary-600);
}

.dark {
  --ui-primary: var(--ui-color-primary-400);
}

/* Auth page mesh gradient background */
.auth-bg {
  background-color: #f0ecf5;
  background-image:
    radial-gradient(ellipse at 70% 15%, rgba(91, 43, 238, 0.10) 0%, transparent 55%),
    radial-gradient(ellipse at 25% 85%, rgba(138, 107, 253, 0.08) 0%, transparent 55%),
    radial-gradient(ellipse at 90% 80%, rgba(91, 43, 238, 0.06) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 50%, rgba(200, 180, 255, 0.06) 0%, transparent 70%);
}

.dark .auth-bg {
  background-color: #151022;
  background-image:
    radial-gradient(at 0% 0%, rgba(91, 43, 238, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(124, 92, 252, 0.10) 0px, transparent 50%),
    radial-gradient(at 50% 50%, rgba(91, 43, 238, 0.05) 0px, transparent 50%);
}

/* Primary gradient button */
.btn-gradient {
  background: linear-gradient(135deg, var(--ui-color-primary-600) 0%, var(--ui-color-primary-400) 100%);
  color: white;
  box-shadow: 0 4px 14px 0 rgba(91, 43, 238, 0.25);
}

.btn-gradient:hover {
  background: linear-gradient(135deg, var(--ui-color-primary-700) 0%, var(--ui-color-primary-500) 100%);
  box-shadow: 0 6px 20px 0 rgba(91, 43, 238, 0.35);
}

.dark .btn-gradient {
  background: linear-gradient(135deg, var(--ui-color-primary-500) 0%, var(--ui-color-primary-400) 100%);
  box-shadow: 0 4px 14px 0 rgba(143, 92, 255, 0.3);
}

.dark .btn-gradient:hover {
  background: linear-gradient(135deg, var(--ui-color-primary-600) 0%, var(--ui-color-primary-500) 100%);
  box-shadow: 0 6px 20px 0 rgba(143, 92, 255, 0.4);
}

/* Animated icon-slide button (hero CTA) */
.btn-icon-slide {
  background: linear-gradient(135deg, var(--ui-color-primary-600) 0%, var(--ui-color-primary-400) 100%);
  box-shadow: 0 4px 14px 0 rgba(91, 43, 238, 0.25);
}

.btn-icon-slide:hover {
  background: linear-gradient(135deg, var(--ui-color-primary-700) 0%, var(--ui-color-primary-500) 100%);
  box-shadow: 0 6px 20px 0 rgba(91, 43, 238, 0.35);
}

.dark .btn-icon-slide {
  background: linear-gradient(135deg, var(--ui-color-primary-500) 0%, var(--ui-color-primary-400) 100%);
  box-shadow: 0 4px 14px 0 rgba(143, 92, 255, 0.3);
}

.dark .btn-icon-slide:hover {
  background: linear-gradient(135deg, var(--ui-color-primary-600) 0%, var(--ui-color-primary-500) 100%);
  box-shadow: 0 6px 20px 0 rgba(143, 92, 255, 0.4);
}

/* Kanban drag-and-drop ghost styles */
.kanban-ghost {
  opacity: 0.4;
  background: var(--ui-color-primary-50);
  border: 2px dashed var(--ui-color-primary-300);
  border-radius: 0.75rem;
}

.dark .kanban-ghost {
  background: var(--ui-color-primary-950);
  border-color: var(--ui-color-primary-700);
}

/* Hero grid background */
.hero-grid {
  background-image:
    linear-gradient(rgba(91, 43, 238, 0.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91, 43, 238, 0.5) 1px, transparent 1px);
  background-size: 64px 64px;
  opacity: 0.1;
  mask-image: radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%);
}

.dark .hero-grid {
  opacity: 0.15;
}

/* Animated glow lines */
.grid-glow-h {
  background: linear-gradient(90deg, transparent, rgba(91, 43, 238, 0.4), transparent);
  animation: grid-glow-horizontal 8s linear infinite;
}

.grid-glow-v {
  background: linear-gradient(180deg, transparent, rgba(91, 43, 238, 0.4), transparent);
  animation: grid-glow-vertical 8s linear infinite;
}

.dark .grid-glow-h {
  background: linear-gradient(90deg, transparent, rgba(138, 107, 253, 0.5), transparent);
}

.dark .grid-glow-v {
  background: linear-gradient(180deg, transparent, rgba(138, 107, 253, 0.5), transparent);
}

@keyframes grid-glow-horizontal {
  0% { transform: translateX(-100%); opacity: 0; }
  5% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateX(calc(100vw + 100%)); opacity: 0; }
}

@keyframes grid-glow-vertical {
  0% { transform: translateY(-100%); opacity: 0; }
  5% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(calc(100vh + 100%)); opacity: 0; }
}

.dark .hero-bg {
  --arc-color: rgba(138, 107, 253, 0.12);
}

/* Floating pill navbar */
.navbar-pill {
  max-width: 80rem;
  height: 4rem;
  margin-top: 0;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 0;
  border-color: transparent;
  background: transparent;
  backdrop-filter: none;
  box-shadow: none;
  transition: max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              margin-top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              border-radius 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.3s ease,
              background 0.3s ease,
              backdrop-filter 0.3s ease,
              box-shadow 0.3s ease;
}

@media (min-width: 640px) {
  .navbar-pill { padding-left: 1.5rem; padding-right: 1.5rem; }
}

@media (min-width: 1024px) {
  .navbar-pill { padding-left: 2rem; padding-right: 2rem; }
}

.navbar-pill.is-scrolled {
  max-width: 64rem;
  height: 3.5rem;
  margin-top: 0.75rem;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
  border-radius: 9999px;
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px) saturate(1.8);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04),
              inset 0 0 0 0.5px rgba(255, 255, 255, 0.4);
}

.dark .navbar-pill.is-scrolled {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(17, 24, 39, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1),
              inset 0 0 0 0.5px rgba(255, 255, 255, 0.05);
}

/* Floating orb animations */
.orb-float-1 { animation: orb-drift-1 23s linear infinite; }
.orb-float-2 { animation: orb-drift-2 29s linear infinite; }
.orb-float-3 { animation: orb-drift-3 26s linear infinite; }
.orb-float-4 { animation: orb-drift-4 31s linear infinite; }

@keyframes orb-drift-1 {
  0%   { transform: translate(0, 0) scale(1); }
  8%   { transform: translate(18px, -12px) scale(1.04); }
  18%  { transform: translate(30px, 6px) scale(1.02); }
  28%  { transform: translate(10px, 24px) scale(1.07); }
  38%  { transform: translate(-14px, 30px) scale(1.03); }
  48%  { transform: translate(-28px, 10px) scale(0.96); }
  58%  { transform: translate(-22px, -16px) scale(1.01); }
  68%  { transform: translate(-6px, -28px) scale(1.06); }
  78%  { transform: translate(16px, -22px) scale(0.97); }
  88%  { transform: translate(26px, -6px) scale(1.03); }
  100% { transform: translate(0, 0) scale(1); }
}

@keyframes orb-drift-2 {
  0%   { transform: translate(0, 0) scale(1); }
  7%   { transform: translate(-20px, 14px) scale(1.06); }
  16%  { transform: translate(-10px, 32px) scale(0.97); }
  26%  { transform: translate(16px, 26px) scale(1.04); }
  36%  { transform: translate(32px, 8px) scale(1.08); }
  46%  { transform: translate(24px, -18px) scale(1.01); }
  56%  { transform: translate(4px, -30px) scale(0.95); }
  66%  { transform: translate(-18px, -20px) scale(1.05); }
  76%  { transform: translate(-30px, -4px) scale(1.02); }
  87%  { transform: translate(-16px, 10px) scale(0.98); }
  100% { transform: translate(0, 0) scale(1); }
}

@keyframes orb-drift-3 {
  0%   { transform: translate(0, 0) scale(1); }
  9%   { transform: translate(22px, 16px) scale(0.96); }
  19%  { transform: translate(34px, -4px) scale(1.05); }
  29%  { transform: translate(18px, -26px) scale(1.02); }
  39%  { transform: translate(-8px, -32px) scale(1.07); }
  49%  { transform: translate(-26px, -14px) scale(0.98); }
  59%  { transform: translate(-32px, 10px) scale(1.04); }
  69%  { transform: translate(-14px, 28px) scale(1.01); }
  79%  { transform: translate(10px, 22px) scale(0.97); }
  90%  { transform: translate(18px, 8px) scale(1.03); }
  100% { transform: translate(0, 0) scale(1); }
}

@keyframes orb-drift-4 {
  0%   { transform: translate(0, 0) scale(1); }
  6%   { transform: translate(-14px, -22px) scale(1.05); }
  15%  { transform: translate(6px, -34px) scale(0.97); }
  25%  { transform: translate(24px, -18px) scale(1.06); }
  35%  { transform: translate(30px, 8px) scale(0.98); }
  45%  { transform: translate(16px, 28px) scale(1.04); }
  55%  { transform: translate(-10px, 32px) scale(1.01); }
  65%  { transform: translate(-28px, 16px) scale(1.07); }
  75%  { transform: translate(-32px, -6px) scale(0.96); }
  86%  { transform: translate(-18px, -14px) scale(1.03); }
  100% { transform: translate(0, 0) scale(1); }
}

/* Scroll reveal animations */
.scroll-reveal {
  opacity: 0;
  transform: var(--reveal-transform, translateY(30px));
  transition:
    opacity var(--reveal-duration, 0.8s) ease-out var(--reveal-delay, 0s),
    transform var(--reveal-duration, 0.8s) ease-out var(--reveal-delay, 0s);
}

.scroll-reveal.revealed {
  opacity: 1;
  transform: none;
}

.kanban-drag {
  opacity: 0.9;
  transform: rotate(2deg);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

/* Background Gradient Animation */
.gradient-bg {
  --blob-color-1: 205, 184, 255;
  --blob-color-2: 228, 217, 255;
  --blob-color-3: 214, 200, 255;
  --blob-color-4: 195, 170, 255;
  --blob-color-5: 235, 228, 255;
  --blob-color-interactive: 235, 228, 255;
  --blob-size: 65%;
  --blob-opacity: 0.6;
  --blob-blend: normal;
  position: relative;
  overflow-x: clip;
  background: transparent;
}

.dark .gradient-bg {
  --blob-color-1: 91, 43, 238;
  --blob-color-2: 117, 53, 255;
  --blob-color-3: 79, 31, 212;
  --blob-color-4: 143, 92, 255;
  --blob-color-5: 174, 139, 255;
  --blob-color-interactive: 143, 92, 255;
  --blob-opacity: 0.4;
  --blob-blend: normal;
}

.gradients-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.gradient-blob {
  position: absolute;
  width: var(--blob-size);
  height: var(--blob-size);
  border-radius: 50%;
  mix-blend-mode: var(--blob-blend);
  opacity: var(--blob-opacity);
  top: calc(50% - var(--blob-size) / 2);
  left: calc(50% - var(--blob-size) / 2);
}

.gradient-blob-1 {
  background: radial-gradient(circle at center, rgba(var(--blob-color-1), 0.8) 0%, rgba(var(--blob-color-1), 0) 50%);
  transform-origin: center center;
  animation: moveVertical 30s ease infinite;
}

.gradient-blob-2 {
  background: radial-gradient(circle at center, rgba(var(--blob-color-2), 0.8) 0%, rgba(var(--blob-color-2), 0) 50%);
  transform-origin: calc(50% - 400px);
  animation: moveInCircle 20s reverse infinite;
}

.gradient-blob-3 {
  background: radial-gradient(circle at center, rgba(var(--blob-color-3), 0.8) 0%, rgba(var(--blob-color-3), 0) 50%);
  transform-origin: calc(50% + 400px);
  animation: moveInCircle 40s linear infinite;
}

.gradient-blob-4 {
  background: radial-gradient(circle at center, rgba(var(--blob-color-4), 0.8) 0%, rgba(var(--blob-color-4), 0) 50%);
  transform-origin: calc(50% - 200px);
  animation: moveHorizontal 40s ease infinite;
  opacity: calc(var(--blob-opacity) * 0.875);
}

.gradient-blob-5 {
  background: radial-gradient(circle at center, rgba(var(--blob-color-5), 0.8) 0%, rgba(var(--blob-color-5), 0) 50%);
  transform-origin: calc(50% - 800px) calc(50% + 800px);
  animation: moveInCircle 35s linear infinite;
}

.gradient-blob-interactive {
  background: radial-gradient(circle at center, rgba(var(--blob-color-interactive), 0.6) 0%, rgba(var(--blob-color-interactive), 0) 50%);
  opacity: calc(var(--blob-opacity) * 0.7);
  top: -25%;
  left: -25%;
  width: 50%;
  height: 50%;
  will-change: transform;
}

@keyframes moveVertical {
  0%   { transform: translateY(-50%); }
  50%  { transform: translateY(50%); }
  100% { transform: translateY(-50%); }
}

@keyframes moveInCircle {
  0%   { transform: rotate(0deg); }
  50%  { transform: rotate(180deg); }
  100% { transform: rotate(360deg); }
}

@keyframes moveHorizontal {
  0%   { transform: translateX(-50%) translateY(-10%); }
  50%  { transform: translateX(50%) translateY(10%); }
  100% { transform: translateX(-50%) translateY(-10%); }
}

@media (prefers-reduced-motion: reduce) {
  .gradient-blob { animation: none !important; }
  .gradient-blob-interactive { display: none; }
}
```

---

## 18. All Data

### Features Array

```ts
const features = [
  {
    icon: 'i-lucide-columns-3',
    title: 'Kanban Pipeline',
    description: 'Drag-and-drop your applications through stages from Wishlist to Offer.',
  },
  {
    icon: 'i-lucide-camera',
    title: 'Job Snapshot',
    description: 'Preserve job descriptions before they expire. Never lose a posting again.',
  },
  {
    icon: 'i-lucide-ghost',
    title: 'Ghost Meter',
    description: 'Know exactly which employers have gone silent with automatic ghost detection.',
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

### Steps Array

```ts
const steps = [
  {
    number: 1,
    icon: 'i-lucide-link',
    title: 'Add a Job',
    description: 'Paste a URL or add manually. We capture and preserve the full job description.',
  },
  {
    number: 2,
    icon: 'i-lucide-kanban',
    title: 'Track Your Pipeline',
    description: 'Drag applications across your Kanban board. See stats, ghost alerts, and timelines.',
  },
  {
    number: 3,
    icon: 'i-lucide-trophy',
    title: 'Land the Role',
    description: 'Generate AI cover letters, set reminders, and never let an opportunity slip away.',
  },
];
```

### Testimonials Array

```ts
const testimonials = [
  {
    stars: 5,
    quote: 'JobVault completely changed how I manage my job search. I went from chaos to 3 offers in a month.',
    name: 'Sarah Chen',
    title: 'Software Engineer',
    initials: 'SC',
  },
  {
    stars: 5,
    quote: 'The ghost detection feature is genius. I finally know which companies are ghosting me.',
    name: 'Marcus Johnson',
    title: 'Product Manager',
    initials: 'MJ',
  },
  {
    stars: 5,
    quote: 'AI cover letters saved me hours every week. Each one was perfectly tailored to the job.',
    name: 'Priya Patel',
    title: 'UX Designer',
    initials: 'PP',
  },
];
```

### Trust Badges

```ts
const trustBadges = [
  { icon: 'i-lucide-code-2', label: 'Built with Vue' },
  { icon: 'i-lucide-github', label: 'Open Source' },
  { icon: 'i-lucide-shield-check', label: 'GDPR Compliant' },
  { icon: 'i-lucide-heart', label: '100% Free' },
];
```

### Nav Links

Dynamic based on current route:

```ts
// On homepage (/):
[
  { label: 'Features', href: '/#features', isAnchor: true },
  { label: 'FAQ', to: '/web/faq', isAnchor: false },
  { label: 'About', to: '/web/about', isAnchor: false },
  { label: 'Contact', to: '/web/contact', isAnchor: false },
]

// On other pages:
[
  { label: 'FAQ', to: '/web/faq', isAnchor: false },
  { label: 'About', to: '/web/about', isAnchor: false },
  { label: 'Contact', to: '/web/contact', isAnchor: false },
]
```

### Footer Links

```ts
const productLinks = [
  { label: 'Features', href: '/#features', isAnchor: true },
  { label: 'FAQ', to: '/web/faq' },
];

const companyLinks = [
  { label: 'About', to: '/web/about' },
  { label: 'Contact', to: '/web/contact' },
];

const legalLinks = [
  { label: 'Privacy Policy', to: '/web/privacy' },
  { label: 'Terms & Conditions', to: '/web/terms' },
];

const socialLinks = [
  { label: 'Facebook', icon: 'i-simple-icons-facebook', href: '#' },
  { label: 'LinkedIn', icon: 'i-simple-icons-linkedin', href: '#' },
  { label: 'Instagram', icon: 'i-simple-icons-instagram', href: '#' },
  { label: 'YouTube', icon: 'i-simple-icons-youtube', href: '#' },
];
```

### SEO Meta

```ts
useSeoMeta({
  title: 'JobVault - Ghost-Proof Your Job Search',
  description: 'Track job applications, preserve job postings, and generate AI cover letters. Never lose track of your job search again.',
  ogTitle: 'JobVault - Ghost-Proof Your Job Search',
  ogDescription: 'Track job applications, preserve job postings, and generate AI cover letters. Never lose track of your job search again.',
});
```

### Page Meta

```ts
definePageMeta({
  layout: 'web',
});
```

---

## Appendix: Section Order on Page

```
1. [HERO]                    — hero-bg section (outside gradient wrapper)
   ├── Grid pattern
   ├── Glow lines (3H + 3V)
   ├── Arc SVGs (3 circles)
   ├── Floating orbs (4)
   └── Content: H1 + subtitle + CTAs | Dashboard mockup

2. [GRADIENT WRAPPER START]  — <UiBackgroundGradientAnimation>
   ├── [TRUST BADGES]        — icon + label row, bordered top/bottom
   ├── [FEATURES]            — 6 glassmorphic cards, 3-col grid
   ├── [HOW IT WORKS]        — 3 steps, connecting line, numbered circles
   ├── [TESTIMONIALS]        — 3 cards, stars, quotes, avatars
   ├── [EXTENSION PROMO]     — badge + heading + Chrome/Briefcase icons
   └── [FINAL CTA]           — centered glassmorphic card + ButtonWithIcon
3. [GRADIENT WRAPPER END]

4. [FOOTER]                  — 4-column grid, social icons, copyright (part of layout)
```

---

## Appendix: Nuxt UI Components Used

| Component | Where Used | Key Props |
|---|---|---|
| `UIcon` | Everywhere | `name`, `class` (size-*, text-*) |
| `UButton` | Navbar, hero | `variant`, `size`, `icon`, `label`, `to`, `color`, `trailing`, `block` |
| `USlideover` | Mobile navbar | `v-model:open`, `side="right"`, `title`, `:ui` |
| `USeparator` | Testimonials, mobile menu | `class` |
| `UBadge` | Extension promo | `color="primary"`, `variant="subtle"` |
| `NuxtLink` | Logo, nav links, ButtonWithIcon, footer | `to` |

## Appendix: `app.config.ts` Theme

```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'violet',
      secondary: 'indigo',
      success: 'emerald',
      info: 'sky',
      warning: 'amber',
      error: 'rose',
      neutral: 'zinc',
    },
    card: {
      slots: { root: 'rounded-2xl shadow-lg' },
    },
    input: {
      slots: {
        root: 'w-full !rounded-none !border-0 border-b border-gray-300 dark:border-gray-600 !bg-transparent !ring-0 !shadow-none focus-within:border-[var(--ui-primary)] transition-colors',
        base: '!rounded-none !bg-transparent',
        leadingIcon: 'shrink-0 text-dimmed/60',
        trailingIcon: 'shrink-0 text-dimmed/60',
      },
      variants: {
        variant: {
          outline: '!ring-0 !shadow-none !bg-transparent !border-0',
          soft: '!ring-0 !shadow-none !bg-transparent !border-0',
          subtle: '!ring-0 !shadow-none !bg-transparent !border-0',
          ghost: '!ring-0 !shadow-none !bg-transparent !border-0',
          none: '!ring-0 !shadow-none !bg-transparent !border-0',
        },
      },
      compoundVariants: [],
      defaultVariants: { variant: 'none' as const, size: 'xl' as const },
    },
    button: {
      slots: {
        base: [
          'rounded-full font-semibold inline-flex items-center justify-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75',
          'transition-all',
        ],
      },
      defaultVariants: { color: 'primary' as const, variant: 'solid' as const },
    },
    formField: {
      slots: { label: 'text-xs font-semibold uppercase tracking-wider text-highlighted' },
    },
  },
})
```
