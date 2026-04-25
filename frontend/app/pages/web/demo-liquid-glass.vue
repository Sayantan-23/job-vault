<script setup lang="ts">
definePageMeta({
  layout: 'web',
})

useSeoMeta({
  title: 'JobVault — Liquid Glass Theme Demo',
  description: 'A demo of the Liquid Glass kanban dashboard theme for JobVault.',
})

// ─── Types ───────────────────────────────────────────────────────

interface JobCard {
  id: number
  title: string
  company: string
  companyLetter: string
  companyColor: string
  tags: string[]
  salary?: string
  date: string
  ghostWarning?: boolean
  roundInfo?: string
}

interface KanbanColumn {
  id: string
  label: string
  glowColor: string
  dotColor: string
  cards: JobCard[]
}

interface StatCard {
  label: string
  value: string
  icon: string
  trend?: string
  trendUp?: boolean
}

// ─── Dummy Data ──────────────────────────────────────────────────

const stats: StatCard[] = [
  { label: 'Total Applied', value: '24', icon: 'i-lucide-send', trend: '+3 this week', trendUp: true },
  { label: 'Response Rate', value: '67%', icon: 'i-lucide-bar-chart-3', trend: '+5% vs last month', trendUp: true },
  { label: 'Interviews', value: '4', icon: 'i-lucide-calendar-check', trend: '2 this week', trendUp: true },
  { label: 'Avg Response', value: '12d', icon: 'i-lucide-clock', trend: '-2d improvement', trendUp: true },
]

const columns: KanbanColumn[] = [
  {
    id: 'applied',
    label: 'Applied',
    glowColor: 'rgba(79, 172, 254, 0.6)',
    dotColor: '#4facfe',
    cards: [
      {
        id: 1,
        title: 'Senior Frontend Engineer',
        company: 'Stripe',
        companyLetter: 'S',
        companyColor: '#635bff',
        tags: ['React', 'Remote'],
        salary: '$180–220k',
        date: '2 days ago',
      },
      {
        id: 2,
        title: 'Full Stack Developer',
        company: 'Vercel',
        companyLetter: 'V',
        companyColor: '#111',
        tags: ['Next.js', 'TypeScript'],
        date: '5 days ago',
        ghostWarning: true,
      },
      {
        id: 3,
        title: 'React Developer',
        company: 'Linear',
        companyLetter: 'L',
        companyColor: '#5e6ad2',
        tags: ['React', 'Remote'],
        salary: '$150–180k',
        date: '1 day ago',
      },
    ],
  },
  {
    id: 'interview',
    label: 'Interview',
    glowColor: 'rgba(255, 199, 95, 0.6)',
    dotColor: '#ffc75f',
    cards: [
      {
        id: 4,
        title: 'Design Engineer',
        company: 'Figma',
        companyLetter: 'F',
        companyColor: '#a259ff',
        tags: ['Vue', 'Design Systems'],
        date: 'Round 2 Tomorrow',
        roundInfo: 'Round 2',
      },
      {
        id: 5,
        title: 'Software Engineer',
        company: 'Notion',
        companyLetter: 'N',
        companyColor: '#111',
        tags: ['Full Stack', 'Remote'],
        date: 'Phone screen Mar 20',
        roundInfo: 'Phone Screen',
      },
    ],
  },
  {
    id: 'offer',
    label: 'Offer',
    glowColor: 'rgba(52, 211, 153, 0.6)',
    dotColor: '#34d399',
    cards: [
      {
        id: 6,
        title: 'UI Engineer',
        company: 'Raycast',
        companyLetter: 'R',
        companyColor: '#ff6363',
        tags: ['React', 'Remote'],
        salary: '$185k',
        date: 'Offer received Mar 12',
      },
    ],
  },
  {
    id: 'rejected',
    label: 'Rejected',
    glowColor: 'rgba(248, 113, 113, 0.5)',
    dotColor: '#f87171',
    cards: [
      {
        id: 7,
        title: 'Frontend Lead',
        company: 'Meta',
        companyLetter: 'M',
        companyColor: '#0082fb',
        tags: ['React', 'Leadership'],
        date: 'Rejected Mar 8',
      },
    ],
  },
]

const hoveredCard = ref<number | null>(null)
</script>

