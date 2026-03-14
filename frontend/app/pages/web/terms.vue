<script setup lang="ts">
definePageMeta({
  layout: 'web',
});

useSeoMeta({
  title: 'Terms & Conditions - JobVault',
  description: 'JobVault terms and conditions of service. Read our terms of use, liability limitations, and user responsibilities.',
  ogTitle: 'Terms & Conditions - JobVault',
  ogDescription: 'JobVault terms of service.',
});

const { reveal } = useScrollReveal();

onMounted(() => {
  reveal('.page-heading', { direction: 'up' });
  reveal('.page-content', { direction: 'up', delay: 0.2 });
});
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
    <div class="page-heading mb-12 text-center">
      <h1 class="mb-4 text-3xl font-bold text-highlighted sm:text-4xl">
        Terms &amp; Conditions
      </h1>
      <p class="mx-auto max-w-2xl text-lg text-muted">
        Last updated: March 2026
      </p>
    </div>

    <div
      class="page-content rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg shadow-black/5 backdrop-blur-lg sm:p-8 dark:border-gray-700/30 dark:bg-gray-800/70"
    >
      <div
        class="prose max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-highlighted prose-p:text-muted prose-a:text-primary"
      >
        <h2>Acceptance of Terms</h2>
        <p>
          By accessing or using JobVault, you agree to be bound by these Terms &amp; Conditions. If
          you do not agree, please do not use the service.
        </p>

        <h2>Use of Service</h2>
        <p>
          JobVault is provided as a free job application tracking tool. You may use it for personal,
          non-commercial purposes. You agree not to misuse the service, attempt to gain unauthorized
          access, or use automated systems to scrape or overload the platform.
        </p>

        <h2>User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials. You
          must provide accurate information during registration and keep your profile up to date.
          You are responsible for all activity under your account.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          JobVault and its original content, features, and functionality are owned by JobVault and
          protected by applicable intellectual property laws. Job descriptions scraped and stored are
          retained for your personal use only.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          JobVault is provided "as is" without warranties of any kind. We are not liable for any
          loss of data, missed job opportunities, or damages arising from your use of the service.
        </p>

        <h2>Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account at our discretion if you violate
          these terms. You may delete your account at any time through the Settings page.
        </p>

        <h2>Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of JobVault after changes
          constitutes acceptance of the updated terms. We will notify users of significant changes
          via email or in-app notification.
        </p>

        <h2>Contact Us</h2>
        <p>
          For questions about these terms, please contact us at
          <a href="mailto:legal@jobvault.app">legal@jobvault.app</a>.
        </p>
      </div>
    </div>
  </div>
</template>
