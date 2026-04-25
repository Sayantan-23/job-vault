<script setup lang="ts">
definePageMeta({
  layout: 'web',
})

useSeoMeta({
  title: 'JobVault — Frosted Minimal Theme Demo',
  description: 'A demo of the Frosted Minimal kanban dashboard theme for JobVault.',
})

interface JobCard {
  id: number
  title: string
  company: string
  companyLetter: string
  tags: string[]
  salary?: string
  date: string
  ghostWarning?: boolean
  roundInfo?: string
}

interface KanbanColumn {
  id: string
  label: string
  dotClass: string
  cards: JobCard[]
}

interface StatCard {
  label: string
  value: string
  icon: string
  trend?: string
  trendUp?: boolean
}

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
    dotClass: 'fm-dot-neutral',
    cards: [
      { id: 1, title: 'Senior Frontend Engineer', company: 'Stripe', companyLetter: 'S', tags: ['React', 'Remote'], salary: '$180–220k', date: '2 days ago' },
      { id: 2, title: 'Full Stack Developer', company: 'Vercel', companyLetter: 'V', tags: ['Next.js', 'TypeScript'], date: '5 days ago', ghostWarning: true },
      { id: 3, title: 'React Developer', company: 'Linear', companyLetter: 'L', tags: ['React', 'Remote'], salary: '$150–180k', date: '1 day ago' },
    ],
  },
  {
    id: 'interview',
    label: 'Interview',
    dotClass: 'fm-dot-neutral',
    cards: [
      { id: 4, title: 'Design Engineer', company: 'Figma', companyLetter: 'F', tags: ['Vue', 'Design Systems'], date: 'Round 2 Tomorrow', roundInfo: 'Round 2' },
      { id: 5, title: 'Software Engineer', company: 'Notion', companyLetter: 'N', tags: ['Full Stack', 'Remote'], date: 'Phone screen Mar 20', roundInfo: 'Phone Screen' },
    ],
  },
  {
    id: 'offer',
    label: 'Offer',
    dotClass: 'fm-dot-green',
    cards: [
      { id: 6, title: 'UI Engineer', company: 'Raycast', companyLetter: 'R', tags: ['React', 'Remote'], salary: '$185k', date: 'Offer received Mar 12' },
    ],
  },
  {
    id: 'rejected',
    label: 'Rejected',
    dotClass: 'fm-dot-neutral',
    cards: [
      { id: 7, title: 'Frontend Lead', company: 'Meta', companyLetter: 'M', tags: ['React', 'Leadership'], date: 'Rejected Mar 8' },
    ],
  },
]
</script>

