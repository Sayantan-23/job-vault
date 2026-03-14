# Frontend Plan 01 — Project Setup

## Overview

Initialize the Nuxt 3 application with Nuxt UI v4 (4.4.0), Tailwind CSS, and all foundational tooling. This plan establishes the folder scaffold, base layouts, global composables (`useApi`), ESLint/Prettier configuration, and Docker integration. Everything built here is consumed by every subsequent frontend plan.

---

## Dependencies

```bash
# Create Nuxt 3 app
npx nuxi@latest init frontend

# Inside frontend/
npm install @nuxt/ui tailwindcss
npm install -D @nuxt/eslint eslint prettier eslint-config-prettier
```

Nuxt UI v4 requires `tailwindcss` as an explicit peer dependency. It automatically installs: `@nuxtjs/color-mode`, `@nuxt/icon`, and related dependencies.

---

## Folder / File Structure

```
frontend/
├── app/
│   ├── assets/
│   │   └── css/
│   │       └── main.css              # Tailwind CSS + Nuxt UI imports + custom global styles
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppHeader.vue         # Top nav bar (logo, search, notification bell, user menu)
│   │   │   ├── AppSidebar.vue        # Optional left sidebar (future)
│   │   │   └── AppFooter.vue         # Minimal footer
│   │   └── ui/
│   │       ├── LoadingSpinner.vue    # Reusable loading indicator
│   │       └── EmptyState.vue        # Reusable empty state placeholder
│   ├── composables/
│   │   ├── useApi.ts                 # $fetch wrapper with auth headers, error handling
│   │   └── useToastNotify.ts         # Wrapper around Nuxt UI toast
│   ├── layouts/
│   │   ├── default.vue               # Authenticated layout (header + main content)
│   │   └── auth.vue                  # Unauthenticated layout (centered card)
│   ├── middleware/
│   │   └── auth.global.ts            # Redirect unauthenticated users to /login
│   ├── pages/
│   │   └── index.vue                 # Redirect to /dashboard
│   ├── plugins/
│   │   └── api.ts                    # Provide configured $fetch instance globally
│   ├── types/
│   │   ├── index.ts                  # Re-exports
│   │   ├── api.ts                    # API response wrapper types
│   │   └── auth.ts                   # User, LoginRequest, etc. (stub for Plan 02)
│   └── utils/
│       ├── constants.ts              # API_BASE_URL, JOB_STATUSES, etc.
│       └── formatters.ts             # Date formatters, text truncation, etc.
├── public/
│   └── favicon.ico
├── nuxt.config.ts
├── app.config.ts                     # Nuxt UI theme tokens
├── tailwind.config.ts                # Extended Tailwind config (if needed)
├── eslint.config.mjs                 # Flat config ESLint
├── .prettierrc                       # Prettier config
├── tsconfig.json
├── Dockerfile                        # Multi-stage build
├── .dockerignore
└── package.json
```

---

## Type Definitions

### `types/api.ts`

```typescript
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
```

### `utils/constants.ts`

```typescript
export const API_BASE_URL = '/api';

export const JOB_STATUSES = [
  'wishlist',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'archived',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  wishlist: 'neutral',
  applied: 'info',
  interviewing: 'warning',
  offer: 'success',
  rejected: 'error',
  archived: 'neutral',
};
```

---

## Composables

### `useApi.ts`

```typescript
// Provides a configured $fetch wrapper that:
// 1. Prepends API_BASE_URL to all requests
// 2. Attaches Authorization header from useAuth() token
// 3. Handles 401 → refresh token flow (delegate to useAuth)
// 4. Surfaces errors via useToastNotify
// 5. Returns typed responses

// Signature:
export function useApi() {
  return {
    get<T>(url: string, params?: Record<string, unknown>): Promise<T>;
    post<T>(url: string, body?: unknown): Promise<T>;
    put<T>(url: string, body?: unknown): Promise<T>;
    patch<T>(url: string, body?: unknown): Promise<T>;
    delete<T>(url: string): Promise<T>;
  };
}
```

