<script setup lang="ts">
import type { JobStatus } from '~/utils/constants';

interface JobStatusBadgeProps {
  status: JobStatus;
}

const props = defineProps<JobStatusBadgeProps>();
</script>

<template>
  <UBadge
    :label="JOB_STATUS_LABELS[props.status]"
    :color="JOB_STATUS_COLORS[props.status] as 'neutral' | 'info' | 'warning' | 'success' | 'error'"
    variant="subtle"
    size="sm"
  />
</template>
