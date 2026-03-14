<script setup lang="ts">
definePageMeta({
  layout: 'web',
});

useSeoMeta({
  title: 'JobVault - Ghost-Proof Your Job Search',
  description: 'Track job applications, preserve job postings, and generate AI cover letters. Never lose track of your job search again.',
  ogTitle: 'JobVault - Ghost-Proof Your Job Search',
  ogDescription: 'Track job applications, preserve job postings, and generate AI cover letters. Never lose track of your job search again.',
});

function scrollToHowItWorks() {
  if (import.meta.client) {
    useNuxtApp().$lenis.scrollTo('#how-it-works');
  }
}

const featureGridRef = useTemplateRef<HTMLElement>('featureGridRef');
const howItWorksRef = useTemplateRef<HTMLElement>('howItWorksRef');
const stepLineRef = useTemplateRef<SVGLineElement>('stepLineRef');
const stepCircleRefs = ref<HTMLElement[]>([]);
const activatedCircles = reactive(new Set<number>());

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

const trustBadges = [
  { icon: 'i-lucide-credit-card', label: 'No Credit Card' },
  { icon: 'i-lucide-github', label: 'Open Source' },
  { icon: 'i-lucide-shield-check', label: 'GDPR Compliant' },
  { icon: 'i-lucide-heart', label: '100% Free' },
];

const gsapTriggers: any[] = [];
const abortController = new AbortController();

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
        onUpdate: (self: any) => {
          const progress = self.progress;
          stepCircleRefs.value.forEach((circle, i) => {
            if (!circle) return;
            const threshold = i / (stepCircleRefs.value.length - 1);
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
    gsapTriggers.push(lineTween);
    gsapTriggers.push(ScrollTrigger.getAll().at(-1));
  }
});

onUnmounted(() => {
  abortController.abort();
  gsapTriggers.forEach((t) => t?.kill?.());
  gsapTriggers.length = 0;
});
</script>

