<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string;
}>(), {
  label: 'Google',
});

const auth = useAuth();

function onGoogleLogin() {
  auth.initiateGoogleOAuth();
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <USeparator class="flex-1" />
      <span class="text-xs font-semibold uppercase tracking-wider text-muted">
        or continue with
      </span>
      <USeparator class="flex-1" />
    </div>

    <UButton
      :label="props.label"
      icon="i-simple-icons-google"
      color="neutral"
      variant="outline"
      size="xl"
      block
      @click="onGoogleLogin"
    />
  </div>
</template>
