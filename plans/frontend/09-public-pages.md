# Frontend Plan 09 — Public Core (WebNavbar + WebFooter + Landing Page)

## Overview

Build the core public-facing components and landing page for JobVault. This includes the shared WebNavbar and WebFooter components used by all public pages, plus the full landing page with 7 sections, glassmorphism styling, and basic GSAP scroll animations.

The route restructuring (moving authenticated pages to `/app/*`, auth to `/app/auth/*`, middleware updated) has already been completed. Stub components and placeholder pages exist.

---

## Dependencies

- FE-01 (Project Setup) — complete
- Route restructuring — complete

### New Dependencies

```
gsap — Animation engine (free core + ScrollTrigger plugin)
```

SVG illustrations: download from unDraw into `frontend/app/assets/images/` (no npm dep).

---

## File Structure

```
frontend/app/
├── assets/
│   ├── css/main.css                    # Edit: add hero-bg gradient, animation base classes
│   └── images/                         # Create: SVG illustrations from unDraw
│       └── hero-job-search.svg
├── composables/
│   └── useScrollReveal.ts              # Create: GSAP ScrollTrigger wrapper
├── components/
│   └── web/
│       ├── Navbar.vue                  # Replace stub: full glassmorphism navbar
│       └── Footer.vue                  # Replace stub: 4-column marketing footer
├── layouts/
│   └── web.vue                         # Edit: add pt for fixed navbar
├── pages/
│   └── index.vue                       # Replace placeholder: full landing page
```

---

## Components

### 1. `components/web/Navbar.vue` — `<WebNavbar />`

Public-facing navbar, visually distinct from the authenticated `LayoutAppHeader`.

#### Behavior

- **Position**: `fixed top-0 left-0 right-0 z-50` with `transition-all duration-300`
- **Scroll detection**: `onMounted` + `scroll` event listener with `ref<boolean>` (`isScrolled`)
  - Threshold: `window.scrollY > 10`
  - Cleanup in `onUnmounted`
- **Base state** (at top): `bg-transparent border-b border-transparent`
- **Scrolled state**: `bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 shadow-sm`
- **Auth-aware**: Uses `useAuth()` to check `isAuthenticated` (client-only via `onMounted` guard or `import.meta.client`)

#### Desktop Layout (>= 1024px)

```
[Briefcase + "JobVault"]  [Features*] [FAQ] [About] [Contact]  [Login] [Sign Up] | [ColorMode]
```

- **Logo**: `NuxtLink to="/"` with `i-lucide-briefcase` icon + "JobVault" text
- **Nav links** (hidden on mobile):
  - "Features" — `<a href="/#features">` (only shown on `/` route via `useRoute()`)
  - "FAQ" — `NuxtLink to="/web/faq"`
  - "About" — `NuxtLink to="/web/about"`
  - "Contact" — `NuxtLink to="/web/contact"`
  - Style: `text-sm font-medium text-muted hover:text-highlighted transition-colors`
- **Right side** (desktop):
  - If authenticated: `UButton to="/app/dashboard"` with `i-lucide-layout-dashboard` icon, label "Dashboard"
  - If not authenticated: "Login" (`UButton variant="ghost"` to `/app/auth/login`) + "Sign Up" (`UButton` to `/app/auth/register`)
  - Color mode toggle: `UButton variant="ghost"` with `i-lucide-sun`/`i-lucide-moon`, `useColorMode()`

#### Mobile (< 1024px)

- Hamburger `UButton` icon `i-lucide-menu`
- Opens `USlideover` (from right, `side="right"`) with `v-model:open`:
  - Close button at top right
  - All nav links stacked vertically (`space-y-2`, full-width buttons with `variant="ghost"`)
  - `UDivider`
  - Auth buttons (full-width, stacked)
  - Color mode toggle at bottom

#### Scroll listener pattern

```typescript
const isScrolled = ref(false);

function onScroll() {
  isScrolled.value = window.scrollY > 10;
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});
```

#### Glassmorphism classes

```html
<header
  :class="[
    'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
    isScrolled
      ? 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 shadow-sm'
      : 'bg-transparent border-b border-transparent'
  ]"
>
```

**Reuse patterns from:** `AppHeader.vue` (glassmorphism header, color mode toggle, responsive hidden/shown)

---

### 2. `components/web/Footer.vue` — `<WebFooter />`

Multi-column marketing footer.

#### Layout (4 columns on desktop, stacked on mobile)

