<script setup lang="ts">
const route = useRoute();
const colorMode = useColorMode();
const auth = useAuth();

const isScrolled = ref(false);
const isMobileMenuOpen = ref(false);
const isClientAuthenticated = ref(false);

function onScroll() {
  isScrolled.value = window.scrollY > 10;
}

function onToggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}

const isHomePage = computed(() => route.path === '/');

const navLinks = computed(() => {
  const links = [];
  if (isHomePage.value) {
    links.push({ label: 'Features', href: '/#features', isAnchor: true });
  }
  links.push(
    { label: 'FAQ', to: '/web/faq', isAnchor: false },
    { label: 'About', to: '/web/about', isAnchor: false },
    { label: 'Contact', to: '/web/contact', isAnchor: false },
  );
  return links;
});

function onNavLinkClick(link: { isAnchor: boolean; href?: string }) {
  if (link.isAnchor && link.href) {
    isMobileMenuOpen.value = false;
    const target = document.querySelector(link.href.replace('/', ''));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  } else {
    isMobileMenuOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  // Check auth on client only
  isClientAuthenticated.value = auth.isAuthenticated.value;
  watch(() => auth.isAuthenticated.value, (val) => {
    isClientAuthenticated.value = val;
  });
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});
</script>

<template>
  <header class="fixed left-0 right-0 z-50">
    <nav
      :class="[
        'navbar-pill mx-auto flex items-center justify-between border',
        isScrolled ? 'is-scrolled' : ''
      ]"
    >
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 shrink-0">
        <UIcon name="i-lucide-briefcase" class="size-7 text-primary" />
        <span class="text-xl font-bold text-highlighted">JobVault</span>
      </NuxtLink>

      <!-- Desktop Nav Links (>= lg) -->
      <div class="hidden lg:flex items-center gap-6">
        <template v-for="link in navLinks" :key="link.label">
          <a
            v-if="link.isAnchor"
            :href="link.href"
            class="text-sm font-medium text-muted hover:text-highlighted transition-colors"
            @click.prevent="onNavLinkClick(link)"
          >
            {{ link.label }}
          </a>
          <NuxtLink
            v-else
            :to="link.to"
            class="text-sm font-medium text-muted hover:text-highlighted transition-colors"
          >
            {{ link.label }}
          </NuxtLink>
        </template>
      </div>

      <!-- Desktop Right Side (>= lg) -->
      <div class="hidden lg:flex items-center gap-3">
        <template v-if="isClientAuthenticated">
          <UButton
            to="/app/dashboard"
            icon="i-lucide-layout-dashboard"
            label="Dashboard"
            size="sm"
          />
        </template>
        <template v-else>
          <UButton
            to="/app/auth/login"
            icon="i-lucide-log-in"
            size="md"
            label="Login"
            class="btn-gradient"
          />
        </template>

        <!-- Color Mode Toggle -->
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="ghost"
          size="md"
          aria-label="Toggle color mode"
          @click="onToggleColorMode"
        />
      </div>

      <!-- Mobile Menu (< lg) -->
      <USlideover
        v-model:open="isMobileMenuOpen"
        side="right"
        title="Menu"
        :ui="{ content: 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl' }"
      >
        <!-- Hamburger trigger -->
        <UButton
          class="lg:hidden"
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          size="md"
          :aria-expanded="isMobileMenuOpen"
          aria-label="Open navigation menu"
        />

        <template #body>
          <div class="flex flex-col gap-2">
            <!-- Nav Links -->
            <template v-for="link in navLinks" :key="link.label">
              <a
                v-if="link.isAnchor"
                :href="link.href"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-elevated hover:text-highlighted transition-colors"
                @click.prevent="onNavLinkClick(link)"
              >
                {{ link.label }}
              </a>
              <NuxtLink
                v-else
                :to="link.to"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-elevated hover:text-highlighted transition-colors"
                @click="isMobileMenuOpen = false"
              >
                {{ link.label }}
              </NuxtLink>
            </template>

            <!-- Divider -->
            <USeparator class="my-2" />

            <!-- Auth Buttons -->
            <template v-if="isClientAuthenticated">
              <UButton
                to="/app/dashboard"
                icon="i-lucide-layout-dashboard"
                label="Dashboard"
                block
                @click="isMobileMenuOpen = false"
              />
            </template>
            <template v-else>
              <UButton
                to="/app/auth/login"
                variant="ghost"
                label="Login"
                block
                @click="isMobileMenuOpen = false"
              />
              <UButton
                to="/app/auth/register"
                label="Sign Up"
                block
                @click="isMobileMenuOpen = false"
              />
            </template>

            <!-- Color Mode Toggle -->
            <div class="mt-4 flex items-center justify-between px-3">
              <span class="text-sm text-muted">Dark mode</span>
              <UButton
                :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
                color="neutral"
                variant="ghost"
                size="md"
                aria-label="Toggle color mode"
                @click="onToggleColorMode"
              />
            </div>
          </div>
        </template>
      </USlideover>
    </nav>
  </header>
</template>
