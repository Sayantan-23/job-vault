<script setup lang="ts">
definePageMeta({
  layout: 'web',
});

useSeoMeta({
  title: 'About - JobVault',
  description: 'Learn about JobVault\'s mission to ghost-proof your job search. Built by job seekers, for job seekers.',
  ogTitle: 'About - JobVault',
  ogDescription: 'Built by job seekers, for job seekers. Learn about our mission.',
});

const values = [
  {
    icon: 'i-lucide-eye',
    title: 'Transparency',
    description: 'Your job search data is yours. We believe in full visibility into your pipeline — no hidden statuses, no black boxes.',
  },
  {
    icon: 'i-lucide-shield',
    title: 'Privacy',
    description: 'Your data is encrypted and never shared. We don\'t sell your information or track your browsing habits.',
  },
  {
    icon: 'i-lucide-sparkle',
    title: 'Simplicity',
    description: 'Powerful features wrapped in an intuitive interface. No learning curve, no clutter — just the tools you need.',
  },
];

const { reveal, revealStagger } = useScrollReveal();

onMounted(() => {
  reveal('.page-heading', { direction: 'up' });
  reveal('.page-content', { direction: 'up', delay: 0.2 });
  revealStagger('.value-card', { direction: 'up', stagger: 0.1, delay: 0.3 });
});
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
    <div class="page-heading mb-12 text-center">
      <h1 class="mb-4 text-3xl font-bold text-highlighted sm:text-4xl">
        About JobVault
      </h1>
      <p class="mx-auto max-w-2xl text-lg text-muted">
        Built by job seekers, for job seekers.
      </p>
    </div>

    <!-- Mission section -->
    <div
      class="page-content rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg shadow-black/5 backdrop-blur-lg sm:p-8 dark:border-gray-700/30 dark:bg-gray-800/70"
    >
      <div class="space-y-5 text-base leading-relaxed text-muted">
        <p>
          The modern job search is broken. You apply to dozens of positions, carefully craft each
          application, and then... silence. Companies ghost candidates with alarming regularity, job
          postings vanish without a trace, and keeping track of where you applied becomes a
          full-time job in itself.
        </p>
        <p>
          JobVault was born from this frustration. We built a tool that puts job seekers back in
          control. Our platform preserves job descriptions before they disappear, tracks exactly
          which companies have gone silent, and uses AI to help you put your best foot forward with
          every application.
        </p>
        <p>
          Whether you're a fresh graduate or a seasoned professional, JobVault gives you the
          visibility and tools to run a smarter, more organized job search.
        </p>
      </div>
    </div>

    <!-- Our Values section -->
    <section class="mt-16">
      <h2 class="mb-8 text-center text-2xl font-bold text-highlighted sm:text-3xl">
        Our Values
      </h2>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div
          v-for="value in values"
          :key="value.title"
          class="value-card rounded-2xl border border-white/20 bg-white/70 p-6 shadow-sm shadow-black/5 backdrop-blur-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 dark:border-gray-700/30 dark:bg-gray-800/70"
        >
          <div class="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <UIcon :name="value.icon" class="size-6 text-primary" />
          </div>
          <h3 class="mb-2 text-lg font-semibold text-highlighted">
            {{ value.title }}
          </h3>
          <p class="text-sm leading-relaxed text-muted">
            {{ value.description }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
