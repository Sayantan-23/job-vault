<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Feature {
  icon: string;
  title: string;
  description: string;
  hero?: boolean;
}

defineProps<{
  features: Feature[];
}>();

const gridRef = ref<HTMLElement | null>(null);
let triggers: any[] = [];

onMounted(async () => {
  if (!import.meta.client) return;

  const gsap = (await import('gsap')).default;
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // Heading entrance
  if (gridRef.value) {
    const heading = gridRef.value.closest('section')?.querySelector('.section-heading');
    if (heading) {
      gsap.from(heading, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: heading,
          start: 'top 85%',
          once: true,
        },
      });
      triggers.push(ScrollTrigger.getAll().at(-1));
    }
  }

  // Stagger card entrance
  if (gridRef.value) {
    const cards = gridRef.value.querySelectorAll('.bento-card');
    gsap.from(cards, {
      y: 50,
      opacity: 0,
      stagger: 0.1,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: gridRef.value,
        start: 'top 80%',
        once: true,
      },
    });
    triggers.push(ScrollTrigger.getAll().at(-1));
  }

  // Icon pulse on hover
  if (gridRef.value) {
    const cards = gridRef.value.querySelectorAll('.bento-card');
    cards.forEach((card) => {
      const icon = card.querySelector('.feature-icon');
      if (!icon) return;

      card.addEventListener('mouseenter', () => {
        gsap.to(icon, {
          scale: 1.2,
          rotate: 8,
          duration: 0.3,
          ease: 'back.out(2)',
        });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(icon, {
          scale: 1,
          rotate: 0,
          duration: 0.3,
          ease: 'power2.out',
        });
      });
    });
  }
});

onUnmounted(() => {
  triggers.forEach((t) => t?.kill());
  triggers = [];
});
</script>

<template>
  <section id="features" class="py-20 sm:py-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="section-heading text-center mb-14">
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-highlighted mb-4">
          Everything you need to<br class="hidden sm:block" />
          <span class="text-primary">land your next role</span>
        </h2>
        <p class="text-lg text-muted max-w-2xl mx-auto">
          From tracking applications to generating cover letters, JobVault has you covered.
        </p>
      </div>

      <!-- Bento grid: 2 hero cards span 2 cols, 4 standard cards span 1 col each -->
      <div ref="gridRef" class="bento-grid">
        <div
          v-for="(feature, index) in features"
          :key="feature.title"
          class="bento-card group rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg shadow-sm shadow-black/5 transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/8"
          :class="feature.hero ? 'bento-hero p-7 sm:p-8' : 'p-6'"
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

          <!-- Hero card: decorative mini-illustration -->
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

          <div v-if="feature.hero && feature.icon === 'i-lucide-ghost'" class="mt-5 flex items-end gap-1.5 h-10">
            <div
              v-for="(h, i) in [40, 65, 30, 85, 55, 45, 75]"
              :key="i"
              class="flex-1 rounded-t-sm transition-colors"
              :class="h > 60 ? 'bg-red-400/40 dark:bg-red-400/30' : 'bg-primary/15 dark:bg-primary/25'"
              :style="{ height: `${h}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bento-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .bento-hero {
    grid-column: span 2;
  }
}

@media (min-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .bento-hero {
    grid-column: span 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bento-card {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
