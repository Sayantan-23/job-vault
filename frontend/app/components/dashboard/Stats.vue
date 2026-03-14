<script setup lang="ts">
import type { DashboardStats } from '~/types/job';

interface DashboardStatsProps {
  stats: DashboardStats;
}

const props = defineProps<DashboardStatsProps>();

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  iconBgClass: string;
  iconColorClass: string;
}

const statCards = computed<StatCard[]>(() => {
  return [
    {
      label: 'Total Jobs',
      value: props.stats.totalJobs,
      icon: 'i-lucide-briefcase',
      color: 'primary',
      iconBgClass: 'bg-primary/10',
      iconColorClass: 'text-primary',
    },
    {
      label: 'Applied',
      value: props.stats.byStatus.APPLIED || 0,
      icon: 'i-lucide-send',
      color: 'info',
      iconBgClass: 'bg-info/10',
      iconColorClass: 'text-info',
    },
    {
      label: 'Interviewing',
      value: props.stats.byStatus.INTERVIEWING || 0,
      icon: 'i-lucide-message-square',
      color: 'warning',
      iconBgClass: 'bg-warning/10',
      iconColorClass: 'text-warning',
    },
    {
      label: 'Offers',
      value: props.stats.byStatus.OFFER || 0,
      icon: 'i-lucide-trophy',
      color: 'success',
      iconBgClass: 'bg-success/10',
      iconColorClass: 'text-success',
    },
    {
      label: 'Ghost Alerts',
      value: props.stats.ghostAlerts,
      icon: 'i-lucide-ghost',
      color: 'error',
      iconBgClass: 'bg-error/10',
      iconColorClass: 'text-error',
    },
  ];
});
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    <div
      v-for="card in statCards"
      :key="card.label"
      class="rounded-xl border border-white/20 dark:border-gray-700/30 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-4 shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div class="flex items-center gap-3">
        <div class="rounded-lg p-2" :class="card.iconBgClass">
          <UIcon :name="card.icon" class="size-5" :class="card.iconColorClass" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-muted truncate">{{ card.label }}</p>
          <p class="text-xl font-bold text-highlighted">{{ card.value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
