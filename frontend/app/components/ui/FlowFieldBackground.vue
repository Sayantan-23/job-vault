<script setup lang="ts">
interface Props {
  color?: string;
  trailOpacity?: number;
  particleCount?: number;
  speed?: number;
}

const props = withDefaults(defineProps<Props>(), {
  color: '#6366f1',
  trailOpacity: 0.15,
  particleCount: 600,
  speed: 1,
});

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');

let cleanup: (() => void) | null = null;

onMounted(() => {
  if (!import.meta.client) return;

  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = container.clientWidth;
  let height = container.clientHeight;
  let animationFrameId: number;
  const mouse = { x: -1000, y: -1000 };

  // Detect dark mode for trail clearing color
  const isDark = () => document.documentElement.classList.contains('dark');

  class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    age: number;
    life: number;

    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = 0;
      this.vy = 0;
      this.age = 0;
      this.life = Math.random() * 200 + 100;
    }

    update() {
      const angle = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;

      this.vx += Math.cos(angle) * 0.2 * props.speed;
      this.vy += Math.sin(angle) * 0.2 * props.speed;

      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const interactionRadius = 150;

      if (distance < interactionRadius) {
        const force = (interactionRadius - distance) / interactionRadius;
        this.vx -= dx * force * 0.05;
        this.vy -= dy * force * 0.05;
      }

      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.95;
      this.vy *= 0.95;

      this.age++;
      if (this.age > this.life) {
        this.reset();
      }

      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = 0;
      this.vy = 0;
      this.age = 0;
      this.life = Math.random() * 200 + 100;
    }

    draw(context: CanvasRenderingContext2D) {
      const alpha = 1 - Math.abs((this.age / this.life) - 0.5) * 2;
      context.globalAlpha = alpha;
      context.fillStyle = props.color;
      context.fillRect(this.x, this.y, 1.5, 1.5);
    }
  }

  let particles: Particle[] = [];

  const init = () => {
    const dpr = window.devicePixelRatio || 1;
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    particles = [];
    for (let i = 0; i < props.particleCount; i++) {
      particles.push(new Particle());
    }
  };

  const animate = () => {
    // Clear with theme-aware background color
    const dark = isDark();
    const r = dark ? 3 : 249;
    const g = dark ? 3 : 250;
    const b = dark ? 3 : 251;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${props.trailOpacity})`;
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      p.update();
      p.draw(ctx);
    }

    animationFrameId = requestAnimationFrame(animate);
  };

  const handleResize = () => {
    init();
  };

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only track mouse when it's within the canvas bounds
    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      mouse.x = x;
      mouse.y = y;
    } else {
      mouse.x = -1000;
      mouse.y = -1000;
    }
  };

  init();
  animate();

  // Listen on window so mouse events aren't blocked by overlapping z-index layers
  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove);

  cleanup = () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', handleMouseMove);
    cancelAnimationFrame(animationFrameId);
  };
});

onUnmounted(() => {
  cleanup?.();
});
</script>

<template>
  <div ref="containerRef" class="absolute inset-0 overflow-hidden">
    <canvas ref="canvasRef" class="block size-full" />
  </div>
</template>
