<script setup lang="ts">
const props = withDefaults(defineProps<{
  interactive?: boolean
}>(), {
  interactive: true,
});

const containerId = useId();
const filterId = `blur-${containerId}`;

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');
const interactiveRef = useTemplateRef<HTMLDivElement>('interactiveRef');

let curX = 0;
let curY = 0;
let tgX = 0;
let tgY = 0;
let rafId: number | null = null;

function move() {
  curX += (tgX - curX) / 20;
  curY += (tgY - curY) / 20;
  if (interactiveRef.value) {
    interactiveRef.value.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
  }
  rafId = requestAnimationFrame(move);
}

function handleMouseMove(event: MouseEvent) {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  tgX = event.clientX - rect.left;
  tgY = event.clientY - rect.top;
}

function handleVisibilityChange() {
  if (document.hidden) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  } else if (props.interactive) {
    rafId = requestAnimationFrame(move);
  }
}

onMounted(() => {
  if (!props.interactive) return;

  // Skip interactive animation on touch-only devices
  const isTouchOnly = 'ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches;
  if (isTouchOnly) return;

  // Skip if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  rafId = requestAnimationFrame(move);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
  <div
    ref="containerRef"
    class="gradient-bg"
    @mousemove="handleMouseMove"
  >
    <!-- SVG goo filter for blob merging -->
    <svg xmlns="http://www.w3.org/2000/svg" class="hidden">
      <defs>
        <filter :id="filterId">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>

    <!-- Animated gradient blobs -->
    <div
      class="gradients-container"
      :style="{ filter: `url(#${filterId}) blur(40px)` }"
    >
      <div class="gradient-blob gradient-blob-1" />
      <div class="gradient-blob gradient-blob-2" />
      <div class="gradient-blob gradient-blob-3" />
      <div class="gradient-blob gradient-blob-4" />
      <div class="gradient-blob gradient-blob-5" />

      <div
        v-if="interactive"
        ref="interactiveRef"
        class="gradient-blob gradient-blob-interactive"
      />
    </div>

    <!-- Slotted content above the gradient -->
    <div class="relative z-10">
      <slot />
    </div>
  </div>
</template>
