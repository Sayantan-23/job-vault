// @deprecated — use v-reveal directive instead. Kept for web/* pages until they migrate.

interface RevealOptions {
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  distance?: number;
  scale?: number;
}

export function useScrollReveal() {
  let observer: IntersectionObserver | null = null;

  if (import.meta.client) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('revealed');
            observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
  }

  function applyReveal(element: HTMLElement, options: RevealOptions) {
    const { direction = 'up', delay = 0, duration = 0.8, distance = 30, scale } = options;

    element.classList.add('scroll-reveal');
    element.style.setProperty('--reveal-duration', `${duration}s`);
    element.style.setProperty('--reveal-delay', `${delay}s`);

    if (scale) {
      element.style.setProperty('--reveal-transform', `scale(${scale})`);
    } else {
      switch (direction) {
        case 'up': element.style.setProperty('--reveal-transform', `translateY(${distance}px)`); break;
        case 'down': element.style.setProperty('--reveal-transform', `translateY(-${distance}px)`); break;
        case 'left': element.style.setProperty('--reveal-transform', `translateX(${distance}px)`); break;
        case 'right': element.style.setProperty('--reveal-transform', `translateX(-${distance}px)`); break;
      }
    }

    observer?.observe(element);
  }

  function reveal(el: HTMLElement | string, options: RevealOptions = {}) {
    if (!import.meta.client || !observer) return;

    const element = typeof el === 'string' ? document.querySelector(el) as HTMLElement | null : el;
    if (!element) return;

    applyReveal(element, options);
  }

  function revealStagger(els: string, options: RevealOptions & { stagger?: number } = {}) {
    if (!import.meta.client || !observer) return;

    const elements = document.querySelectorAll(els);
    const { stagger = 0.1, delay = 0, ...rest } = options;

    elements.forEach((el, i) => {
      applyReveal(el as HTMLElement, { ...rest, delay: delay + i * stagger });
    });
  }

  onUnmounted(() => {
    observer?.disconnect();
  });

  return { reveal, revealStagger };
}
