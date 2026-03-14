<script setup lang="ts">
definePageMeta({
  layout: 'auth',
});

const auth = useAuth();
const route = useRoute();
const toast = useToastNotify();

const isProcessing = ref(true);
const hasError = ref(false);

onMounted(async () => {
  try {
    const accessToken = route.query.accessToken as string | undefined;
    const refreshToken = route.query.refreshToken as string | undefined;

    if (!accessToken || !refreshToken) {
      hasError.value = true;
      toast.error('Authentication failed. No tokens received.');
      setTimeout(() => {
        navigateTo('/app/auth/login');
      }, 2000);
      return;
    }

    auth.setTokens(accessToken, refreshToken);
    await auth.fetchUser();

    toast.success('Successfully signed in with Google.');
    await navigateTo('/app/dashboard');
  } catch {
    hasError.value = true;
    toast.error('Authentication failed. Please try again.');
    auth.clearTokens();
    setTimeout(() => {
      navigateTo('/app/auth/login');
    }, 2000);
  } finally {
    isProcessing.value = false;
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-4 py-12">
    <template v-if="isProcessing && !hasError">
      <UiLoadingSpinner size="lg" label="Completing sign-in..." />
    </template>

    <template v-else-if="hasError">
      <UIcon name="i-lucide-circle-x" class="size-12 text-error" />
      <p class="text-sm text-muted">Authentication failed. Redirecting to login...</p>
    </template>
  </div>
</template>
