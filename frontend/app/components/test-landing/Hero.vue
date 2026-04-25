<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const mockupRef = ref<HTMLElement | null>(null);
const heroRef = ref<HTMLElement | null>(null);
const headlineWords = ['Ghost-Proof', 'Your', 'Job', 'Search'];

let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

onMounted(async () => {
  if (!import.meta.client) return;

  const gsap = (await import('gsap')).default;

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // Hero entrance timeline
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('.hero-word', {
    y: 80,
    opacity: 0,
    rotateX: -40,
    stagger: 0.1,
    duration: 0.9,
  })
    .from('.hero-subtitle', {
      y: 30,
      opacity: 0,
      duration: 0.7,
    }, '-=0.4')
    .from('.hero-cta', {
      y: 20,
      opacity: 0,
      stagger: 0.12,
      duration: 0.6,
    }, '-=0.3')
    .from('.hero-mockup', {
      scale: 0.85,
      opacity: 0,
      y: 60,
      duration: 1,
      ease: 'power2.out',
    }, '-=0.6')
    .from('.hero-badge', {
      y: 20,
      opacity: 0,
      stagger: 0.06,
      duration: 0.5,
    }, '-=0.4');

  // 3D tilt on mousemove
  if (mockupRef.value) {
    mouseMoveHandler = (e: MouseEvent) => {
      if (!mockupRef.value || !heroRef.value) return;
      const rect = heroRef.value.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(mockupRef.value, {
        rotateY: x * 12,
        rotateX: -y * 8,
        duration: 0.6,
        ease: 'power2.out',
      });
    };
    heroRef.value?.addEventListener('mousemove', mouseMoveHandler);
  }
});

onUnmounted(() => {
  if (heroRef.value && mouseMoveHandler) {
    heroRef.value.removeEventListener('mousemove', mouseMoveHandler);
  }
});
</script>

<template>
  <section
    ref="heroRef"
    class="relative overflow-hidden -mt-16 pt-36 sm:pt-44 lg:pt-52 pb-24 sm:pb-32 lg:pb-40"
  >
    <!-- Background -->
    <div class="absolute inset-0 bg-gray-50 dark:bg-[#030303]" />
    <UiGeometricShapesBackground />

    <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col items-center gap-14 lg:flex-row lg:gap-20">
        <!-- Left: Text content -->
        <div class="flex-1 text-center lg:text-left">
          <h1 class="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-highlighted leading-[1.1] [perspective:600px]">
            <span
              v-for="(word, i) in headlineWords"
              :key="i"
              class="hero-word inline-block"
              :class="[
                word === 'Ghost-Proof' ? 'text-primary' : '',
                i < headlineWords.length - 1 ? 'mr-[0.3em]' : '',
              ]"
            >
              {{ word }}
            </span>
          </h1>

          <p class="hero-subtitle mt-7 text-lg sm:text-xl text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Track applications, preserve job postings before they vanish, and generate AI-powered cover letters — all in one place.
          </p>

          <div class="mt-9 flex flex-wrap gap-4 justify-center lg:justify-start">
            <UiButtonWithIcon
              to="#"
              label="Get Started Free"
              class="hero-cta"
            />
            <UButton
              variant="outline"
              size="xl"
              label="See How It Works"
              icon="i-lucide-play"
              trailing
              class="hero-cta rounded-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-white/30 dark:border-gray-700/40"
              href="#how-it-works"
            />
          </div>
        </div>

        <!-- Right: Dashboard mockup with 3D tilt -->
        <div class="flex-1 w-full max-w-lg mx-auto lg:mx-0 [perspective:1200px]">
          <div
            ref="mockupRef"
            class="hero-mockup will-change-transform"
            style="transform-style: preserve-3d"
          >
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

            <!-- Floating reflection/shadow beneath mockup -->
            <div class="mt-4 mx-8 h-4 rounded-full bg-black/5 dark:bg-black/20 blur-xl" />
          </div>
        </div>
      </div>
    </div>

  </section>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .hero-word,
  .hero-subtitle,
  .hero-cta,
  .hero-mockup,
  .hero-badge {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
