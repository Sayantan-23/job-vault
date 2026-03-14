<script setup lang="ts">
import type { UpdateProfileRequest } from '~/types/auth';

definePageMeta({
  layout: 'default',
});

const auth = useAuth();
const toast = useToastNotify();
const colorMode = useColorMode();

const isSaving = ref(false);

interface ProfileFormState {
  name: string;
  theme: 'light' | 'dark' | 'system';
  defaultView: 'kanban' | 'list';
}

const state = reactive<ProfileFormState>({
  name: auth.user.value?.name || '',
  theme: auth.user.value?.preferences?.theme || 'system',
  defaultView: auth.user.value?.preferences?.defaultView || 'kanban',
});

// Keep form in sync when user data loads/changes
watch(
  () => auth.user.value,
  (newUser) => {
    if (newUser) {
      state.name = newUser.name;
      state.theme = newUser.preferences?.theme || 'system';
      state.defaultView = newUser.preferences?.defaultView || 'kanban';
    }
  },
  { immediate: true },
);

const themeItems = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

const viewItems = [
  { label: 'Kanban Board', value: 'kanban' },
  { label: 'List View', value: 'list' },
];

function validate(formState: ProfileFormState): { name: string; message: string }[] {
  const errors: { name: string; message: string }[] = [];
  if (!formState.name || formState.name.trim().length === 0) {
    errors.push({ name: 'name', message: 'Name is required.' });
  }
  return errors;
}

async function onSubmit() {
  isSaving.value = true;
  try {
    const data: UpdateProfileRequest = {
      name: state.name.trim(),
      preferences: {
        theme: state.theme,
        defaultView: state.defaultView,
      },
    };
    await auth.updateProfile(data);

    // Apply theme preference locally
    colorMode.preference = state.theme;

    toast.success('Profile updated successfully.');
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string | string[] } };
    const message = fetchError.data?.message;
    if (message) {
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } else {
      toast.error('Failed to update profile. Please try again.');
    }
  } finally {
    isSaving.value = false;
  }
}

const memberSince = computed(() => {
  if (!auth.user.value?.createdAt) return '';
  return formatRelativeTime(auth.user.value.createdAt);
});

const userInitials = computed(() => {
  const name = auth.user.value?.name || '';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-highlighted">Profile & Settings</h1>
      <p class="text-sm text-muted mt-1">Manage your account information and preferences.</p>
    </div>

    <!-- Profile Card -->
    <div
      class="rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg shadow-black/5 p-6 sm:p-8"
    >
      <!-- User Avatar & Info Header -->
      <div class="flex items-center gap-4 mb-8 pb-6 border-b border-default">
        <UAvatar
          :text="userInitials"
          size="xl"
          class="ring-2 ring-primary/20"
        />
        <div>
          <h2 class="text-lg font-semibold text-highlighted">
            {{ auth.user.value?.name || 'User' }}
          </h2>
          <p class="text-sm text-muted">{{ auth.user.value?.email }}</p>
          <p v-if="memberSince" class="text-xs text-dimmed mt-1">
            Member {{ memberSince }}
          </p>
        </div>
      </div>

      <UForm :state="state" :validate="validate" class="space-y-6" @submit="onSubmit">
        <!-- Account Information Section -->
        <div class="space-y-4">
          <h3 class="text-base font-semibold text-highlighted">Account Information</h3>

          <UFormField name="name" label="Full Name" required>
            <UInput
              v-model="state.name"
              type="text"
              placeholder="Your name"
              icon="i-lucide-user"
              size="xl"
            />
          </UFormField>

          <UFormField name="email" label="Email" hint="Cannot be changed">
            <UInput
              :model-value="auth.user.value?.email || ''"
              type="email"
              icon="i-lucide-mail"
              size="xl"
              disabled
            />
          </UFormField>
        </div>

        <!-- Google Account Status -->
        <div class="space-y-2">
          <h3 class="text-base font-semibold text-highlighted">Connected Accounts</h3>
          <div
            class="flex items-center gap-3 rounded-xl border border-default p-4"
          >
            <UIcon name="i-simple-icons-google" class="size-5 text-muted" />
            <div class="flex-1">
              <p class="text-sm font-medium text-default">Google Account</p>
              <p class="text-xs text-muted">
                {{ auth.user.value?.googleId ? 'Connected' : 'Not connected' }}
              </p>
            </div>
            <UBadge
              :label="auth.user.value?.googleId ? 'Linked' : 'Not Linked'"
              :color="auth.user.value?.googleId ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            />
          </div>
        </div>

        <!-- Preferences Section -->
        <div class="space-y-4">
          <h3 class="text-base font-semibold text-highlighted">Preferences</h3>

          <UFormField name="theme" label="Theme">
            <URadioGroup
              v-model="state.theme"
              :items="themeItems"
              orientation="horizontal"
            />
          </UFormField>

          <UFormField name="defaultView" label="Default Dashboard View">
            <URadioGroup
              v-model="state.defaultView"
              :items="viewItems"
              orientation="horizontal"
            />
          </UFormField>
        </div>

        <!-- Master Resume Section (stub for FE-07) -->
        <div class="space-y-2">
          <h3 class="text-base font-semibold text-highlighted">Master Resume</h3>
          <div
            class="flex items-center justify-center rounded-xl border border-dashed border-default p-8"
          >
            <div class="text-center space-y-2">
              <UIcon name="i-lucide-file-text" class="size-10 text-dimmed mx-auto" />
              <p class="text-sm text-muted">Resume upload coming soon.</p>
              <p class="text-xs text-dimmed">
                Upload your master resume to auto-generate tailored cover letters.
              </p>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end pt-4 border-t border-default">
          <UButton
            type="submit"
            label="Save Changes"
            icon="i-lucide-save"
            size="lg"
            :loading="isSaving"
          />
        </div>
      </UForm>
    </div>
  </div>
</template>
