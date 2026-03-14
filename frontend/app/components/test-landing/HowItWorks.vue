<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

interface Step {
  number: number;
  icon: string;
  title: string;
  description: string;
}

interface Testimonial {
  stars: number;
  quote: string;
  name: string;
  title: string;
  initials: string;
}

const props = defineProps<{
  steps: Step[];
  testimonials: Testimonial[];
}>();

const sectionRef = ref<HTMLElement | null>(null);
const pathRef = ref<SVGPathElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
let triggers: any[] = [];

// Pair steps with testimonials
const stepsWithTestimonials = computed(() =>
  props.steps.map((step, i) => ({
    ...step,
    testimonial: props.testimonials[i] || null,
  })),
);

onMounted(async () => {
  if (!import.meta.client) return;

  const gsap = (await import('gsap')).default;
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  await nextTick();

  // Section heading
  if (sectionRef.value) {
    const heading = sectionRef.value.querySelector('.section-heading');
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

  // SVG line draw on scroll
  if (pathRef.value) {
    const length = pathRef.value.getTotalLength();
    gsap.set(pathRef.value, {
      strokeDasharray: length,
      strokeDashoffset: length,
    });

    gsap.to(pathRef.value, {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.value,
        start: 'top 60%',
        end: 'bottom 40%',
        scrub: 1.5,
      },
    });
    triggers.push(ScrollTrigger.getAll().at(-1));
  }

  // Step cards alternating entrance
  if (sectionRef.value) {
    const cards = sectionRef.value.querySelectorAll('.timeline-step');
    cards.forEach((card, i) => {
      const fromLeft = i % 2 === 0;
      gsap.from(card, {
        x: fromLeft ? -60 : 60,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 80%',
          once: true,
        },
      });
      triggers.push(ScrollTrigger.getAll().at(-1));
    });
  }
});

onUnmounted(() => {
  triggers.forEach((t) => t?.kill());
  triggers = [];
});
</script>

<template>
  <section id="how-it-works" ref="sectionRef" class="py-20 sm:py-28 relative">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="section-heading text-center mb-16">
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-highlighted mb-4">
          Your journey to <span class="text-primary">landing the role</span>
        </h2>
        <p class="text-lg text-muted max-w-2xl mx-auto">
          Get started in minutes. No complicated setup required.
        </p>
      </div>

      <!-- Timeline container -->
      <div class="relative max-w-4xl mx-auto">
        <!-- SVG connecting line (desktop) -->
        <svg
          ref="svgRef"
          class="hidden lg:block absolute left-1/2 -translate-x-1/2 top-0 h-full w-4 overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            ref="pathRef"
            d="M 8 0 C 8 100, 8 100, 8 200 S 8 300, 8 400 S 8 500, 8 600 S 8 700, 8 800"
            fill="none"
            stroke="var(--ui-color-primary-300)"
            stroke-width="2"
            stroke-linecap="round"
            class="dark:stroke-primary/40"
          />
        </svg>

        <!-- Mobile vertical line -->
        <div class="lg:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-primary/20" />

        <!-- Steps -->
        <div class="space-y-16 lg:space-y-24">
          <div
            v-for="(item, index) in stepsWithTestimonials"
            :key="item.number"
            class="timeline-step relative"
          >
            <!-- Desktop: alternating layout -->
            <div
              class="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-12"
              :class="index % 2 === 0 ? '' : 'lg:flex-row-reverse'"
            >
              <!-- Step card -->
              <div class="flex-1 pl-14 lg:pl-0" :class="index % 2 === 0 ? 'lg:text-right' : ''">
                <div
                  class="rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg p-6 shadow-sm shadow-black/5"
                >
                  <div
                    class="flex items-center gap-3 mb-3"
                    :class="index % 2 === 0 ? 'lg:justify-end' : ''"
                  >
                    <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                      <UIcon :name="item.icon" class="size-5 text-primary" />
                    </div>
                    <h3 class="text-lg font-semibold text-highlighted">
                      {{ item.title }}
                    </h3>
                  </div>
                  <p class="text-sm text-muted leading-relaxed">
                    {{ item.description }}
                  </p>
                </div>
              </div>

              <!-- Center dot (desktop) -->
              <div class="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-6 z-10 size-10 items-center justify-center rounded-full bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25">
                {{ item.number }}
              </div>

              <!-- Mobile dot -->
              <div class="lg:hidden absolute left-3.5 top-6 z-10 flex size-5 items-center justify-center rounded-full bg-primary ring-4 ring-white dark:ring-gray-900">
                <span class="text-[10px] font-bold text-white">{{ item.number }}</span>
              </div>

              <!-- Testimonial card -->
              <div class="flex-1 pl-14 lg:pl-0">
                <div
                  v-if="item.testimonial"
                  class="rounded-xl border border-primary/10 dark:border-primary/15 bg-primary/3 dark:bg-primary/5 p-5"
                >
                  <div class="flex gap-0.5 mb-2">
                    <UIcon
                      v-for="s in item.testimonial.stars"
                      :key="s"
                      name="i-lucide-star"
                      class="size-3.5 fill-amber-400 text-amber-400"
                    />
                  </div>
                  <p class="text-sm text-muted italic leading-relaxed mb-3">
                    "{{ item.testimonial.quote }}"
                  </p>
                  <div class="flex items-center gap-2.5">
                    <div class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary shrink-0">
                      {{ item.testimonial.initials }}
                    </div>
                    <div>
                      <div class="text-xs font-semibold text-highlighted">{{ item.testimonial.name }}</div>
                      <div class="text-[11px] text-muted">{{ item.testimonial.title }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .timeline-step {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
