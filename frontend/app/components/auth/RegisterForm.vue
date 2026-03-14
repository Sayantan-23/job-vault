<script setup lang="ts">
import type { RegisterRequest } from '~/types/auth';

const auth = useAuth();
const toast = useToastNotify();

interface RegisterFormState extends RegisterRequest {
  confirmPassword: string;
}

const state = reactive<RegisterFormState>({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const isSubmitting = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// Password strength criteria
const passwordCriteria = computed(() => {
  const p = state.password;
  return {
    length: p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    lowercase: /[a-z]/.test(p),
    number: /[0-9]/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  };
});

const strengthScore = computed(() => {
  const c = passwordCriteria.value;
  return [c.length, c.uppercase, c.lowercase, c.number, c.special].filter(Boolean).length;
});

const strengthLevel = computed(() => {
  const score = strengthScore.value;
  if (score <= 1) return { label: 'WEAK', color: 'bg-red-500' };
  if (score === 2) return { label: 'FAIR', color: 'bg-orange-500' };
  if (score === 3) return { label: 'MEDIUM', color: 'bg-blue-500' };
  return { label: 'STRONG', color: 'bg-green-500' };
});

// Map score (0-5) to 4 bars
const filledBars = computed(() => {
  const score = strengthScore.value;
  if (score === 0) return 0;
  if (score <= 1) return 1;
  if (score === 2) return 2;
  if (score <= 4) return 3;
  return 4;
});

function validate(formState: RegisterFormState): { name: string; message: string }[] {
  const errors: { name: string; message: string }[] = [];

  if (!formState.name || formState.name.trim().length === 0) {
    errors.push({ name: 'name', message: 'Name is required.' });
  }

  if (!formState.email) {
    errors.push({ name: 'email', message: 'Email is required.' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
    errors.push({ name: 'email', message: 'Please enter a valid email address.' });
  }

  if (!formState.password) {
    errors.push({ name: 'password', message: 'Password is required.' });
  } else if (formState.password.length < 8) {
    errors.push({ name: 'password', message: 'Password must be at least 8 characters.' });
  }

  if (!formState.confirmPassword) {
    errors.push({ name: 'confirmPassword', message: 'Please confirm your password.' });
  } else if (formState.password !== formState.confirmPassword) {
    errors.push({ name: 'confirmPassword', message: 'Passwords do not match.' });
  }

  return errors;
}

async function onSubmit() {
  isSubmitting.value = true;
  try {
    await auth.register({
      name: state.name.trim(),
      email: state.email,
      password: state.password,
    });
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string | string[] } };
    const message = fetchError.data?.message;
    if (message) {
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } else {
      toast.error('Registration failed. Please try again.');
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <UForm :state="state" :validate="validate" class="space-y-4" @submit="onSubmit">
      <UFormField name="name" label="Fullname">
        <UInput
          v-model="state.name"
          type="text"
          placeholder="John Doe"
          icon="i-lucide-user"
          autocomplete="name"
          size="xl"
        />
      </UFormField>

      <UFormField name="email" label="Email Address">
        <UInput
          v-model="state.email"
          type="email"
          placeholder="name@example.com"
          icon="i-lucide-mail"
          autocomplete="email"
          size="xl"
        />
      </UFormField>

      <UFormField name="password" label="Password">
        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Min. 8 characters"
          icon="i-lucide-lock"
          autocomplete="new-password"
          size="xl"
        >
          <template #trailing>
            <UIcon
              :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              class="size-5 cursor-pointer text-dimmed/60 hover:text-dimmed transition-colors"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
        <!-- Password strength indicator -->
        <div v-if="state.password.length > 0" class="mt-2 space-y-1">
          <div class="flex gap-1.5">
            <div
              v-for="i in 4"
              :key="i"
              class="h-1.5 flex-1 rounded-full transition-colors duration-200"
              :class="i <= filledBars ? strengthLevel.color : 'bg-gray-200 dark:bg-gray-700'"
            />
          </div>
          <p
            class="text-right text-[10px] font-semibold uppercase tracking-wider"
            :class="{
              'text-red-500': strengthScore <= 1,
              'text-orange-500': strengthScore === 2,
              'text-blue-500': strengthScore === 3,
              'text-green-500': strengthScore >= 4,
            }"
          >
            {{ strengthLevel.label }} STRENGTH
          </p>
        </div>
      </UFormField>

      <UFormField name="confirmPassword" label="Confirm Password">
        <UInput
          v-model="state.confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          icon="i-lucide-shield-check"
          autocomplete="new-password"
          size="xl"
        />
      </UFormField>

      <UButton
        type="submit"
        label="Create Account"
        size="xl"
        block
        class="btn-gradient mt-2"
        :loading="isSubmitting"
      />
    </UForm>

    <AuthGoogleOAuthButton label="Sign up with Google" />

    <p class="text-center text-sm text-muted">
      Already have an account?
      <NuxtLink
        to="/app/auth/login"
        class="font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>