<template>
  <div class="fm-demo">
    <!-- Subtle dot pattern -->
    <div class="fm-dots" />

    <div class="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Board Header -->
      <header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="fm-heading text-3xl font-bold tracking-tight">
            Job Pipeline
          </h1>
          <p class="fm-muted mt-1 text-sm">
            Track your applications across every stage
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button class="fm-btn-ghost inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200">
            <UIcon name="i-lucide-filter" class="size-4" />
            Filter
          </button>
          <button class="fm-btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200">
            <UIcon name="i-lucide-plus" class="size-4" />
            Add Job
          </button>
        </div>
      </header>

      <!-- Stats Bar -->
      <div class="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="fm-card rounded-2xl p-4 transition-all duration-300"
        >
          <div class="mb-3 flex items-center justify-between">
            <span class="fm-muted text-xs font-medium uppercase tracking-wider">
              {{ stat.label }}
            </span>
            <div class="fm-icon-box flex size-8 items-center justify-center rounded-lg">
              <UIcon :name="stat.icon" class="fm-muted size-4" />
            </div>
          </div>
          <div class="fm-heading text-2xl font-bold">
            {{ stat.value }}
          </div>
          <div v-if="stat.trend" class="mt-1 text-xs" :class="stat.trendUp ? 'text-emerald-400/70' : 'text-red-400/50'">
            {{ stat.trend }}
          </div>
        </div>
      </div>

      <!-- Kanban Board -->
      <div class="fm-kanban-scroll flex gap-4 overflow-x-auto pb-4">
        <div
          v-for="column in columns"
          :key="column.id"
          class="fm-column min-w-[280px] flex-1 rounded-2xl p-3"
        >
          <!-- Column Header -->
          <div class="mb-4 flex items-center justify-between px-1">
            <div class="flex items-center gap-2.5">
              <span class="size-2 rounded-full" :class="column.dotClass" />
              <span class="fm-heading text-sm font-semibold">
                {{ column.label }}
              </span>
              <span class="fm-count rounded-full px-2 py-0.5 text-xs font-medium">
                {{ column.cards.length }}
              </span>
            </div>
            <button class="fm-icon-btn rounded-lg p-1 transition-colors duration-200">
              <UIcon name="i-lucide-more-horizontal" class="size-4" />
            </button>
          </div>

          <!-- Cards -->
          <div class="flex flex-col gap-2">
            <div
              v-for="card in column.cards"
              :key="card.id"
              class="fm-job-card cursor-pointer rounded-xl p-4 transition-all duration-200"
            >
              <!-- Ghost Warning -->
              <div
                v-if="card.ghostWarning"
                class="fm-ghost mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              >
                <UIcon name="i-lucide-ghost" class="size-3.5" />
                No response — possible ghost
              </div>

              <!-- Company & Title -->
              <div class="flex items-start gap-3">
                <div class="fm-company-icon flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
                  {{ card.companyLetter }}
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="fm-heading truncate text-sm font-semibold leading-tight">
                    {{ card.title }}
                  </h3>
                  <p class="fm-muted mt-0.5 text-xs">
                    {{ card.company }}
                  </p>
                </div>
              </div>

              <!-- Tags -->
              <div class="mt-3 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in card.tags"
                  :key="tag"
                  class="fm-tag rounded-md px-2 py-0.5 text-[11px] font-medium"
                  :class="tag === 'Remote' ? 'fm-tag-green' : ''"
                >
                  {{ tag }}
                </span>
              </div>

              <!-- Bottom row -->
              <div class="mt-3 flex items-center justify-between">
                <span v-if="card.salary" class="fm-heading text-xs font-semibold">
                  {{ card.salary }}
                </span>
                <span v-else />
                <span class="fm-muted-deep text-[11px]">
                  {{ card.date }}
                </span>
              </div>

              <!-- Round info -->
              <div
                v-if="card.roundInfo"
                class="fm-round mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              >
                <UIcon name="i-lucide-video" class="size-3" />
                {{ card.roundInfo }}
              </div>
            </div>
          </div>

          <!-- Add card -->
          <button class="fm-add-card mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all duration-200">
            <UIcon name="i-lucide-plus" class="size-3.5" />
            Add application
          </button>
        </div>
      </div>

      <!-- Theme label -->
      <div class="mt-12 flex items-center justify-center">
        <div class="fm-card inline-flex items-center gap-3 rounded-full px-6 py-3">
          <div class="fm-dot-green size-3 rounded-full" />
          <span class="fm-heading text-sm font-semibold tracking-wide">Frosted Minimal</span>
          <span class="fm-muted text-xs">Theme Preview</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   FROSTED MINIMAL THEME — Scoped Styles
   ============================================ */

.fm-demo {
  position: relative;
  min-height: 100vh;
  background: #0e0e10;
  overflow: hidden;
  font-family: 'Manrope', system-ui, -apple-system, sans-serif;
}

.fm-dots {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Typography */
.fm-heading { color: #ddd; }
.fm-muted { color: rgba(255, 255, 255, 0.3); }
.fm-muted-deep { color: rgba(255, 255, 255, 0.2); }

/* Glass card */
.fm-card {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

/* Buttons */
.fm-btn-primary {
  background: #fff;
  color: #000;
}
.fm-btn-primary:hover {
  background: #e8e8e8;
}

.fm-btn-ghost {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
}
.fm-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
}

/* Icon box */
.fm-icon-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

/* Kanban column */
.fm-column {
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.03);
}

/* Count badge */
.fm-count {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.35);
}

/* Icon button */
.fm-icon-btn { color: rgba(255, 255, 255, 0.2); }
.fm-icon-btn:hover { color: rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.04); }

/* Status dots */
.fm-dot-neutral { background: #555; }
.fm-dot-green {
  background: #34d399;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.5);
}

/* Job card */
.fm-job-card {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.fm-job-card:hover {
  background: rgba(255, 255, 255, 0.045);
  border-color: rgba(255, 255, 255, 0.07);
}

/* Company icon */
.fm-company-icon {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
}

/* Tags */
.fm-tag {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.fm-tag-green {
  background: rgba(52, 211, 153, 0.08);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.1);
}

/* Ghost warning */
.fm-ghost {
  background: rgba(251, 191, 36, 0.08);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.12);
}

/* Round pill */
.fm-round {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Add card */
.fm-add-card {
  color: rgba(255, 255, 255, 0.15);
  border: 1px dashed rgba(255, 255, 255, 0.04);
  background: transparent;
}
.fm-add-card:hover {
  color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

/* Kanban scroll */
.fm-kanban-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.fm-kanban-scroll::-webkit-scrollbar { display: none; }

@media (max-width: 1023px) {
  .fm-kanban-scroll { flex-direction: column; }
  .fm-kanban-scroll > div { min-width: 100% !important; }
}
</style>
