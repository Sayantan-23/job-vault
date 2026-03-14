<script setup lang="ts">
import type { Job, ScrapeResult, CreateJobManualRequest } from '~/types/job';
import type { ApiResponse } from '~/types/api';

const emit = defineEmits<{
  created: [job: Job];
  switchToManual: [prefill: Partial<CreateJobManualRequest>];
}>();

const api = useApi();
const toast = useToastNotify();

const url = ref('');
const isScraping = ref(false);
const isSaving = ref(false);
const scrapeResult = ref<ScrapeResult | null>(null);
const scrapeError = ref<string | null>(null);

const isValidUrl = computed(() => {
  if (!url.value.trim()) return false;
  try {
    new URL(url.value.trim());
    return true;
  } catch {
    return false;
  }
});

async function onScrape() {
  if (!isValidUrl.value) return;

  isScraping.value = true;
  scrapeResult.value = null;
  scrapeError.value = null;

  try {
    const response = await api.post<ApiResponse<ScrapeResult>>('/jobs/scrape', {
      sourceUrl: url.value.trim(),
    });
    scrapeResult.value = response.data;
  } catch {
    scrapeError.value = 'Could not capture this job posting. You can enter the details manually instead.';
  } finally {
    isScraping.value = false;
  }
}

async function onConfirmSave() {
  if (!scrapeResult.value) return;

  isSaving.value = true;
  try {
    const payload: CreateJobManualRequest = {
      title: scrapeResult.value.title,
      company: scrapeResult.value.company,
      location: scrapeResult.value.location,
      salaryRange: scrapeResult.value.salaryRange,
      sourceUrl: url.value.trim(),
      snapshotMarkdown: scrapeResult.value.snapshotMarkdown,
      status: 'WISHLIST',
    };
    const response = await api.post<ApiResponse<Job>>('/jobs', payload);
    toast.success('Job added to your Wishlist!');
    emit('created', response.data);
  } catch {
    toast.error('Failed to save job. Please try again.');
  } finally {
    isSaving.value = false;
  }
}

function onSwitchToManual() {
  emit('switchToManual', {
    sourceUrl: url.value.trim() || undefined,
    title: scrapeResult.value?.title,
    company: scrapeResult.value?.company,
    location: scrapeResult.value?.location,
    salaryRange: scrapeResult.value?.salaryRange,
  });
}

function onReset() {
  scrapeResult.value = null;
  scrapeError.value = null;
}
</script>

<template>
  <div class="space-y-5">
    <!-- URL Input -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-default">Job Posting URL</label>
      <div class="flex gap-2">
        <UInput
          v-model="url"
          placeholder="https://careers.example.com/job/..."
          icon="i-lucide-link"
          size="lg"
          class="flex-1 font-mono text-sm"
          :disabled="isScraping || !!scrapeResult"
        />
        <UButton
          v-if="!scrapeResult"
          label="Fetch & Save"
          icon="i-lucide-download"
          color="primary"
          size="lg"
          :loading="isScraping"
          :disabled="!isValidUrl || isScraping"
          @click="onScrape"
        />
        <UButton
          v-else
          label="Change URL"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="outline"
          size="lg"
          @click="onReset"
        />
      </div>
    </div>

    <!-- Scraping in progress -->
    <div v-if="isScraping" class="flex items-center gap-3 rounded-xl bg-primary/5 dark:bg-primary/10 px-4 py-3">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-primary" />
      <span class="text-sm text-muted">Capturing job posting...</span>
    </div>

    <!-- Scrape Error -->
    <div v-if="scrapeError" class="space-y-3">
      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-circle-x"
        title="Scrape failed"
        :description="scrapeError"
      />
      <UButton
        label="Enter details manually"
        icon="i-lucide-pencil"
        color="neutral"
        variant="soft"
        @click="onSwitchToManual"
      />
    </div>

    <!-- Scrape Preview -->
    <div
      v-if="scrapeResult"
      class="space-y-4 rounded-xl border border-white/20 dark:border-gray-700/30 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-4"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1 min-w-0">
          <h3 class="text-base font-semibold text-highlighted truncate">
            {{ scrapeResult.title }}
          </h3>
          <p class="text-sm text-muted">{{ scrapeResult.company }}</p>
          <div class="flex flex-wrap gap-3 mt-1">
            <span v-if="scrapeResult.location" class="flex items-center gap-1 text-xs text-dimmed">
              <UIcon name="i-lucide-map-pin" class="size-3.5" />
              {{ scrapeResult.location }}
            </span>
            <span v-if="scrapeResult.salaryRange" class="flex items-center gap-1 text-xs text-dimmed">
              <UIcon name="i-lucide-banknote" class="size-3.5" />
              {{ scrapeResult.salaryRange }}
            </span>
          </div>
        </div>
        <UIcon name="i-lucide-check-circle" class="size-5 text-success shrink-0 mt-0.5" />
      </div>

      <!-- Snapshot preview (first ~200 chars) -->
      <div
        v-if="scrapeResult.snapshotMarkdown"
        class="text-xs text-dimmed bg-muted rounded-lg p-3 max-h-24 overflow-hidden"
      >
        {{ truncateText(scrapeResult.snapshotMarkdown, 250) }}
      </div>

      <div class="flex gap-2 justify-end">
        <UButton
          label="Edit before saving"
          variant="outline"
          color="neutral"
          @click="onSwitchToManual"
        />
        <UButton
          label="Save to Wishlist"
          icon="i-lucide-plus"
          color="primary"
          :loading="isSaving"
          @click="onConfirmSave"
        />
      </div>
    </div>
  </div>
</template>