<template>
  <div class="lg-demo">
    <!-- Iridescent shimmer background -->
    <div class="lg-bg">
      <div class="lg-shimmer" />
      <div class="lg-gradient-orb lg-orb-1" />
      <div class="lg-gradient-orb lg-orb-2" />
      <div class="lg-gradient-orb lg-orb-3" />
    </div>

    <div class="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Board Header -->
      <header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="lg-heading text-3xl font-bold tracking-tight">
            Job Pipeline
          </h1>
          <p class="lg-text-muted mt-1 text-sm">
            Track your applications across every stage
          </p>
        </div>
        <button class="lg-btn-add group inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300">
          <UIcon name="i-lucide-plus" class="size-4 transition-transform duration-200 group-hover:rotate-90" />
          Add Job
        </button>
      </header>

      <!-- Stats Bar -->
      <div class="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="lg-glass-card rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02]"
        >
          <div class="mb-3 flex items-center justify-between">
            <span class="lg-text-muted text-xs font-medium uppercase tracking-wider">
              {{ stat.label }}
            </span>
            <div class="lg-icon-pill flex size-8 items-center justify-center rounded-lg">
              <UIcon :name="stat.icon" class="size-4 text-cyan-400" />
            </div>
          </div>
          <div class="lg-heading text-2xl font-bold">
            {{ stat.value }}
          </div>
          <div v-if="stat.trend" class="mt-1 flex items-center gap-1 text-xs text-emerald-400/80">
            <UIcon v-if="stat.trendUp" name="i-lucide-trending-up" class="size-3" />
            {{ stat.trend }}
          </div>
        </div>
      </div>

      <!-- Kanban Board -->
      <div class="lg-kanban-scroll flex gap-4 overflow-x-auto pb-4">
        <div
          v-for="column in columns"
          :key="column.id"
          class="lg-column min-w-[280px] flex-1 rounded-2xl p-3"
        >
          <!-- Column Header -->
          <div class="mb-4 flex items-center justify-between px-1">
            <div class="flex items-center gap-2.5">
              <span
                class="size-2.5 rounded-full"
                :style="{ backgroundColor: column.dotColor, boxShadow: '0 0 8px ' + column.glowColor }"
              />
              <span class="lg-heading text-sm font-semibold">
                {{ column.label }}
              </span>
              <span class="lg-count-badge ml-0.5 rounded-full px-2 py-0.5 text-xs font-medium">
                {{ column.cards.length }}
              </span>
            </div>
            <button class="lg-icon-btn rounded-lg p-1 transition-colors duration-200">
              <UIcon name="i-lucide-more-horizontal" class="size-4" />
            </button>
          </div>

          <!-- Cards -->
          <div class="flex flex-col gap-3">
            <div
              v-for="card in column.cards"
              :key="card.id"
              class="lg-job-card group relative cursor-pointer rounded-xl p-4 transition-all duration-300"
              :class="{ 'lg-card-hovered': hoveredCard === card.id }"
              @mouseenter="hoveredCard = card.id"
              @mouseleave="hoveredCard = null"
            >
              <!-- Prismatic edge highlight on hover -->
              <div class="lg-prismatic-edge pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <!-- Ghost Warning Badge -->
              <div
                v-if="card.ghostWarning"
                class="lg-ghost-badge mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              >
                <UIcon name="i-lucide-ghost" class="size-3.5" />
                No response — possible ghost
              </div>

              <!-- Company & Title -->
              <div class="relative flex items-start gap-3">
                <div
                  class="lg-company-icon flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                  :style="{ backgroundColor: card.companyColor }"
                >
                  {{ card.companyLetter }}
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="lg-heading truncate text-sm font-semibold leading-tight">
                    {{ card.title }}
                  </h3>
                  <p class="lg-text-muted mt-0.5 text-xs">
                    {{ card.company }}
                  </p>
                </div>
              </div>

              <!-- Tags -->
              <div class="mt-3 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in card.tags"
                  :key="tag"
                  class="lg-tag rounded-md px-2 py-0.5 text-[11px] font-medium"
                >
                  {{ tag }}
                </span>
              </div>

              <!-- Bottom row: salary + date -->
              <div class="mt-3 flex items-center justify-between">
                <span v-if="card.salary" class="text-xs font-semibold text-cyan-400/90">
                  {{ card.salary }}
                </span>
                <span v-else />
                <span class="lg-text-muted text-[11px]">
                  {{ card.date }}
                </span>
              </div>

              <!-- Round info pill for interviews -->
              <div
                v-if="card.roundInfo"
                class="lg-round-pill mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              >
                <UIcon name="i-lucide-video" class="size-3" />
                {{ card.roundInfo }}
              </div>
            </div>
          </div>

          <!-- Add card button -->
          <button class="lg-add-card mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all duration-200">
            <UIcon name="i-lucide-plus" class="size-3.5" />
            Add application
          </button>
        </div>
      </div>

      <!-- Theme label -->
      <div class="mt-12 flex items-center justify-center">
        <div class="lg-glass-card inline-flex items-center gap-3 rounded-full px-6 py-3">
          <div class="size-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500" />
          <span class="lg-heading text-sm font-semibold tracking-wide">Liquid Glass</span>
          <span class="lg-text-muted text-xs">Theme Preview</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   LIQUID GLASS THEME — Scoped Styles
   ============================================ */