```
Column 1 (Brand):         Column 2 (Product):     Column 3 (Company):    Column 4 (Legal):
  [Briefcase icon]          Features                 About                  Privacy Policy
  JobVault                  FAQ                      Contact                Terms & Conditions
  "Ghost-Proof Your
   Job Search"

─────────────────────────────────────────────────────────────────────────────────────
Social icons: [Facebook] [LinkedIn] [Instagram] [YouTube]           (all href="#")
─────────────────────────────────────────────────────────────────────────────────────
© 2026 JobVault. All rights reserved.
```

#### Grid

- Desktop: `grid grid-cols-2 md:grid-cols-4 gap-8`
- Each link column: `<h3 class="text-sm font-semibold text-highlighted mb-4">` heading + `<ul class="space-y-2">` of `NuxtLink` items
- Social icons row: `flex gap-4 justify-center` with `UIcon` for each platform
  - Icons: `i-simple-icons-facebook`, `i-simple-icons-linkedin`, `i-simple-icons-instagram`, `i-simple-icons-youtube`
  - All link to `#` for now (placeholder)
- Bottom bar: `border-t border-default pt-4 mt-8` centered text
- Glassmorphism: `bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg border-t border-white/20 dark:border-gray-700/30`

#### Links

| Column   | Label              | Route            |
|----------|--------------------|------------------|
| Product  | Features           | `/#features`     |
| Product  | FAQ                | `/web/faq`       |
| Company  | About              | `/web/about`     |
| Company  | Contact            | `/web/contact`   |
| Legal    | Privacy Policy     | `/web/privacy`   |
| Legal    | Terms & Conditions | `/web/terms`     |

---

### 3. `composables/useScrollReveal.ts` — GSAP ScrollTrigger Wrapper

Thin composable wrapping GSAP + ScrollTrigger for scroll-triggered animations.

```typescript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register plugin once
if (import.meta.client) {
  gsap.registerPlugin(ScrollTrigger);
}

interface RevealOptions {
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  distance?: number;
  scale?: number; // for scale-up animations
}

export function useScrollReveal() {
  const triggers: ScrollTrigger[] = [];

  function reveal(el: HTMLElement | string, options: RevealOptions = {}) {
    if (!import.meta.client) return;

    const { direction = 'up', delay = 0, duration = 0.8, distance = 30, scale } = options;

    const fromVars: gsap.TweenVars = {
      opacity: 0,
      duration,
      delay,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
        onEnter: (self) => triggers.push(self),
      },
    };

    // Direction-based transform
    if (scale) {
      fromVars.scale = scale;
    } else {
      switch (direction) {
        case 'up': fromVars.y = distance; break;
        case 'down': fromVars.y = -distance; break;
        case 'left': fromVars.x = distance; break;
        case 'right': fromVars.x = -distance; break;
      }
    }

    gsap.from(el, fromVars);
  }

  function revealStagger(els: string, options: RevealOptions & { stagger?: number } = {}) {
    if (!import.meta.client) return;

    const { direction = 'up', delay = 0, duration = 0.8, distance = 30, stagger = 0.1 } = options;

    const fromVars: gsap.TweenVars = { ... }; // Same pattern with stagger
    gsap.from(els, fromVars);
  }

  // Cleanup on unmount
  onUnmounted(() => {
    triggers.forEach(t => t.kill());
  });

  return { reveal, revealStagger };
}
```

**Basic animations for Plan 09:**
- Sections: fade-up on viewport entry
- Feature cards: fade-up with stagger delay (0.1s between cards)
- How-it-works steps: fade-in from left/right alternating
- CTA: scale-up (from 0.9)
- Testimonials: fade-up with stagger

---

## Landing Page (`pages/index.vue`)

### 7 Sections (top to bottom)

#### a) Hero Section

- **Layout**: Split — left text (`lg:w-1/2`) + right illustration (`lg:w-1/2`)
- **Left side**:
  - Heading: "Ghost-Proof Your Job Search" (`text-4xl sm:text-5xl lg:text-6xl font-bold text-highlighted leading-tight`)
  - Subtitle: "Track applications, preserve job postings before they vanish, and generate AI-powered cover letters — all in one place." (`text-lg sm:text-xl text-muted mt-6`)
  - CTAs (mt-8, flex gap-4):
    - "Get Started Free" → `UButton to="/app/auth/register" class="btn-gradient" size="xl"`
    - "Learn More" → `UButton variant="outline" size="xl"` with `href="#features"`
