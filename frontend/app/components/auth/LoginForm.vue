<script setup lang="ts">
import type { LoginRequest } from '~/types/auth';

const auth = useAuth();
const toast = useToastNotify();

const state = reactive<LoginRequest>({
  email: '',
  password: '',
});

const isSubmitting = ref(false);

function validate(formState: LoginRequest): { name: string; message: string }[] {
  const errors: { name: string; message: string }[] = [];

  if (!formState.email) {
    errors.push({ name: 'email', message: 'Email is required.' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
    errors.push({ name: 'email', message: 'Please enter a valid email address.' });
  }

  if (!formState.password) {
    errors.push({ name: 'password', message: 'Password is required.' });
  }

  return errors;
}

async function onSubmit() {
  isSubmitting.value = true;
  try {
    await auth.login({ email: state.email, password: state.password });
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string | string[] } };
    const message = fetchError.data?.message;
    if (message) {
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } else {
      toast.error('Login failed. Please check your credentials and try again.');
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <UForm :state="state" :validate="validate" class="space-y-4" @submit="onSubmit">
      <UFormField name="email" label="Email Address">
        <UInput
          v-model="state.email"
          type="email"
          placeholder="name@company.com"
          icon="i-lucide-mail"
          autocomplete="email"
          size="xl"
        />
      </UFormField>

      <UFormField name="password">
        <template #label>
          <span class="flex w-full items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-highlighted">
              Password
            </span>
            <NuxtLink
              to="#"
              class="text-xs font-medium text-primary hover:text-primary/80 transition-colors normal-case tracking-normal"
            >
              Forgot?
            </NuxtLink>
          </span>
        </template>
        <UInput
          v-model="state.password"
          type="password"
          placeholder="Enter your password"
          icon="i-lucide-lock"
          autocomplete="current-password"
          size="xl"
        />
      </UFormField>

      <UButton
        type="submit"
        label="Sign In"
        trailing-icon="i-lucide-arrow-right"
        size="xl"
        block
        class="btn-gradient mt-2"
        :loading="isSubmitting"
      />
    </UForm>

    <AuthGoogleOAuthButton />

    <p class="text-center text-sm text-muted">
      Don't have an account?
      <NuxtLink
        to="/app/auth/register"
        class="font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Register
      </NuxtLink>
    </p>
  </div>
</template>
