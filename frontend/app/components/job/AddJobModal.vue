<script setup lang="ts">
import type { Job, CreateJobManualRequest } from '~/types/job';

const addJobModal = useAddJobModal();

const emit = defineEmits<{
  created: [job: Job];
}>();

const activeTab = ref('url');
const manualPrefill = ref<Partial<CreateJobManualRequest>>({});

const tabItems = [
  { label: 'Paste URL', value: 'url', icon: 'i-lucide-link' },
  { label: 'Manual Entry', value: 'manual', icon: 'i-lucide-pencil' },
];

function onJobCreated(job: Job) {
  addJobModal.close();
  activeTab.value = 'url';
  manualPrefill.value = {};
  emit('created', job);
}

function onSwitchToManual(prefill: Partial<CreateJobManualRequest>) {
  manualPrefill.value = prefill;
  activeTab.value = 'manual';
}
</script>

<template>
  <UModal
    v-model:open="addJobModal.isOpen.value"
    title="Add Job"
    description="Track a new job application"
    :ui="{
      width: 'sm:max-w-xl',
    }"
  >
    <template #body>
      <UTabs
        v-model="activeTab"
        :items="tabItems"
        class="w-full"
      >
        <template #content="{ item }">
          <div class="pt-4">
            <JobUrlPasteForm
              v-if="item.value === 'url'"
              @created="onJobCreated"
              @switch-to-manual="onSwitchToManual"
            />
            <JobManualJobForm
              v-else-if="item.value === 'manual'"
              :prefill="manualPrefill"
              @created="onJobCreated"
            />
          </div>
        </template>
      </UTabs>
    </template>
  </UModal>
</template>
