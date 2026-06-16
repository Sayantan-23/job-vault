/**
 * The thin top progress bar shown during route transitions. It lives inside each
 * route's loading.tsx (via PageSkeleton), so it mounts the moment a navigation
 * suspends on the page's server fetch and unmounts the instant the page is ready
 * — no router-event wiring or history patching needed. The bar trickles toward
 * ~92% and holds; vanishing on unmount reads as "done". Suppressed (scaleX 0)
 * under reduced motion, where the skeleton alone signals the wait.
 */
export function RouteProgress() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
    >
      <div className="h-full w-full origin-left bg-primary animate-jv-route-progress motion-reduce:hidden" />
    </div>
  )
}