### `useToastNotify.ts`

```typescript
// Wraps Nuxt UI useToast() with preset configurations
export function useToastNotify() {
  return {
    success(message: string): void;
    error(message: string): void;
    warning(message: string): void;
    info(message: string): void;
  };
}
```

---

## Layouts

### `default.vue`
- Renders `<AppHeader />` at top
- `<slot />` in main content area with max-width container
- Uses `UApp` and `UContainer` from Nuxt UI
- Dark mode toggle in header

### `auth.vue`
- Centered card layout
- Logo at top
- `<slot />` inside `UCard`
- No header/sidebar

---

## Nuxt Config

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
    },
  },

  devtools: { enabled: true },

  // Proxy API calls in dev to avoid CORS
  routeRules: {
    '/api/**': {
      proxy: { to: 'http://localhost:3000/**' },
    },
  },

  compatibilityDate: '2025-01-01',
});
```

---

## Docker

### `Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/.output .output
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=8080
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]
```

---

## Step-by-Step Implementation Order

1. **Initialize Nuxt 3 project** — `npx nuxi@latest init frontend`
2. **Install dependencies** — `@nuxt/ui`, `tailwindcss`, `@nuxt/eslint`, `prettier`, `eslint-config-prettier`
3. **Configure `nuxt.config.ts`** — modules, runtimeConfig, routeRules proxy
4. **Configure `app.config.ts`** — Nuxt UI theme tokens (primary color, etc.)
5. **Set up ESLint + Prettier** — `eslint.config.mjs`, `.prettierrc`
6. **Create `assets/css/main.css`** — Import Tailwind CSS and Nuxt UI (`@import "tailwindcss"; @import "@nuxt/ui";`)
7. **Create `types/api.ts`** — API response wrapper types
8. **Create `utils/constants.ts`** — Status enums, API base URL
9. **Create `utils/formatters.ts`** — Date and text formatters
10. **Create `composables/useToastNotify.ts`** — Toast wrapper
11. **Create `composables/useApi.ts`** — Configured $fetch wrapper
12. **Create `plugins/api.ts`** — Global API plugin
13. **Create layout components** — `AppHeader.vue`, `AppFooter.vue`
14. **Create `layouts/default.vue`** — Authenticated layout with header
15. **Create `layouts/auth.vue`** — Centered card layout
16. **Create `components/ui/LoadingSpinner.vue`** and `EmptyState.vue`
17. **Create `middleware/auth.global.ts`** — Auth redirect (stub, completed in Plan 02)
18. **Create `pages/index.vue`** — Redirect to `/dashboard`
19. **Create `Dockerfile`** and `.dockerignore`
20. **Verify** — `npm run dev` starts, pages render, dark mode toggles, ESLint passes

---

## Testing Strategy

### Unit Tests (Vitest)
- `useApi` composable: mock $fetch, verify headers attached, verify error handling
- `useToastNotify`: verify toast methods call underlying useToast correctly
- `formatters.ts`: pure function tests for all formatters

### E2E Tests (Playwright)
- App loads at `/` and redirects appropriately
- Dark mode toggle switches theme
- Layout renders header and main content area

---

## Acceptance Criteria

- [ ] `npm run dev` starts Nuxt 3 app without errors
- [ ] Nuxt UI components render (test with `<UButton>`)
- [ ] Dark mode toggle works (system + manual)
- [ ] `useApi` composable is available and makes requests to configured base URL
- [ ] ESLint + Prettier pass with no errors on all files
- [ ] `default.vue` layout renders header + content area
- [ ] `auth.vue` layout renders centered card
- [ ] Docker build completes successfully
- [ ] Proxy route forwards `/api/**` to backend in dev mode
- [ ] All type definitions compile without errors
