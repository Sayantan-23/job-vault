<script setup lang="ts">
interface ShapeConfig {
  delay: number;
  width: number;
  height: number;
  rotate: number;
  lightGradient: string;
  darkGradient: string;
  position: string;
  floatDuration: number;
}

const shapes: ShapeConfig[] = [
  {
    delay: 0.3,
    width: 600,
    height: 140,
    rotate: 12,
    lightGradient: 'from-primary/30',
    darkGradient: 'dark:from-primary/15',
    position: 'left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]',
    floatDuration: 12,
  },
  {
    delay: 0.5,
    width: 500,
    height: 120,
    rotate: -15,
    lightGradient: 'from-rose-500/30',
    darkGradient: 'dark:from-rose-500/15',
    position: 'right-[-5%] md:right-[0%] top-[70%] md:top-[75%]',
    floatDuration: 14,
  },
  {
    delay: 0.4,
    width: 300,
    height: 80,
    rotate: -8,
    lightGradient: 'from-violet-500/30',
    darkGradient: 'dark:from-violet-500/15',
    position: 'left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]',
    floatDuration: 10,
  },
  {
    delay: 0.6,
    width: 200,
    height: 60,
    rotate: 20,
    lightGradient: 'from-amber-500/30',
    darkGradient: 'dark:from-amber-500/15',
    position: 'right-[15%] md:right-[20%] top-[10%] md:top-[15%]',
    floatDuration: 16,
  },
  {
    delay: 0.7,
    width: 150,
    height: 40,
    rotate: -25,
    lightGradient: 'from-cyan-500/30',
    darkGradient: 'dark:from-cyan-500/15',
    position: 'left-[20%] md:left-[25%] top-[5%] md:top-[10%]',
    floatDuration: 11,
  },
];
</script>

<template>
  <div class="absolute inset-0 overflow-hidden">
    <div
      v-for="(shape, i) in shapes"
      :key="i"
      class="geometric-shape absolute"
      :class="shape.position"
      :style="{
        '--drop-delay': `${shape.delay}s`,
        '--target-rotate': `${shape.rotate}deg`,
        '--start-rotate': `${shape.rotate - 15}deg`,
        '--float-duration': `${shape.floatDuration}s`,
      }"
    >
      <div
        class="geometric-shape-inner relative"
        :style="{ width: `${shape.width}px`, height: `${shape.height}px` }"
      >
        <div
          class="absolute inset-0 rounded-full bg-gradient-to-r to-transparent backdrop-blur-[2px] border border-black/[0.08] dark:border-white/[0.15] shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_0_rgba(255,255,255,0.1)] after:absolute after:inset-0 after:rounded-full after:bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.04),transparent_70%)] dark:after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
          :class="[shape.lightGradient, shape.darkGradient]"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Entry animation: drop in with rotation */
.geometric-shape {
  opacity: 0;
  transform: translateY(-150px) rotate(var(--start-rotate));
  animation: shape-drop-in 2.4s cubic-bezier(0.23, 0.86, 0.39, 0.96) forwards;
  animation-delay: var(--drop-delay);
}

@keyframes shape-drop-in {
  0% {
    opacity: 0;
    transform: translateY(-150px) rotate(var(--start-rotate));
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotate(var(--target-rotate));
  }
}

/* Continuous float animation */
.geometric-shape-inner {
  animation: shape-float var(--float-duration) ease-in-out infinite;
}

@keyframes shape-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(15px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .geometric-shape {
    opacity: 1;
    transform: rotate(var(--target-rotate));
    animation: none;
  }
  .geometric-shape-inner {
    animation: none;
  }
}
</style>
