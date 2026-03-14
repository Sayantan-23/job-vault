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
const stepCircleRefs = ref<HTMLElement[]>([]);
const activatedCircles = reactive(new Set<number>());

// Hero entrance refs
const heroBgRef = useTemplateRef<HTMLElement>('heroBgRef');
const heroGridRef = useTemplateRef<HTMLElement>('heroGridRef');
const heroTextRef = useTemplateRef<HTMLElement>('heroTextRef');
const heroHeadingRef = useTemplateRef<HTMLElement>('heroHeadingRef');
const ghostProofRef = useTemplateRef<HTMLElement>('ghostProofRef');
const heroSubtitleRef = useTemplateRef<HTMLElement>('heroSubtitleRef');
const heroCtasRef = useTemplateRef<HTMLElement>('heroCtasRef');
const heroMockupRef = useTemplateRef<HTMLElement>('heroMockupRef');
const orbRefs = ref<HTMLElement[]>([]);

// Features horizontal scroll refs
const featuresSectionRef = useTemplateRef<HTMLElement>('featuresSectionRef');
const featuresTrackRef = useTemplateRef<HTMLElement>('featuresTrackRef');

// Flowing line SVG 1 refs (How It Works — vertical)
const timelineContainerRef = useTemplateRef<HTMLElement>('timelineContainerRef');
const flowLineSvg1Ref = useTemplateRef<SVGSVGElement>('flowLineSvg1Ref');
const flowPath1BaseRef = useTemplateRef<SVGPathElement>('flowPath1BaseRef');
const flowPath1GlowRef = useTemplateRef<SVGPathElement>('flowPath1GlowRef');
const flowPath1TravelRef = useTemplateRef<SVGPathElement>('flowPath1TravelRef');

// Flowing line SVG 2 refs (Features — horizontal)
const flowLineSvg2Ref = useTemplateRef<SVGSVGElement>('flowLineSvg2Ref');
const flowPath2BaseRef = useTemplateRef<SVGPathElement>('flowPath2BaseRef');
const flowPath2GlowRef = useTemplateRef<SVGPathElement>('flowPath2GlowRef');
const flowPath2TravelRef = useTemplateRef<SVGPathElement>('flowPath2TravelRef');

const prefersReducedMotion = ref(false);

