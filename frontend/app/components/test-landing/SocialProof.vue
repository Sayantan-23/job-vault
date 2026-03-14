<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Badge {
  icon: string;
  label: string;
}

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

defineProps<{
  badges: Badge[];
  stats: Stat[];
}>();

const sectionRef = ref<HTMLElement | null>(null);
const statRefs = ref<HTMLElement[]>([]);
let triggers: any[] = [];

onMounted(async () => {
  if (!import.meta.client) return;

  const gsap = (await import('gsap')).default;
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // Badge stagger entrance
  if (sectionRef.value) {
    const badgeEls = sectionRef.value.querySelectorAll('.trust-badge');
    gsap.from(badgeEls, {
      y: 20,
      opacity: 0,
      stagger: 0.08,
      duration: 0.5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: sectionRef.value,
        start: 'top 85%',
        once: true,
      },
    });
    triggers.push(ScrollTrigger.getAll().at(-1));
  }

  // Count-up animation for stats
  statRefs.value.forEach((el) => {
    const target = parseInt(el.dataset.value || '0', 10);
    const obj = { val: 0 };

    gsap.to(obj, {
      val: target,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true,
      },
      onUpdate: () => {
        const display = el.querySelector('.stat-number');
        if (display) {
          display.textContent = Math.round(obj.val).toLocaleString();
        }
      },
    });
    triggers.push(ScrollTrigger.getAll().at(-1));
  });
});

onUnmounted(() => {
  triggers.forEach((t) => t?.kill());
  triggers = [];
});
</script>

<template>
  <section
    ref="sectionRef"
    class="relative border-y border-white/20 dark:border-gray-700/20 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm"
  >
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <!-- Trust badges -->
        <div class="flex flex-wrap justify-center gap-4 sm:gap-6 sm:justify-start">
          <div
            v-for="badge in badges"
            :key="badge.label"
            class="trust-badge flex items-center gap-2 text-sm text-muted"
          >
            <UIcon :name="badge.icon" class="size-4.5 text-primary/70" />
            <span>{{ badge.label }}</span>
          </div>
        </div>

        <!-- Stat counters -->
        <div class="flex justify-center gap-8 sm:gap-10">
          <div
            v-for="stat in stats"
            :key="stat.label"
            ref="statRefs"
            :data-value="stat.value"
            class="text-center"
          >
            <div class="flex items-baseline justify-center gap-0.5">
              <span class="stat-number text-2xl sm:text-3xl font-bold text-highlighted tabular-nums">0</span>
              <span class="text-lg sm:text-xl font-bold text-primary">{{ stat.suffix }}</span>
            </div>
            <div class="text-xs text-muted mt-0.5">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
