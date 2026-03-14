/**
 * API plugin — provides a configured $fetch instance globally.
 * Currently a no-op stub. The useApi composable is the primary
 * interface for making API calls.
 *
 * This plugin will be enhanced in FE-02 to set up request/response
 * interceptors for token refresh and error handling.
 */
export default defineNuxtPlugin(() => {
  // Stub: will be enhanced in FE-02 with global fetch interceptors
});
