<script setup lang="ts">
definePageMeta({
  layout: 'web',
});

useSeoMeta({
  title: 'JobVault - Ghost-Proof Your Job Search',
  description: 'Track job applications, preserve job postings, and generate AI cover letters. Never lose track of your job search again.',
});

const features = [
  {
    icon: 'i-lucide-columns-3',
    title: 'Kanban Pipeline',
    description: 'Drag-and-drop your applications through stages from Wishlist to Offer.',
    hero: true,
  },
  {
    icon: 'i-lucide-ghost',
    title: 'Ghost Meter',
    description: 'Know exactly which employers have gone silent with automatic ghost detection.',
    hero: true,
  },
  {
    icon: 'i-lucide-camera',
    title: 'Job Snapshot',
    description: 'Preserve job descriptions before they expire. Never lose a posting again.',
  },
  {
    icon: 'i-lucide-sparkles',
    title: 'AI Cover Letters',
    description: 'Generate tailored cover letters using your resume and the job description.',
  },
  {
    icon: 'i-lucide-git-branch',
    title: 'Timeline Tracking',
    description: 'Log every interaction — interviews, follow-ups, offers — in a visual timeline.',
  },
  {
    icon: 'i-lucide-bell-ring',
    title: 'Smart Reminders',
    description: 'Never miss a follow-up. Set reminders tied to specific applications.',
  },
];

const steps = [
  {
    number: 1,
    icon: 'i-lucide-link',
    title: 'Add a Job',
    description: 'Paste a URL or add manually. We capture and preserve the full job description.',
  },
  {
    number: 2,
    icon: 'i-lucide-kanban',
    title: 'Track Your Pipeline',
    description: 'Drag applications across your Kanban board. See stats, ghost alerts, and timelines.',
  },
  {
    number: 3,
    icon: 'i-lucide-trophy',
    title: 'Land the Role',
    description: 'Generate AI cover letters, set reminders, and never let an opportunity slip away.',
  },
];

const testimonials = [
  {
    stars: 5,
    quote: 'JobVault completely changed how I manage my job search. I went from chaos to 3 offers in a month.',
    name: 'Sarah Chen',
    title: 'Software Engineer',
    initials: 'SC',
  },
  {
    stars: 5,
    quote: 'The ghost detection feature is genius. I finally know which companies are ghosting me.',
    name: 'Marcus Johnson',
    title: 'Product Manager',
    initials: 'MJ',
  },
  {
    stars: 5,
    quote: 'AI cover letters saved me hours every week. Each one was perfectly tailored to the job.',
    name: 'Priya Patel',
    title: 'UX Designer',
    initials: 'PP',
  },
];

const trustBadges = [
  { icon: 'i-lucide-code-2', label: 'Built with Vue' },
  { icon: 'i-lucide-github', label: 'Open Source' },
  { icon: 'i-lucide-shield-check', label: 'GDPR Compliant' },
  { icon: 'i-lucide-heart', label: '100% Free' },
];

const stats = [
  { value: 12400, suffix: '+', label: 'Jobs Tracked' },
  { value: 3200, suffix: '+', label: 'Users' },
  { value: 94, suffix: '%', label: 'Success Rate' },
];
</script>

<template>
  <div>
    <TestLandingHero />
    <TestLandingSocialProof :badges="trustBadges" :stats="stats" />
    <TestLandingFeatures :features="features" />
    <TestLandingHowItWorks :steps="steps" :testimonials="testimonials" />
    <TestLandingCta />
  </div>
</template>
