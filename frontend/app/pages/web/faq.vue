<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui';

definePageMeta({
  layout: 'web',
});

useSeoMeta({
  title: 'FAQ - JobVault',
  description: 'Frequently asked questions about JobVault. Learn about ghost detection, AI cover letters, data security, and more.',
  ogTitle: 'FAQ - JobVault',
  ogDescription: 'Find answers to common questions about JobVault.',
});

const items: AccordionItem[] = [
  {
    label: 'What is JobVault?',
    content: 'JobVault is a free job application tracker that helps you manage your entire job search pipeline. Track applications with a Kanban board, preserve job postings before they expire, detect employer ghosting, and generate AI-powered cover letters.',
  },
  {
    label: 'Is JobVault free to use?',
    content: 'Yes, JobVault is completely free. All features — including AI cover letter generation, job scraping, ghost detection, and timeline tracking — are available at no cost.',
  },
  {
    label: 'How does ghost detection work?',
    content: 'JobVault automatically tracks the number of days since your last interaction with each application. Jobs are classified as "safe" (under 7 days), "warming" (7–14 days), or "ghost risk" (14+ days). You\'ll get alerts when applications go silent.',
  },
  {
    label: 'How does AI cover letter generation work?',
    content: 'Upload your resume and select a job from your pipeline. Our AI analyzes both documents and generates a tailored cover letter that highlights relevant experience and matches the job requirements. You can edit, export, and regenerate as needed.',
  },
  {
    label: 'Is my data secure?',
    content: 'Absolutely. All data is encrypted in transit and at rest. We never share or sell your personal information. Your job search data is yours — you can export or delete it at any time.',
  },
  {
    label: 'Can I import existing applications?',
    content: 'Currently, you can add jobs by pasting a URL (we\'ll scrape and preserve the listing) or by manual entry. Bulk import from spreadsheets is on our roadmap.',
  },
  {
    label: 'What browsers are supported?',
    content: 'JobVault works in all modern browsers: Chrome, Firefox, Safari, and Edge. We also have a Chrome extension (coming soon) for saving jobs directly from job boards.',
  },
  {
    label: 'How do I delete my account?',
    content: 'You can delete your account from the Settings page. This will permanently remove all your data including saved jobs, cover letters, and profile information. This action cannot be undone.',
  },
];

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
        Frequently Asked Questions
      </h1>
      <p class="mx-auto max-w-2xl text-lg text-muted">
        Everything you need to know about JobVault.
      </p>
    </div>

    <div
      class="page-content rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg shadow-black/5 backdrop-blur-lg sm:p-8 dark:border-gray-700/30 dark:bg-gray-800/70"
    >
      <UAccordion
        :items="items"
        type="single"
        collapsible
      />
    </div>
  </div>
</template>