- **Right side**: SVG illustration from unDraw (job/work themed), `max-w-lg mx-auto`
- **Background**: `hero-bg` CSS class (gradient mesh, extends auth-bg pattern)
- **Floating elements**: 3-4 glass orbs with icons (like auth.vue):
  ```html
  <div class="pointer-events-none absolute right-[8%] top-[10%] flex size-16 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
    <UIcon name="i-lucide-briefcase" class="size-7 text-primary/40" />
  </div>
  ```
- **Animation**: Hero text fades in (up), illustration slides in from right
- **Section classes**: `relative overflow-hidden py-20 sm:py-28 lg:py-36`

#### b) Trust Badges

- Row of 4 items below hero
- Content: "Built with Vue" (`i-lucide-code-2`), "Open Source" (`i-lucide-github`), "GDPR Compliant" (`i-lucide-shield-check`), "100% Free" (`i-lucide-heart`)
- Style: `flex flex-wrap justify-center gap-6 sm:gap-12`, each item is `flex items-center gap-2 text-sm text-muted`
- Section: `py-8 border-y border-default/50`
- Animation: simple fade-in

#### c) Features Section (`id="features"`)

- Heading: "Everything you need to land your next role" (`text-3xl sm:text-4xl font-bold text-highlighted text-center mb-4`)
- Subtext: "From tracking applications to generating cover letters, JobVault has you covered." (`text-lg text-muted text-center max-w-2xl mx-auto mb-12`)
- 6 glass cards in `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`:

| # | Icon | Title | Description |
|---|------|-------|-------------|
| 1 | `i-lucide-columns-3` | Kanban Pipeline | Drag-and-drop your applications through stages from Wishlist to Offer. |
| 2 | `i-lucide-camera` | Job Snapshot | Preserve job descriptions before they expire. Never lose a posting again. |
| 3 | `i-lucide-ghost` | Ghost Meter | Know exactly which employers have gone silent with automatic ghost detection. |
| 4 | `i-lucide-sparkles` | AI Cover Letters | Generate tailored cover letters using your resume and the job description. |
| 5 | `i-lucide-git-branch` | Timeline Tracking | Log every interaction — interviews, follow-ups, offers — in a visual timeline. |
| 6 | `i-lucide-bell-ring` | Smart Reminders | Never miss a follow-up. Set reminders tied to specific applications. |

- Card style: glass card from `kanban/Card.vue` pattern with hover lift:
  ```
  rounded-2xl border border-white/20 dark:border-gray-700/30
  bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg p-6
  shadow-sm shadow-black/5 transition-all duration-200
  hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10
  ```
- Icon: Wrapped in a `size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4`
- Animation: fade-up with 0.1s stagger per card

#### d) How It Works Section

- Heading: "How it works"
- 3 numbered steps in `grid grid-cols-1 md:grid-cols-3 gap-8`:
  1. "Add a Job" (`i-lucide-link`) — "Paste a URL or add manually. We capture and preserve the full job description."
  2. "Track Your Pipeline" (`i-lucide-kanban`) — "Drag applications across your Kanban board. See stats, ghost alerts, and timelines."
  3. "Land the Role" (`i-lucide-trophy`) — "Generate AI cover letters, set reminders, and never let an opportunity slip away."
- Visual: Each step has a numbered circle (`size-10 rounded-full bg-primary text-white font-bold flex items-center justify-center`)
- Connecting line between steps (desktop only): `hidden md:block absolute top-5 left-0 right-0 h-0.5 bg-primary/20` (behind the circles)
- Animation: steps fade in from left/right alternating (step 1 from left, step 2 from up, step 3 from right)

#### e) Testimonials Section

- Heading: "Loved by job seekers"
- 3 glass cards in `grid grid-cols-1 md:grid-cols-3 gap-6`:

| # | Stars | Quote | Name | Title |
|---|-------|-------|------|-------|
| 1 | 5 | "JobVault completely changed how I manage my job search. I went from chaos to 3 offers in a month." | Sarah Chen | Software Engineer |
| 2 | 5 | "The ghost detection feature is genius. I finally know which companies are ghosting me." | Marcus Johnson | Product Manager |
| 3 | 5 | "AI cover letters saved me hours every week. Each one was perfectly tailored to the job." | Priya Patel | UX Designer |

- Card structure:
  - 5 star icons (`i-lucide-star` with `text-amber-400 fill-amber-400`)
  - Quote in `text-muted italic`
  - Divider
  - Avatar circle: `size-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary` (initials)
  - Name (`text-sm font-semibold text-highlighted`) + Title (`text-xs text-muted`)
