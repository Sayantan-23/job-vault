<script setup lang="ts">
definePageMeta({
  layout: 'web',
});

useSeoMeta({
  title: 'Privacy Policy - JobVault',
  description: 'JobVault privacy policy. Learn how we collect, use, and protect your data.',
  ogTitle: 'Privacy Policy - JobVault',
  ogDescription: 'Learn how JobVault handles your data.',
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
        Privacy Policy
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
        <h2>Information We Collect</h2>
        <p>
          We collect information you provide directly: name, email address, and job application data
          you enter into JobVault. We also collect usage data such as page views and feature
          interactions to improve the service.
        </p>

        <h2>How We Use Your Information</h2>
        <p>
          Your information is used solely to provide and improve JobVault's services. This includes
          powering features like AI cover letter generation, ghost detection, and timeline tracking.
          We never use your data for advertising.
        </p>

        <h2>Data Storage &amp; Security</h2>
        <p>
          Your data is stored in encrypted databases hosted on secure cloud infrastructure. All data
          transmission uses HTTPS encryption. We implement industry-standard security measures to
          protect against unauthorized access.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          JobVault uses select third-party services: Google OAuth for authentication, Cloudinary for
          file storage, and Google Gemini for AI features. These services have their own privacy
          policies and are bound by data processing agreements.
        </p>

        <h2>Your Rights</h2>
        <p>
          You have the right to access, export, or delete your data at any time through the Settings
          page. You can also request a copy of all data we store about you by contacting us.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this privacy policy, please contact us at
          <a href="mailto:privacy@jobvault.app">privacy@jobvault.app</a>.
        </p>
      </div>
    </div>
  </div>
</template>