.lg-demo {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(145deg, #0c1929 0%, #0f1f35 40%, #0a1628 100%);
  overflow: hidden;
  font-family: 'Manrope', system-ui, -apple-system, sans-serif;
}

.lg-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.lg-shimmer {
  position: absolute;
  inset: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    from 0deg at 50% 50%,
    transparent 0deg,
    rgba(79, 172, 254, 0.03) 60deg,
    transparent 120deg,
    rgba(0, 242, 254, 0.02) 180deg,
    transparent 240deg,
    rgba(79, 172, 254, 0.03) 300deg,
    transparent 360deg
  );
  animation: lg-shimmer-rotate 30s linear infinite;
}

@keyframes lg-shimmer-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.lg-gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  will-change: transform;
}

.lg-orb-1 {
  width: 600px;
  height: 600px;
  top: -10%;
  right: -5%;
  background: radial-gradient(circle, rgba(79, 172, 254, 0.12) 0%, transparent 70%);
  animation: lg-orb-float-1 25s ease-in-out infinite;
}

.lg-orb-2 {
  width: 500px;
  height: 500px;
  bottom: 10%;
  left: -10%;
  background: radial-gradient(circle, rgba(0, 242, 254, 0.08) 0%, transparent 70%);
  animation: lg-orb-float-2 30s ease-in-out infinite;
}

.lg-orb-3 {
  width: 400px;
  height: 400px;
  top: 40%;
  left: 40%;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.06) 0%, transparent 70%);
  animation: lg-orb-float-3 35s ease-in-out infinite;
}

@keyframes lg-orb-float-1 {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(-40px, 30px); }
  66% { transform: translate(20px, -20px); }
}

@keyframes lg-orb-float-2 {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(30px, -40px); }
  66% { transform: translate(-20px, 20px); }
}

@keyframes lg-orb-float-3 {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(-20px, -30px); }
  66% { transform: translate(30px, 15px); }
}

.lg-heading {
  color: #d0e8ff;
}

.lg-text-muted {
  color: rgba(160, 200, 240, 0.5);
}

.lg-glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.lg-glass-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.lg-icon-pill {
  background: rgba(79, 172, 254, 0.1);
  border: 1px solid rgba(79, 172, 254, 0.15);
}

.lg-btn-add {
  background: linear-gradient(135deg, #4facfe 0%, #00c6fb 100%);
  box-shadow:
    0 4px 20px rgba(79, 172, 254, 0.35),
    0 0 40px rgba(79, 172, 254, 0.15);
}

.lg-btn-add:hover {
  box-shadow:
    0 6px 28px rgba(79, 172, 254, 0.5),
    0 0 60px rgba(79, 172, 254, 0.2);
  transform: translateY(-1px);
}

.lg-column {
  background: rgba(255, 255, 255, 0.025);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    0 2px 16px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.lg-count-badge {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(160, 200, 240, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.lg-icon-btn {
  color: rgba(160, 200, 240, 0.4);
}

.lg-icon-btn:hover {
  color: rgba(160, 200, 240, 0.7);
  background: rgba(255, 255, 255, 0.06);
}

.lg-job-card {
  position: relative;
  background: rgba(255, 255, 255, 0.035);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.lg-job-card:hover,
.lg-card-hovered {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 0 20px rgba(79, 172, 254, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.lg-prismatic-edge {
  background: linear-gradient(
    135deg,
    rgba(79, 172, 254, 0.15) 0%,
    rgba(0, 242, 254, 0.1) 20%,
    rgba(167, 139, 250, 0.1) 40%,
    rgba(251, 191, 36, 0.08) 60%,
    rgba(52, 211, 153, 0.1) 80%,
    rgba(79, 172, 254, 0.15) 100%
  );
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  padding: 1px;
}

.lg-company-icon {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.lg-tag {
  background: rgba(79, 172, 254, 0.1);
  color: rgba(160, 210, 255, 0.7);
  border: 1px solid rgba(79, 172, 254, 0.12);
}

.lg-ghost-badge {
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.2);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.1);
  animation: lg-ghost-pulse 3s ease-in-out infinite;
}

@keyframes lg-ghost-pulse {
  0%, 100% { box-shadow: 0 0 12px rgba(251, 191, 36, 0.1); }
  50% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.2); }
}

.lg-round-pill {
  background: rgba(255, 199, 95, 0.1);
  color: rgba(255, 199, 95, 0.8);
  border: 1px solid rgba(255, 199, 95, 0.15);
}

.lg-add-card {
  color: rgba(160, 200, 240, 0.35);
  border: 1px dashed rgba(255, 255, 255, 0.06);
  background: transparent;
}

.lg-add-card:hover {
  color: rgba(160, 200, 240, 0.6);
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
}

.lg-kanban-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.lg-kanban-scroll::-webkit-scrollbar {
  display: none;
}

@media (max-width: 1023px) {
  .lg-kanban-scroll {
    flex-direction: column;
  }

  .lg-kanban-scroll > div {
    min-width: 100% !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lg-shimmer,
  .lg-gradient-orb {
    animation: none !important;
  }

  .lg-ghost-badge {
    animation: none !important;
  }

  .lg-job-card {
    transition: none !important;
  }
}
</style>
