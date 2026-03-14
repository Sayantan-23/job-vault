<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const ctaRef = ref<HTMLElement | null>(null);
let triggers: any[] = [];

onMounted(async () => {
  if (!import.meta.client) return;

  const gsap = (await import('gsap')).default;
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  if (ctaRef.value) {
    gsap.from(ctaRef.value.querySelector('.cta-inner'), {
      scale: 0.92,
      opacity: 0,
      y: 40,
      duration: 0.9,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: ctaRef.value,
        start: 'top 80%',
        once: true,
      },
    });
    triggers.push(ScrollTrigger.getAll().at(-1));
  }
});

onUnmounted(() => {
  triggers.forEach((t) => t?.kill());
  triggers = [];
});
</script>

<template>
  <section ref="ctaRef" class="py-20 sm:py-28">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div class="cta-inner relative overflow-hidden rounded-3xl cta-gradient p-10 sm:p-16 text-center">
        <!-- Grain texture overlay -->
        <svg class="pointer-events-none absolute inset-0 size-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <filter id="cta-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#cta-grain)" />
        </svg>

        <!-- Chrome extension badge -->
        <div class="relative z-10 mb-8 flex justify-center">
          <div class="flex items-center gap-3">
            <div class="flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
              <UIcon name="i-lucide-chrome" class="size-7 text-white/90" />
            </div>
            <UIcon name="i-lucide-plus" class="size-4 text-white/50" />
            <div class="flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
              <UIcon name="i-lucide-briefcase" class="size-7 text-white/90" />
            </div>
          </div>
        </div>

        <UBadge color="neutral" variant="subtle" class="relative z-10 mb-5 bg-white/15 text-white border-white/20">
          Chrome Extension Coming Soon
        </UBadge>

        <h2 class="relative z-10 text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
          Ready to ghost-proof<br class="hidden sm:block" />
          your job search?
        </h2>
        <p class="relative z-10 text-lg text-white/70 max-w-xl mx-auto mb-8">
          Join thousands of job seekers who never lose track of an application.
        </p>

        <div class="relative z-10">
          <NuxtLink
            to="#"
            class="inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-sm font-semibold shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.03]"
            :class="'text-[var(--ui-color-primary-700)] dark:text-[var(--ui-color-primary-700)]'"
          >
            Get Started — It's Free
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cta-gradient {
  background: linear-gradient(
    135deg,
    var(--ui-color-primary-700) 0%,
    var(--ui-color-primary-500) 50%,
    var(--ui-color-primary-600) 100%
  );
}

.dark .cta-gradient {
  background: linear-gradient(
    135deg,
    var(--ui-color-primary-800) 0%,
    var(--ui-color-primary-600) 50%,
    var(--ui-color-primary-700) 100%
  );
}

@media (prefers-reduced-motion: reduce) {
  .cta-inner {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