<template>
  <div>
    <!-- ==================== HERO SECTION ==================== -->
    <section class="hero-bg relative overflow-hidden -mt-16 pt-36 sm:pt-44 lg:pt-52 pb-20 sm:pb-28 lg:pb-36">
      <!-- Grid pattern overlay -->
      <div class="hero-grid pointer-events-none absolute inset-0" />

      <!-- Animated glow lines traveling along the grid -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <!-- Horizontal glow lines (positioned on grid rows: multiples of 64px) -->
        <div class="grid-glow-h absolute h-px w-32" style="top: 128px; animation-duration: 7s" />
        <div class="grid-glow-h absolute h-px w-24" style="top: 320px; animation-duration: 9s; animation-delay: -3s" />
        <div class="grid-glow-h absolute h-px w-28" style="top: 448px; animation-duration: 11s; animation-delay: -6s" />
        <!-- Vertical glow lines (positioned on grid columns: multiples of 64px) -->
        <div class="grid-glow-v absolute w-px h-24" style="left: 192px; animation-duration: 8s; animation-delay: -2s" />
        <div class="grid-glow-v absolute w-px h-20" style="left: 512px; animation-duration: 10s; animation-delay: -5s" />
        <div class="grid-glow-v absolute w-px h-28" style="left: 832px; animation-duration: 12s; animation-delay: -8s" />
      </div>

      <!-- Floating glass orbs -->
      <div class="orb-float-1 pointer-events-none absolute right-[8%] top-[10%] flex size-16 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
        <UIcon name="i-lucide-briefcase" class="size-7 text-primary/40" />
      </div>
      <div class="orb-float-2 pointer-events-none absolute left-[5%] top-[25%] flex size-12 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
        <UIcon name="i-lucide-sparkles" class="size-5 text-primary/40" />
      </div>
      <div class="orb-float-3 pointer-events-none absolute bottom-[5%] left-[12%] flex size-14 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
        <UIcon name="i-lucide-bar-chart-3" class="size-6 text-primary/40" />
      </div>
      <div class="orb-float-4 pointer-events-none absolute bottom-[20%] right-[15%] flex size-10 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
        <UIcon name="i-lucide-ghost" class="size-4 text-primary/40" />
      </div>

      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <!-- Left: Text content -->
          <div id="hero-text" v-reveal.up class="flex-1 text-center lg:text-left">
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-highlighted leading-[1.15] tracking-tight">
              <span class="text-primary">Ghost-Proof</span><br />
              Your Job Search
            </h1>
            <p class="mt-6 text-lg sm:text-xl text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
              Track applications, preserve job postings before they vanish, and generate AI-powered cover letters — all in one place.
            </p>
            <div class="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
              <UiButtonWithIcon
                to="/app/auth/register"
                label="Start Tracking"
              />
              <UButton
                variant="outline"
                size="xl"
                label="Learn More"
                icon="i-lucide-chevron-down"
                trailing
                class="rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
                @click.prevent="scrollToHowItWorks"
              />
            </div>
          </div>

          <!-- Right: Dashboard mockup illustration -->
          <div id="hero-mockup" v-reveal.right="{ delay: 2 }" class="flex-1 w-full max-w-lg mx-auto lg:mx-0">
            <!-- Glass card mockup of a mini kanban board -->
            <div class="rounded-2xl border border-white/30 dark:border-gray-700/40 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-5 shadow-2xl shadow-primary/10">
              <!-- Mock header -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <div class="size-3 rounded-full bg-red-400" />
                  <div class="size-3 rounded-full bg-amber-400" />
                  <div class="size-3 rounded-full bg-green-400" />
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-2 w-12 rounded bg-muted/20" />
                  <div class="h-2 w-8 rounded bg-muted/20" />
                </div>
              </div>

              <!-- Mock stats row -->
              <div class="grid grid-cols-3 gap-2 mb-4">
                <div class="rounded-lg bg-primary/5 dark:bg-primary/10 p-2 text-center">
                  <div class="text-lg font-bold text-primary">12</div>
                  <div class="text-[10px] text-muted">Applied</div>
                </div>
                <div class="rounded-lg bg-amber-500/5 dark:bg-amber-500/10 p-2 text-center">
                  <div class="text-lg font-bold text-amber-500">5</div>
                  <div class="text-[10px] text-muted">Interviewing</div>
                </div>
                <div class="rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 p-2 text-center">
                  <div class="text-lg font-bold text-emerald-500">3</div>
                  <div class="text-[10px] text-muted">Offers</div>
                </div>
              </div>

              <!-- Mock kanban columns -->
              <div class="grid grid-cols-3 gap-2">
                <div class="space-y-2">
                  <div class="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Applied</div>
                  <div class="rounded-lg border border-white/20 dark:border-gray-700/30 bg-white/80 dark:bg-gray-800/80 p-2 shadow-sm">
                    <div class="h-2 w-3/4 rounded bg-highlighted/20 mb-1" />
                    <div class="h-1.5 w-1/2 rounded bg-muted/20" />
                  </div>
                  <div class="rounded-lg border border-white/20 dark:border-gray-700/30 bg-white/80 dark:bg-gray-800/80 p-2 shadow-sm">
                    <div class="h-2 w-2/3 rounded bg-highlighted/20 mb-1" />
                    <div class="h-1.5 w-3/5 rounded bg-muted/20" />
                  </div>
                  <div class="rounded-lg border border-white/20 dark:border-gray-700/30 bg-white/80 dark:bg-gray-800/80 p-2 shadow-sm">
                    <div class="h-2 w-4/5 rounded bg-highlighted/20 mb-1" />
                    <div class="h-1.5 w-1/3 rounded bg-muted/20" />
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Interviewing</div>
                  <div class="rounded-lg border border-amber-200/40 dark:border-amber-700/30 bg-amber-50/50 dark:bg-amber-900/20 p-2 shadow-sm">
                    <div class="h-2 w-2/3 rounded bg-amber-400/30 mb-1" />
                    <div class="h-1.5 w-1/2 rounded bg-amber-400/15" />
                  </div>
                  <div class="rounded-lg border border-amber-200/40 dark:border-amber-700/30 bg-amber-50/50 dark:bg-amber-900/20 p-2 shadow-sm">
                    <div class="h-2 w-3/4 rounded bg-amber-400/30 mb-1" />
                    <div class="h-1.5 w-2/5 rounded bg-amber-400/15" />
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Offers</div>
                  <div class="rounded-lg border border-emerald-200/40 dark:border-emerald-700/30 bg-emerald-50/50 dark:bg-emerald-900/20 p-2 shadow-sm">
                    <div class="h-2 w-3/4 rounded bg-emerald-400/30 mb-1" />
                    <div class="h-1.5 w-1/2 rounded bg-emerald-400/15" />
                    <div class="mt-1.5 flex items-center gap-1">
                      <div class="size-1.5 rounded-full bg-emerald-400" />
                      <div class="h-1 w-6 rounded bg-emerald-400/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== GRADIENT BACKGROUND WRAPPER (sections after hero) ==================== -->
    <UiBackgroundGradientAnimation>
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

      <!-- ==================== FEATURES SECTION ==================== -->
      <section id="features" class="py-16 sm:py-24">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-14">
            <h2 class="text-3xl sm:text-4xl font-bold text-highlighted tracking-tight leading-tight mb-4">
              Six tools. Zero ghosting.
            </h2>
            <p class="text-lg text-muted max-w-2xl mx-auto">
              From tracking applications to generating cover letters, JobVault has you covered.
            </p>
          </div>

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
        </div>
      </section>

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
                <!-- Numbered circle -->
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

      <!-- ==================== CHROME EXTENSION PROMO ==================== -->
      <section id="extension-promo" v-reveal.up class="py-16 sm:py-24">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <UBadge color="primary" variant="subtle" class="mb-4">Coming Soon</UBadge>
          <h2 class="text-3xl sm:text-4xl font-bold text-highlighted tracking-tight leading-tight mb-4">
            Save Jobs from Anywhere
          </h2>
          <p class="text-lg text-muted max-w-2xl mx-auto mb-8">
            Our Chrome extension lets you save jobs directly from LinkedIn, Indeed, and any job board with a single click.
          </p>
          <!-- Icon composition -->
          <div class="flex items-center justify-center gap-4">
            <div class="flex size-20 items-center justify-center rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg shadow-lg">
              <UIcon name="i-lucide-chrome" class="size-10 text-primary" />
            </div>
            <UIcon name="i-lucide-plus" class="size-6 text-muted" />
            <div class="flex size-20 items-center justify-center rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg shadow-lg">
              <UIcon name="i-lucide-briefcase" class="size-10 text-primary" />
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== FINAL CTA ==================== -->
      <section id="final-cta" v-reveal.scale class="py-16 sm:py-24">
        <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div class="rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg p-8 sm:p-12 shadow-xl shadow-black/5">
            <h2 class="text-3xl sm:text-4xl font-bold text-highlighted tracking-tight leading-tight mb-4">
              Ready to ghost-proof your job search?
            </h2>
            <p class="text-lg text-muted max-w-xl mx-auto mb-8">
              Take control of your job search. Never lose track of an application again.
            </p>
            <UiButtonWithIcon
              to="/app/auth/register"
              label="Create Your Board"
            />
          </div>
        </div>
      </section>

    </UiBackgroundGradientAnimation>
  </div>
</template>

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