const features = [
  {
    icon: 'i-lucide-columns-3',
    title: 'Kanban Pipeline',
    description: 'Drag-and-drop your applications through stages from Wishlist to Offer.',
  },
  {
    icon: 'i-lucide-ghost',
    title: 'Ghost Meter',
    description: 'Know exactly which employers have gone silent with automatic ghost detection.',
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

let resizeTimer: ReturnType<typeof setTimeout>;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(async () => {
    const { ScrollTrigger } = await import('gsap/ScrollTrigger');
    ScrollTrigger.refresh();
  }, 200);
}

onMounted(async () => {
  if (!import.meta.client) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  prefersReducedMotion.value = reducedMotion;
  if (reducedMotion) {
    // Make orbs visible and let CSS animations run
    orbRefs.value.forEach((orb) => {
      if (orb) orb.style.animationPlayState = 'running';
    });
    return;
  }

  const gsap = (await import('gsap')).default;
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);

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

  // === Feature card icon hover ===
  if (featureGridRef.value || featuresTrackRef.value) {
    const allCards = [
      ...(featureGridRef.value?.querySelectorAll('.bento-card') || []),
      ...(featuresTrackRef.value?.querySelectorAll('.feature-card') || []),
    ];
    allCards.forEach((card) => {
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

  // === Flowing line SVG 1 — path calculation (How It Works vertical, desktop only) ===
  if (
    flowLineSvg1Ref.value
    && flowPath1BaseRef.value
    && flowPath1GlowRef.value
    && flowPath1TravelRef.value
    && timelineContainerRef.value
    && window.innerWidth >= 1024
  ) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const svg = flowLineSvg1Ref.value!;
    const container = timelineContainerRef.value!;
    const containerRect = container.getBoundingClientRect();
    const circles = stepCircleRefs.value;

    if (circles.length >= 3) {
      // Calculate circle positions relative to the SVG's parent container
      const circlePositions = circles.map((circle) => {
        const rect = circle.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
        };
      });

      const centerX = circlePositions[0].x;
      const topY = Math.max(0, circlePositions[0].y - 40);
      const lastCircleY = circlePositions[2].y;
      // Extend the line well below the last step to create room for the curve
      const curveStartY = lastCircleY + 80;
      const curveEndY = curveStartY + 60;
      const containerWidth = containerRect.width;

      // Path: straight vertical through circles, then smooth curve to bottom-right
      const pathD = [
        `M ${centerX} ${topY}`,
        `L ${centerX} ${circlePositions[0].y}`,
        `L ${centerX} ${circlePositions[1].y}`,
        `L ${centerX} ${lastCircleY}`,
        `L ${centerX} ${curveStartY}`,
        `C ${centerX} ${curveEndY}, ${centerX + 150} ${curveEndY}, ${containerWidth} ${curveEndY}`,
      ].join(' ');

      // Set SVG viewBox to match container — add extra height for the curve
      const svgHeight = curveEndY + 20;
      svg.setAttribute('viewBox', `0 0 ${containerWidth} ${svgHeight}`);
      svg.style.height = `${svgHeight}px`;

      // Apply path to all three layers
      [flowPath1BaseRef.value!, flowPath1GlowRef.value!, flowPath1TravelRef.value!].forEach((p) => {
        p.setAttribute('d', pathD);
      });
    }
  }

  // === Features horizontal scroll (desktop only) + SVG 2 + unified scroll ===
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
            }
            else {
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

      return () => {
        featuresTween.kill();
      };
    },
  });

  // Resize handler for SVG recalculation
  window.addEventListener('resize', onResize, { signal: abortController.signal });
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
    <section ref="heroBgRef" class="hero-bg relative overflow-hidden -mt-16 pt-36 sm:pt-44 lg:pt-52 pb-20 sm:pb-28 lg:pb-36">
      <!-- Grid pattern overlay -->
      <div ref="heroGridRef" class="hero-grid pointer-events-none absolute inset-0" />

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
      <div :ref="(el) => { if (el) orbRefs[0] = el as HTMLElement }" class="orb-float-1 pointer-events-none absolute right-[8%] top-[10%] flex size-16 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
        <UIcon name="i-lucide-briefcase" class="size-7 text-primary/40" />
      </div>
      <div :ref="(el) => { if (el) orbRefs[1] = el as HTMLElement }" class="orb-float-2 pointer-events-none absolute left-[5%] top-[25%] flex size-12 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
        <UIcon name="i-lucide-sparkles" class="size-5 text-primary/40" />
      </div>
      <div :ref="(el) => { if (el) orbRefs[2] = el as HTMLElement }" class="orb-float-3 pointer-events-none absolute bottom-[5%] left-[12%] flex size-14 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
        <UIcon name="i-lucide-bar-chart-3" class="size-6 text-primary/40" />
      </div>
      <div :ref="(el) => { if (el) orbRefs[3] = el as HTMLElement }" class="orb-float-4 pointer-events-none absolute bottom-[20%] right-[15%] flex size-10 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
        <UIcon name="i-lucide-ghost" class="size-4 text-primary/40" />
      </div>

      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <!-- Left: Text content -->
          <div id="hero-text" ref="heroTextRef" class="flex-1 text-center lg:text-left">
            <h1 ref="heroHeadingRef" class="text-4xl sm:text-5xl lg:text-6xl font-bold text-highlighted leading-[1.15] tracking-tight">
              <span ref="ghostProofRef" class="text-primary ghost-proof-sweep">Ghost-Proof</span><br />
              Your Job Search
            </h1>
            <p ref="heroSubtitleRef" class="mt-6 text-lg sm:text-xl text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
              Track applications, preserve job postings before they vanish, and generate AI-powered cover letters — all in one place.
            </p>
            <div ref="heroCtasRef" class="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
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
          <div id="hero-mockup" ref="heroMockupRef" class="flex-1 w-full max-w-lg mx-auto lg:mx-0">
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
          <div ref="timelineContainerRef" class="relative mx-auto max-w-2xl">
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
          <div v-if="!prefersReducedMotion" class="features-track-wrapper hidden lg:block section-content">
            <!-- Flowing line SVG 2 (horizontal, inside pinned container) -->
            <svg
              ref="flowLineSvg2Ref"
              class="flowing-line-svg inset-0 w-full"
              style="height: 20px; top: 50%; transform: translateY(-50%);"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="glowFilter2">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="cometGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="var(--ui-primary)" stop-opacity="0" />
                  <stop offset="40%" stop-color="var(--ui-primary)" stop-opacity="0.8" />
                  <stop offset="60%" stop-color="var(--ui-primary)" stop-opacity="0.8" />
                  <stop offset="100%" stop-color="var(--ui-primary)" stop-opacity="0" />
                </linearGradient>
              </defs>
              <!-- Base track -->
              <path ref="flowPath2BaseRef" stroke="var(--ui-primary)" stroke-width="2" fill="none" opacity="0.15" />
              <!-- Glow -->
              <path ref="flowPath2GlowRef" stroke="var(--ui-primary)" stroke-width="6" fill="none" opacity="0.08" filter="url(#glowFilter2)" />
              <!-- Traveling segment -->
              <path ref="flowPath2TravelRef" stroke="url(#cometGrad2)" stroke-width="2.5" fill="none" />
              <!-- Node dots between cards -->
              <circle v-for="n in 5" :key="n" :cx="`${n * 16.67}%`" cy="10" r="3" fill="var(--ui-primary)" opacity="0.2" />
            </svg>
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
          <div ref="featureGridRef" :class="prefersReducedMotion ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4'">
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
@media (prefers-reduced-motion: reduce) {
  .bento-card { opacity: 1 !important; transform: none !important; }
}

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
</style>