- Animation: fade-up with stagger

#### f) Chrome Extension Promo Section

- Heading: "Coming Soon: Save Jobs from Anywhere"
- Subtext: "Our Chrome extension lets you save jobs directly from LinkedIn, Indeed, and any job board with a single click."
- Layout: centered, with a large icon composition or illustration
- Badge: `UBadge color="primary" variant="subtle"` with label "Coming Soon"
- Icon: `i-lucide-chrome` large (or a composition of browser + save icons)
- Animation: fade-up

#### g) Final CTA Section

- Heading: "Ready to ghost-proof your job search?"
- Subtext: "Join thousands of job seekers who never lose track of an application."
- CTA: `UButton to="/app/auth/register" size="xl" class="btn-gradient"` label "Get Started — It's Free"
- Background: glass card or subtle gradient panel
- Section classes: `py-16 sm:py-24 text-center`
- Animation: scale-up (from 0.95)

---

## CSS Additions (`assets/css/main.css`)

```css
/* Hero background gradient */
.hero-bg {
  background-image:
    radial-gradient(ellipse at 70% 15%, rgba(91, 43, 238, 0.08) 0%, transparent 55%),
    radial-gradient(ellipse at 25% 85%, rgba(138, 107, 253, 0.06) 0%, transparent 55%);
}
```

---

## Layout Update (`layouts/web.vue`)

Add top padding to main content to account for fixed navbar height:
- The `<main>` or slot wrapper needs `pt-16` (matching the h-16 navbar)
- The landing page hero handles its own spacing (`py-20 sm:py-28 lg:py-36`)

---

## Responsive Breakpoints

| Breakpoint | WebNavbar           | Feature Grid | How It Works | Footer   | Testimonials |
|------------|---------------------|--------------|--------------|----------|--------------|
| < 640px    | Hamburger menu      | 1 column     | 1 column     | 1 column | 1 column     |
| 640-1023px | Hamburger menu      | 2 columns    | 1 column     | 2 columns| 1 column     |
| >= 1024px  | Full horizontal nav | 3 columns    | 3 columns    | 4 columns| 3 columns    |

---

## Accessibility

- All interactive elements have proper `aria-label` attributes
- Mobile menu toggle has `aria-expanded` bound to open state
- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- Color contrast meets WCAG AA for all text on glass backgrounds
- Skip-to-content link (nice to have)

---

## Implementation Order

1. Install `gsap` dependency
2. Create `composables/useScrollReveal.ts`
3. Add CSS classes to `assets/css/main.css`
4. Build `components/web/Navbar.vue` (replace stub)
5. Build `components/web/Footer.vue` (replace stub)
6. Update `layouts/web.vue` for fixed navbar padding
7. Download SVG illustration(s) into `assets/images/`
8. Build `pages/index.vue` — landing page with all 7 sections + basic animations

---

## Acceptance Criteria

- [ ] WebNavbar is fixed, transparent at top, frosted glass on scroll
- [ ] WebNavbar shows correct auth buttons (Login/Sign Up) when not authenticated
- [ ] WebNavbar shows "Dashboard" button when authenticated
- [ ] WebNavbar mobile hamburger opens slide-out drawer with all links
- [ ] WebNavbar color mode toggle works
- [ ] WebFooter displays all 4 columns and links correctly
- [ ] WebFooter social icons are visible with placeholder links
- [ ] WebFooter is responsive (4 cols → 2 cols → 1 col)
- [ ] Landing page has all 7 sections: hero, trust badges, features, how-it-works, testimonials, chrome extension, CTA
- [ ] Landing page hero has split layout with SVG illustration
- [ ] Landing page hero has floating glass decorative elements
- [ ] Landing page hero has gradient mesh background
- [ ] Landing page trust badges row displays below hero
- [ ] Landing page features grid has 6 glass cards with hover lift
- [ ] Landing page how-it-works shows 3 numbered steps
- [ ] Landing page testimonials show 3 cards with stars
- [ ] Landing page CTA links to `/app/auth/register`
- [ ] Features section anchor link (`#features`) works from navbar
- [ ] Basic scroll animations work (fade-up, stagger, scale-up)
- [ ] All sections render correctly in light and dark modes
- [ ] All sections are responsive (mobile, tablet, desktop)
- [ ] No auth middleware blocks access to the landing page
- [ ] Smooth scrolling works for anchor links
- [ ] SSR works: view page source shows rendered HTML
- [ ] `useSeoMeta()` renders correct meta tags
