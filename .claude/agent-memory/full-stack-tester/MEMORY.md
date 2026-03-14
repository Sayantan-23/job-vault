# Full-Stack Tester Agent Memory

## Project Structure
- Backend: `backend/` (NestJS + MikroORM + PostgreSQL)
- Frontend: `frontend/` (Nuxt 4 + Nuxt UI v4)
- Plans: `plans/backend/01-08`, `plans/frontend/01-10`
- Progress: `progress.md` (single source of truth)
- Conventions: `CONVENTIONS.md`

## Nuxt UI v4 Component Patterns (verified)
- `USlideover`: default slot = trigger element, `#body`/`#content` = panel content
- `UAccordion`: uses `items` prop with `{ label, content }` objects, `type="single"` with `collapsible`
- `UForm`: validate prop returns `{ name, message }[]`; `@submit` fires only on validation pass; `loadingAuto` defaults true (expects async handler)
- `USelect`: items as `{ label, value }[]`; v-model binds to `value` field; `icon` prop exists but may need `leading` to render
- `USeparator` replaces old `UDivider` (no UDivider in v4)

## Common Patterns to Check
- GSAP ScrollTrigger: verify tween cleanup on unmount (not just ScrollTrigger.kill())
- Lucide icons: `fill-*` class needed for solid appearance (e.g., filled stars)
- Auth-aware components: check if `useAuth().isAuthenticated` used directly vs. manual ref copy
- `import.meta.client` guards: needed for window/document/localStorage access
- Footer/navbar anchor links: verify smooth scroll works for cross-page hash navigation
- UForm loadingAuto: if handler uses setTimeout, must return Promise or set loadingAuto=false

## Completed Audits
- **FE-09 + FE-10** (2026-03-10): PASS WITH ISSUES. 0 critical, 2 high (unfilled stars, GSAP cleanup), 6 medium, 6 low. All marked [x] in progress.md.

## Key File Locations
- Auth middleware: `frontend/app/middleware/auth.global.ts` (public routes: `/` and `/web/**`)
- Auth composable: `frontend/app/composables/useAuth.ts` (useState-based, SSR-safe)
- Toast composable: `frontend/app/composables/useToastNotify.ts`
- CSS: `frontend/app/assets/css/main.css` (hero-bg, auth-bg, btn-gradient, kanban-ghost)
- App config: `frontend/app.config.ts` (Nuxt UI theme overrides)
