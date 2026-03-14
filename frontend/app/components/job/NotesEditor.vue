<script setup lang="ts">
import type { ApiResponse } from '~/types/api';
import type { Job } from '~/types/job';

interface JobNotesEditorProps {
  jobId: string;
  notes?: string;
}

const props = withDefaults(defineProps<JobNotesEditorProps>(), {
  notes: '',
});

const emit = defineEmits<{
  updated: [notes: string];
}>();

const api = useApi();

const localNotes = ref(props.notes || '');
const isSaving = ref(false);
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Sync external prop changes (e.g., job re-fetched)
watch(
  () => props.notes,
  (newNotes) => {
    if (newNotes !== undefined && newNotes !== localNotes.value) {
      localNotes.value = newNotes;
    }
  },
);

// Watch for notes changes and auto-save with debounce
watch(localNotes, (newVal) => {
  if (newVal === (props.notes || '')) {
    saveStatus.value = 'idle';
    return;
  }

  saveStatus.value = 'saving';

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    await saveNotes();
  }, 1500);
});

async function saveNotes() {
  isSaving.value = true;
  saveStatus.value = 'saving';

  try {
    await api.patch<ApiResponse<Job>>(`/jobs/${props.jobId}`, {
      notes: localNotes.value,
    });
    saveStatus.value = 'saved';
    emit('updated', localNotes.value);

    // Reset status after 2s
    setTimeout(() => {
      if (saveStatus.value === 'saved') {
        saveStatus.value = 'idle';
      }
    }, 2000);
  } catch {
    saveStatus.value = 'idle';
  } finally {
    isSaving.value = false;
  }
}

// Cleanup debounce timer
onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-highlighted">Notes</h3>
      <span
        v-if="saveStatus === 'saving'"
        class="flex items-center gap-1 text-xs text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-3 animate-spin" />
        Saving...
      </span>
      <span
        v-else-if="saveStatus === 'saved'"
        class="flex items-center gap-1 text-xs text-success"
      >
        <UIcon name="i-lucide-check" class="size-3" />
        Saved
      </span>
    </div>

    <UTextarea
      v-model="localNotes"
      placeholder="Add notes about this position..."
      :rows="4"
      autoresize
      :maxrows="12"
    />
  </div>
</template>
