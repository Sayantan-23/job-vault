<script setup lang="ts">
const currentYear = new Date().getFullYear();

const productLinks = [
  { label: 'Features', href: '/#features', isAnchor: true },
  { label: 'FAQ', to: '/web/faq' },
];

const companyLinks = [
  { label: 'About', to: '/web/about' },
  { label: 'Contact', to: '/web/contact' },
];

const legalLinks = [
  { label: 'Privacy Policy', to: '/web/privacy' },
  { label: 'Terms & Conditions', to: '/web/terms' },
];

const socialLinks = [
  { label: 'Facebook', icon: 'i-simple-icons-facebook', href: '#' },
  { label: 'LinkedIn', icon: 'i-simple-icons-linkedin', href: '#' },
  { label: 'Instagram', icon: 'i-simple-icons-instagram', href: '#' },
  { label: 'YouTube', icon: 'i-simple-icons-youtube', href: '#' },
];
</script>

<template>
  <footer class="bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg border-t border-white/20 dark:border-gray-700/30">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <!-- Columns grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
        <!-- Brand column -->
        <div class="col-span-2 md:col-span-1">
          <NuxtLink to="/" class="flex items-center gap-2 mb-3">
            <UIcon name="i-lucide-briefcase" class="size-6 text-primary" />
            <span class="text-lg font-bold text-highlighted">JobVault</span>
          </NuxtLink>
          <p class="text-sm text-muted leading-relaxed">
            Ghost-Proof Your Job Search. Track applications, preserve postings, and land your next role.
          </p>
        </div>

        <!-- Product column -->
        <div>
          <h3 class="text-sm font-semibold text-highlighted mb-4">Product</h3>
          <ul class="space-y-2">
            <li v-for="link in productLinks" :key="link.label">
              <a
                v-if="link.isAnchor"
                :href="link.href"
                class="text-sm text-muted hover:text-highlighted transition-colors"
              >
                {{ link.label }}
              </a>
              <NuxtLink
                v-else
                :to="link.to"
                class="text-sm text-muted hover:text-highlighted transition-colors"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Company column -->
        <div>
          <h3 class="text-sm font-semibold text-highlighted mb-4">Company</h3>
          <ul class="space-y-2">
            <li v-for="link in companyLinks" :key="link.label">
              <NuxtLink
                :to="link.to"
                class="text-sm text-muted hover:text-highlighted transition-colors"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Legal column -->
        <div>
          <h3 class="text-sm font-semibold text-highlighted mb-4">Legal</h3>
          <ul class="space-y-2">
            <li v-for="link in legalLinks" :key="link.label">
              <NuxtLink
                :to="link.to"
                class="text-sm text-muted hover:text-highlighted transition-colors"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <!-- Social icons row -->
      <div class="flex gap-4 justify-center mt-10">
        <a
          v-for="social in socialLinks"
          :key="social.label"
          :href="social.href"
          :aria-label="social.label"
          class="flex size-10 items-center justify-center rounded-full text-muted hover:text-highlighted hover:bg-elevated transition-all duration-200"
        >
          <UIcon :name="social.icon" class="size-5" />
        </a>
      </div>

      <!-- Copyright bar -->
      <div class="border-t border-default/50 pt-6 mt-8 text-center">
        <p class="text-sm text-muted">&copy; {{ currentYear }} JobVault. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>
