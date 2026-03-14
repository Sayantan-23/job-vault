<template>
  <div class="min-h-screen bg-default flex flex-col">
    <WebNavbar />
    <main class="flex-1 pt-16">
      <slot />
    </main>
    <WebFooter />
  </div>
</template>
