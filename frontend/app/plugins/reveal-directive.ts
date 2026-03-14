export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    // Register a no-op directive with getSSRProps so SSR doesn't crash
    nuxtApp.vueApp.directive('reveal', {
      getSSRProps() {
        return {};
      },
    });
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );

  const TRANSFORM_MAP: Record<string, string> = {
    up: 'translateY(30px)',
    down: 'translateY(-30px)',
    left: 'translateX(30px)',
    right: 'translateX(-30px)',
    scale: 'scale(0.95)',
  };

  const DELAY_UNIT = 0.08; // seconds per delay index

  nuxtApp.vueApp.directive('reveal', {
    mounted(el: HTMLElement, binding) {
      const modifiers = binding.modifiers || {};
      const value = (binding.value as { delay?: number } | undefined) || {};

      // Determine transform from modifier
      const direction = Object.keys(modifiers).find((k) => k in TRANSFORM_MAP) || 'up';
      const transform = TRANSFORM_MAP[direction];

      // Apply initial styles
      el.classList.add('scroll-reveal');
      el.style.setProperty('--reveal-transform', transform);

      if (value.delay) {
        el.style.setProperty('--reveal-delay', `${value.delay * DELAY_UNIT}s`);
      }

      // If reduced motion, reveal immediately
      if (prefersReducedMotion) {
        el.classList.add('revealed');
        return;
      }

      observer.observe(el);
    },

    unmounted(el: HTMLElement) {
      observer.unobserve(el);
    },
  });
});
