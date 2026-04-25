<script setup lang="ts">
interface WaveConfig {
  offset: number;
  amplitude: number;
  frequency: number;
  color: string;
  opacity: number;
}

const canvasRef = ref<HTMLCanvasElement | null>(null);

let mouseX = 0;
let mouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;
let animationId: number | null = null;
let time = 0;

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function getThemeColors() {
  const dark = isDarkMode();
  return {
    backgroundTop: dark ? '#110d1e' : '#f8f6fc',
    backgroundBottom: dark ? '#0f0a1e' : '#f0ecf5',
    wavePalette: dark
      ? [
          { offset: 0, amplitude: 70, frequency: 0.003, color: 'rgba(143, 92, 255, 0.7)', opacity: 0.45 },
          { offset: Math.PI / 2, amplitude: 90, frequency: 0.0026, color: 'rgba(117, 53, 255, 0.6)', opacity: 0.35 },
          { offset: Math.PI, amplitude: 60, frequency: 0.0034, color: 'rgba(91, 43, 238, 0.55)', opacity: 0.3 },
          { offset: Math.PI * 1.5, amplitude: 80, frequency: 0.0022, color: 'rgba(174, 139, 255, 0.4)', opacity: 0.25 },
          { offset: Math.PI * 2, amplitude: 55, frequency: 0.004, color: 'rgba(205, 184, 255, 0.25)', opacity: 0.2 },
        ]
      : [
          { offset: 0, amplitude: 70, frequency: 0.003, color: 'rgba(91, 43, 238, 0.35)', opacity: 0.4 },
          { offset: Math.PI / 2, amplitude: 90, frequency: 0.0026, color: 'rgba(143, 92, 255, 0.3)', opacity: 0.32 },
          { offset: Math.PI, amplitude: 60, frequency: 0.0034, color: 'rgba(174, 139, 255, 0.28)', opacity: 0.28 },
          { offset: Math.PI * 1.5, amplitude: 80, frequency: 0.0022, color: 'rgba(205, 184, 255, 0.22)', opacity: 0.22 },
          { offset: Math.PI * 2, amplitude: 55, frequency: 0.004, color: 'rgba(228, 217, 255, 0.18)', opacity: 0.18 },
        ],
  } as { backgroundTop: string; backgroundBottom: string; wavePalette: WaveConfig[] };
}

let themeColors = { backgroundTop: '', backgroundBottom: '', wavePalette: [] as WaveConfig[] };
let observer: MutationObserver | null = null;

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.parentElement?.getBoundingClientRect();
  if (rect) {
    canvas.width = rect.width;
    canvas.height = rect.height;
  } else {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

function recenterMouse(canvas: HTMLCanvasElement) {
  mouseX = canvas.width / 2;
  mouseY = canvas.height / 2;
  targetMouseX = mouseX;
  targetMouseY = mouseY;
}

function drawWave(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, wave: WaveConfig, smoothing: number) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouseInfluence = prefersReduced ? 10 : 70;
  const influenceRadius = prefersReduced ? 160 : 320;

  ctx.save();
  ctx.beginPath();

  for (let x = 0; x <= canvas.width; x += 4) {
    const dx = x - mouseX;
    const dy = canvas.height / 2 - mouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const influence = Math.max(0, 1 - distance / influenceRadius);
    const mouseEffect =
      influence * mouseInfluence * Math.sin(time * 0.001 + x * 0.01 + wave.offset);

    const y =
      canvas.height / 2 +
      Math.sin(x * wave.frequency + time * 0.002 + wave.offset) * wave.amplitude +
      Math.sin(x * wave.frequency * 0.4 + time * 0.003) * (wave.amplitude * 0.45) +
      mouseEffect;

    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = wave.color;
  ctx.globalAlpha = wave.opacity;
  ctx.shadowBlur = 35;
  ctx.shadowColor = wave.color;
  ctx.stroke();
  ctx.restore();
}

onMounted(() => {
  if (!import.meta.client) return;

  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smoothing = prefersReduced ? 0.04 : 0.1;

  themeColors = getThemeColors();

  // Watch for dark mode class changes
  observer = new MutationObserver(() => {
    themeColors = getThemeColors();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  resizeCanvas(canvas);
  recenterMouse(canvas);

  const handleResize = () => {
    resizeCanvas(canvas);
    recenterMouse(canvas);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    targetMouseX = e.clientX - rect.left;
    targetMouseY = e.clientY - rect.top;
  };

  const handleMouseLeave = () => {
    recenterMouse(canvas);
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseleave', handleMouseLeave);

  function animate() {
    time += 1;

    mouseX += (targetMouseX - mouseX) * smoothing;
    mouseY += (targetMouseY - mouseY) * smoothing;

    const gradient = ctx!.createLinearGradient(0, 0, 0, canvas!.height);
    gradient.addColorStop(0, themeColors.backgroundTop);
    gradient.addColorStop(1, themeColors.backgroundBottom);

    ctx!.fillStyle = gradient;
    ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
    ctx!.globalAlpha = 1;
    ctx!.shadowBlur = 0;

    themeColors.wavePalette.forEach((wave) => {
      drawWave(ctx!, canvas!, wave, smoothing);
    });

    animationId = window.requestAnimationFrame(animate);
  }

  animationId = window.requestAnimationFrame(animate);

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseleave', handleMouseLeave);
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
    observer?.disconnect();
  });
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 h-full w-full"
    aria-hidden="true"
  />
</template>
