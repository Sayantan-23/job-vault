/**
 * Global auth middleware.
 * - `/` and `/web/**` -> always public, no auth check
 * - `/app/auth/**` -> public auth routes (redirect to /app/dashboard if already logged in)
 * - `/app/**` (everything else) -> requires auth (redirect to /app/auth/login if not logged in)
 * - On first load: restores session from localStorage tokens
 */

export default defineNuxtRouteMiddleware(async (to) => {
  // Public pages — no auth check needed
  if (to.path === '/' || to.path.startsWith('/web')) return;

  // Redirect legacy/mistyped paths that don't start with /app
  // (e.g. /dashboard → /app/dashboard, /profile → /app/profile)
  if (!to.path.startsWith('/app')) {
    return navigateTo(`/app${to.path}`, { redirectCode: 302 });
  }

  // Only run auth logic on client side (tokens are in localStorage)
  if (import.meta.server) return;

  const auth = useAuth();

  // On first load, restore session from localStorage
  if (!auth.isInitialized.value) {
    await auth.initSession();
  }

  const isAuthRoute = to.path.startsWith('/app/auth');
  const isLoggedIn = auth.isAuthenticated.value;

  // Logged-in users on auth pages -> redirect to dashboard
  if (isAuthRoute && isLoggedIn) {
    return navigateTo('/app/dashboard');
  }

  // Not logged in on protected app routes -> redirect to login
  if (!isAuthRoute && !isLoggedIn) {
    return navigateTo('/app/auth/login');
  }
});
