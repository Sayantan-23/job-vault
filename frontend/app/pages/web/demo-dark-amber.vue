<script setup lang="ts">
definePageMeta({
  layout: 'web',
})

useSeoMeta({
  title: 'JobVault — Dark Amber Theme Demo',
  description: 'A demo of the Dark Amber cybersecurity-dashboard themed kanban board for JobVault.',
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
  ghostDays?: number
  roundInfo?: string
}

interface KanbanColumn {
  id: string
  label: string
  dotColor: string
  edgeColor: string
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
  { label: 'Interviews', value: '4', icon: 'i-lucide-calendar-check', trend: '2 scheduled', trendUp: true },
  { label: 'Avg Response', value: '12d', icon: 'i-lucide-clock', trend: '+2 days', trendUp: false },
]

const columns: KanbanColumn[] = [
  {
    id: 'applied',
    label: 'Applied',
    dotColor: '#f0a030',
    edgeColor: '#f0a030',
    cards: [
      { id: 1, title: 'Senior Frontend Engineer', company: 'Stripe', companyLetter: 'S', tags: ['React', 'Remote'], salary: '$180–220k', date: '2 days ago' },
      { id: 2, title: 'Full Stack Developer', company: 'Vercel', companyLetter: 'V', tags: ['Next.js', 'TypeScript'], date: '5 days ago', ghostWarning: true, ghostDays: 12 },
      { id: 3, title: 'React Developer', company: 'Linear', companyLetter: 'L', tags: ['React', 'Remote'], salary: '$150–180k', date: '1 day ago' },
    ],
  },
  {
    id: 'interview',
    label: 'Interview',
    dotColor: '#ffc83c',
    edgeColor: '#ffc83c',
    cards: [
      { id: 4, title: 'Design Engineer', company: 'Figma', companyLetter: 'F', tags: ['Vue', 'Design Systems'], date: 'Round 2 Tomorrow', roundInfo: 'Round 2' },
      { id: 5, title: 'Software Engineer', company: 'Notion', companyLetter: 'N', tags: ['Full Stack', 'Remote'], date: 'Phone screen Mar 20', roundInfo: 'Phone Screen' },
    ],
  },
  {
    id: 'offer',
    label: 'Offer',
    dotColor: '#50dc8c',
    edgeColor: '#50dc8c',
    cards: [
      { id: 6, title: 'UI Engineer', company: 'Raycast', companyLetter: 'R', tags: ['React', 'Remote'], salary: '$185k', date: 'Offer received Mar 12' },
    ],
  },
  {
    id: 'rejected',
    label: 'Rejected',
    dotColor: '#ff5050',
    edgeColor: '#ff5050',
    cards: [
      { id: 7, title: 'Frontend Lead', company: 'Meta', companyLetter: 'M', tags: ['React', 'Leadership'], date: 'Rejected Mar 8' },
    ],
  },
]
</script>

<template>
  <div class="da-demo">
    <!-- Warm ambient background -->
    <div class="da-bg">
      <div class="da-glow da-glow-1" />
      <div class="da-glow da-glow-2" />
    </div>

    <div class="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Board Header -->
      <header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="da-heading text-3xl font-bold tracking-tight">
            Job Pipeline
          </h1>
          <p class="da-muted mt-1 text-sm">
            Track your applications across every stage
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button class="da-btn-ghost inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200">
            <UIcon name="i-lucide-filter" class="size-4" />
            Filter
          </button>
          <button class="da-btn-primary group inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-300">
            <UIcon name="i-lucide-plus" class="size-4 transition-transform duration-200 group-hover:rotate-90" />
            Add Job
          </button>
        </div>
      </header>

      <!-- Stats Bar -->
      <div class="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="da-card rounded-2xl p-4 transition-all duration-300 hover:da-card-hover"
        >
          <div class="mb-3 flex items-center justify-between">
            <span class="da-muted text-xs font-medium uppercase tracking-wider">
              {{ stat.label }}
            </span>
            <div class="da-icon-box flex size-8 items-center justify-center rounded-lg">
              <UIcon :name="stat.icon" class="size-4 text-amber-400/70" />
            </div>
          </div>
          <div class="da-heading text-2xl font-bold">
            {{ stat.value }}
          </div>
          <div v-if="stat.trend" class="mt-1 text-xs" :class="stat.trendUp ? 'text-emerald-400/70' : 'text-red-400/60'">
            {{ stat.trend }}
          </div>
        </div>
      </div>

      <!-- Kanban Board -->
      <div class="da-kanban-scroll flex gap-4 overflow-x-auto pb-4">
        <div
          v-for="column in columns"
          :key="column.id"
          class="da-column min-w-[280px] flex-1 rounded-2xl p-3"
        >
          <!-- Column Header -->
          <div class="mb-4 flex items-center justify-between px-1">
            <div class="flex items-center gap-2.5">
              <span
                class="size-2.5 rounded-full"
                :style="{ backgroundColor: column.dotColor, boxShadow: '0 0 8px ' + column.dotColor + '66' }"
              />
              <span class="da-heading text-sm font-semibold">
                {{ column.label }}
              </span>
              <span class="da-count rounded-full px-2 py-0.5 text-xs font-medium">
                {{ column.cards.length }}
              </span>
            </div>
            <button class="da-icon-btn rounded-lg p-1 transition-colors duration-200">
              <UIcon name="i-lucide-more-horizontal" class="size-4" />
            </button>
          </div>

          <!-- Cards -->
          <div class="flex flex-col gap-2">
            <div
              v-for="card in column.cards"
              :key="card.id"
              class="da-job-card cursor-pointer rounded-xl p-4 pl-5 transition-all duration-200"
              :style="{ '--edge-color': column.edgeColor }"
            >
              <!-- Left edge status indicator -->
              <div
                class="da-edge-indicator"
                :style="{ backgroundColor: column.edgeColor }"
              />

              <!-- Ghost Warning -->
              <div
                v-if="card.ghostWarning"
                class="da-ghost mb-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold"
              >
                <UIcon name="i-lucide-alert-triangle" class="size-3.5" />
                Ghost alert — {{ card.ghostDays }}d no response
              </div>

              <!-- Company & Title -->
              <div class="flex items-start gap-3">
                <div class="da-company-icon flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
                  {{ card.companyLetter }}
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="da-heading truncate text-sm font-semibold leading-tight">
                    {{ card.title }}
                  </h3>
                  <p class="da-muted mt-0.5 text-xs">
                    {{ card.company }}
                  </p>
                </div>
              </div>

              <!-- Tags -->
              <div class="mt-3 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in card.tags"
                  :key="tag"
                  class="da-tag rounded-md px-2 py-0.5 text-[11px] font-medium"
                  :class="tag === 'Remote' ? 'da-tag-green' : ''"
                >
                  {{ tag }}
                </span>
              </div>

              <!-- Bottom row -->
              <div class="mt-3 flex items-center justify-between">
                <span v-if="card.salary" class="text-xs font-semibold text-amber-300/80">
                  {{ card.salary }}
                </span>
                <span v-else />
                <span class="da-muted-deep text-[11px]">
                  {{ card.date }}
                </span>
              </div>

              <!-- Round info -->
              <div
                v-if="card.roundInfo"
                class="da-round mt-2.5 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium"
              >
                <UIcon name="i-lucide-video" class="size-3" />
                {{ card.roundInfo }}
              </div>
            </div>
          </div>

          <!-- Add card -->
          <button class="da-add-card mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all duration-200">
            <UIcon name="i-lucide-plus" class="size-3.5" />
            Add application
          </button>
        </div>
      </div>

      <!-- Theme label -->
      <div class="mt-12 flex items-center justify-center">
        <div class="da-card inline-flex items-center gap-3 rounded-full px-6 py-3">
          <div class="size-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
          <span class="da-heading text-sm font-semibold tracking-wide">Dark Amber</span>
          <span class="da-muted text-xs">Theme Preview</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   DARK AMBER THEME — Scoped Styles
   ============================================ */

.da-demo {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(160deg, #0f0c08 0%, #110e08 50%, #0d0a06 100%);
  overflow: hidden;
  font-family: 'Manrope', system-ui, -apple-system, sans-serif;
}

/* Warm ambient glows */
.da-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.da-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
}

.da-glow-1 {
  width: 600px;
  height: 600px;
  top: -5%;
  right: 10%;
  background: radial-gradient(circle, rgba(240, 160, 48, 0.06) 0%, transparent 70%);
}

.da-glow-2 {
  width: 500px;
  height: 500px;
  bottom: 5%;
  left: 5%;
  background: radial-gradient(circle, rgba(255, 107, 53, 0.04) 0%, transparent 70%);
}

/* Typography */
.da-heading { color: #e8d8c0; }
.da-muted { color: rgba(230, 190, 140, 0.4); }
.da-muted-deep { color: rgba(200, 160, 110, 0.35); }

/* Card */
.da-card {
  background: rgba(255, 160, 40, 0.03);
  border: 1px solid rgba(255, 160, 40, 0.06);
}
.da-card-hover,
.da-card:hover {
  background: rgba(255, 160, 40, 0.05);
  border-color: rgba(255, 160, 40, 0.1);
}

/* Buttons */
.da-btn-primary {
  background: linear-gradient(135deg, #f0a030 0%, #ff6b35 100%);
  color: #1a1008;
  box-shadow: 0 4px 16px rgba(240, 160, 48, 0.2);
}
.da-btn-primary:hover {
  box-shadow: 0 6px 24px rgba(240, 160, 48, 0.35);
  transform: translateY(-1px);
}

.da-btn-ghost {
  background: rgba(255, 160, 40, 0.06);
  border: 1px solid rgba(255, 160, 40, 0.1);
  color: rgba(230, 190, 140, 0.6);
}
.da-btn-ghost:hover {
  background: rgba(255, 160, 40, 0.1);
  color: rgba(230, 190, 140, 0.8);
}

/* Icon box */
.da-icon-box {
  background: rgba(240, 160, 48, 0.06);
  border: 1px solid rgba(240, 160, 48, 0.08);
}

/* Column */
.da-column {
  background: rgba(255, 160, 40, 0.02);
  border: 1px solid rgba(255, 160, 40, 0.05);
}

/* Count badge */
.da-count {
  background: rgba(255, 160, 40, 0.08);
  color: #d49030;
}

/* Icon button */
.da-icon-btn { color: rgba(230, 190, 140, 0.3); }
.da-icon-btn:hover { color: rgba(230, 190, 140, 0.6); background: rgba(255, 160, 40, 0.06); }

/* Job card with left edge */
.da-job-card {
  position: relative;
  background: rgba(255, 160, 40, 0.03);
  border: 1px solid rgba(255, 160, 40, 0.06);
  overflow: hidden;
}
.da-job-card:hover {
  background: rgba(255, 160, 40, 0.06);
  border-color: rgba(255, 160, 40, 0.12);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

/* Left edge status indicator — the signature element */
.da-edge-indicator {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
}

/* Company icon */
.da-company-icon {
  background: rgba(240, 160, 48, 0.1);
  color: #f0a030;
}

/* Tags */
.da-tag {
  background: rgba(240, 160, 48, 0.08);
  color: rgba(230, 190, 140, 0.6);
  border: 1px solid rgba(240, 160, 48, 0.08);
}
.da-tag-green {
  background: rgba(80, 220, 140, 0.08);
  color: #50dc8c;
  border-color: rgba(80, 220, 140, 0.1);
}

/* Ghost warning — security alert style */
.da-ghost {
  background: rgba(255, 80, 80, 0.08);
  color: #ff6b6b;
  border: 1px solid rgba(255, 80, 80, 0.15);
}

/* Round pill */
.da-round {
  background: rgba(255, 200, 60, 0.08);
  color: rgba(255, 200, 60, 0.7);
  border: 1px solid rgba(255, 200, 60, 0.1);
}

/* Add card */
.da-add-card {
  color: rgba(230, 190, 140, 0.2);
  border: 1px dashed rgba(255, 160, 40, 0.06);
  background: transparent;
}
.da-add-card:hover {
  color: rgba(230, 190, 140, 0.4);
  border-color: rgba(255, 160, 40, 0.12);
  background: rgba(255, 160, 40, 0.03);
}

/* Kanban scroll */
.da-kanban-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.da-kanban-scroll::-webkit-scrollbar { display: none; }

@media (max-width: 1023px) {
  .da-kanban-scroll { flex-direction: column; }
  .da-kanban-scroll > div { min-width: 100% !important; }
}
</style>
