<script setup lang="ts">
definePageMeta({
  layout: 'web',
});

useSeoMeta({
  title: 'Contact - JobVault',
  description: 'Get in touch with the JobVault team. Questions, feedback, bug reports, or partnership inquiries welcome.',
  ogTitle: 'Contact - JobVault',
  ogDescription: 'Reach out to the JobVault team.',
});

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const state = reactive<ContactForm>({
  name: '',
  email: '',
  subject: '',
  message: '',
});

const isSubmitting = ref(false);
const toast = useToastNotify();

const subjectItems = [
  { label: 'General Inquiry', value: 'general' },
  { label: 'Bug Report', value: 'bug' },
  { label: 'Feature Request', value: 'feature' },
  { label: 'Partnership', value: 'partnership' },
];

const socialLinks = [
  { icon: 'i-simple-icons-facebook', label: 'Facebook', href: '#' },
  { icon: 'i-simple-icons-linkedin', label: 'LinkedIn', href: '#' },
  { icon: 'i-simple-icons-instagram', label: 'Instagram', href: '#' },
  { icon: 'i-simple-icons-youtube', label: 'YouTube', href: '#' },
];

function validate(formState: ContactForm): { name: string; message: string }[] {
  const errors: { name: string; message: string }[] = [];

  if (!formState.name.trim()) {
    errors.push({ name: 'name', message: 'Name is required.' });
  }

  if (!formState.email.trim()) {
    errors.push({ name: 'email', message: 'Email is required.' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
    errors.push({ name: 'email', message: 'Please enter a valid email address.' });
  }

  return errors;
}

function onSubmit() {
  isSubmitting.value = true;

  // Simulate a short delay for UX
  setTimeout(() => {
    toast.info('Thanks for reaching out! Our contact form will be connected soon.');
    state.name = '';
    state.email = '';
    state.subject = '';
    state.message = '';
    isSubmitting.value = false;
  }, 500);
}

const { reveal } = useScrollReveal();

onMounted(() => {
  reveal('.page-heading', { direction: 'up' });
  reveal('.contact-form', { direction: 'up', delay: 0.2 });
  reveal('.contact-info', { direction: 'up', delay: 0.3 });
});
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
    <div class="page-heading mb-12 text-center">
      <h1 class="mb-4 text-3xl font-bold text-highlighted sm:text-4xl">
        Get in Touch
      </h1>
      <p class="mx-auto max-w-2xl text-lg text-muted">
        Have questions, feedback, or partnership inquiries? We'd love to hear from you.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <!-- Left: Contact form -->
      <div
        class="contact-form rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg shadow-black/5 backdrop-blur-lg sm:p-8 dark:border-gray-700/30 dark:bg-gray-800/70"
      >
        <UForm :state="state" :validate="validate" class="space-y-5" @submit="onSubmit">
          <UFormField name="name" label="Name" required>
            <UInput
              v-model="state.name"
              icon="i-lucide-user"
              placeholder="Your name"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField name="email" label="Email" required>
            <UInput
              v-model="state.email"
              type="email"
              icon="i-lucide-mail"
              placeholder="your@email.com"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField name="subject" label="Subject">
            <USelect
              v-model="state.subject"
              :items="subjectItems"
              placeholder="Select a subject"
              icon="i-lucide-message-square"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField name="message" label="Message">
            <UTextarea
              v-model="state.message"
              placeholder="Tell us what's on your mind..."
              :rows="5"
              class="w-full"
            />
          </UFormField>

          <UButton
            type="submit"
            label="Send Message"
            icon="i-lucide-send"
            trailing
            size="lg"
            block
            class="btn-gradient"
            :loading="isSubmitting"
          />
        </UForm>
      </div>

      <!-- Right: Contact info + social links -->
      <div class="contact-info space-y-8">
        <!-- Email info card -->
        <div
          class="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg shadow-black/5 backdrop-blur-lg sm:p-8 dark:border-gray-700/30 dark:bg-gray-800/70"
        >
          <div class="flex items-start gap-4">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <UIcon name="i-lucide-mail" class="size-6 text-primary" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-highlighted">
                Email Us
              </h3>
              <a
                href="mailto:hello@jobvault.app"
                class="mt-1 text-primary transition-colors hover:text-primary/80"
              >
                hello@jobvault.app
              </a>
              <p class="mt-2 text-sm text-muted">
                We typically respond within 24 hours.
              </p>
            </div>
          </div>
        </div>

        <!-- Social links card -->
        <div
          class="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg shadow-black/5 backdrop-blur-lg sm:p-8 dark:border-gray-700/30 dark:bg-gray-800/70"
        >
          <h3 class="mb-4 text-lg font-semibold text-highlighted">
            Follow Us
          </h3>
          <div class="space-y-3">
            <a
              v-for="link in socialLinks"
              :key="link.label"
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-3 text-muted transition-colors hover:text-highlighted"
            >
              <UIcon :name="link.icon" class="size-5" />
              <span class="text-sm font-medium">{{ link.label }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
