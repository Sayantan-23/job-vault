# Frontend Plan 02 — Authentication

## Overview

Implement the complete authentication flow: login, registration, Google OAuth, JWT handling (access + refresh tokens), persistent sessions, auth middleware, user profile page, and the `useAuth` composable. This plan builds on the layouts and `useApi` from Plan 01.

---

## Dependencies

```bash
# No additional npm packages needed — Nuxt UI provides form components,
# and useApi from Plan 01 handles HTTP requests.
# Google OAuth uses redirect flow (no client SDK needed).
```

---

## Folder / File Structure

```
frontend/app/
├── composables/
│   └── useAuth.ts                    # Auth state, login, register, logout, refresh, Google OAuth
├── middleware/
│   └── auth.global.ts                # Updated: full auth guard logic
├── pages/
│   ├── login.vue                     # Login form page
│   ├── register.vue                  # Registration form page
│   ├── auth/
│   │   └── google/
│   │       └── callback.vue          # Google OAuth callback handler
│   └── profile.vue                   # User profile page
├── types/
│   └── auth.ts                       # Auth-related type definitions
└── components/
    └── auth/
        ├── LoginForm.vue             # Login form component
        ├── RegisterForm.vue          # Registration form component
        └── GoogleOAuthButton.vue     # "Sign in with Google" button
```

---

## Type Definitions

### `types/auth.ts`

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  isEmailVerified: boolean;
  masterResumeUrl?: string;
  masterProfileJson?: MasterProfile | null;
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  defaultView?: 'kanban' | 'list';
}

export interface MasterProfile {
  summary?: string;
  skills?: string[];
  experience?: WorkExperience[];
  education?: Education[];
  certifications?: string[];
  languages?: string[];
}

export interface WorkExperience {
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  description?: string;
  highlights?: string[];
}

export interface Education {
  degree: string;
  institution: string;
  graduationDate?: string;
  gpa?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
```

---

## API Endpoints (consumed)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/auth/register` | No | `RegisterRequest` | `AuthResponse` |
| POST | `/api/auth/login` | No | `LoginRequest` | `AuthResponse` |
| POST | `/api/auth/refresh` | No | `{ refreshToken }` | `RefreshResponse` |
| POST | `/api/auth/logout` | Yes | `{ refreshToken }` | `{ message }` |
| GET | `/api/auth/google` | No | — | Redirect to Google |
| GET | `/api/auth/google/callback` | No | `?code=` | `AuthResponse` (via redirect) |
| GET | `/api/auth/me` | Yes | — | `User` |
| PATCH | `/api/auth/profile` | Yes | Partial `User` | `User` |

---

## Composable: `useAuth`

```typescript
export function useAuth() {
  // State (persisted in localStorage via useState)
  const user: Ref<User | null>;
  const accessToken: Ref<string | null>;
  const refreshToken: Ref<string | null>;
  const isAuthenticated: ComputedRef<boolean>;
  const isLoading: Ref<boolean>;

  // Methods
  async function login(credentials: LoginRequest): Promise<void>;
  async function register(credentials: RegisterRequest): Promise<void>;
  async function logout(): Promise<void>;
  async function refreshAccessToken(): Promise<boolean>;  // returns true if successful
  async function fetchUser(): Promise<void>;               // GET /auth/me
  async function updateProfile(data: Partial<User>): Promise<void>;
  function initiateGoogleOAuth(): void;                    // redirect to backend OAuth URL

  // Token management
  function setTokens(access: string, refresh: string): void;
  function clearTokens(): void;
  function getAccessToken(): string | null;

  return {
    user, accessToken, refreshToken, isAuthenticated, isLoading,
    login, register, logout, refreshAccessToken, fetchUser,
    updateProfile, initiateGoogleOAuth,
  };
}
```

### Token Storage Strategy

- **Access token**: stored in memory (useState) + localStorage for persistence across page reloads
- **Refresh token**: stored in localStorage (httpOnly cookie is better but requires SSR coordination — localStorage acceptable for MVP)
- On app init: check localStorage for tokens → if found, attempt `refreshAccessToken()` → if success, set user state
- `useApi` reads access token from `useAuth().getAccessToken()` and auto-refreshes on 401

---

## Components

### `LoginForm.vue`
- Uses `UForm` with `UFormField`, `UInput`, `UButton`
- Fields: email, password
- Validation: required fields, email format
- Submit → `useAuth().login()`
- Link to register page
- `GoogleOAuthButton` below form

### `RegisterForm.vue`
- Uses `UForm` with `UFormField`, `UInput`, `UButton`
- Fields: name, email, password, confirm password
- Validation: required, email format, password min 8 chars, passwords match
- Submit → `useAuth().register()`
- Link to login page
- `GoogleOAuthButton` below form

### `GoogleOAuthButton.vue`
- `UButton` with Google icon
- Click → `useAuth().initiateGoogleOAuth()`
- Styled as outline/secondary

---

## Pages

### `login.vue`
- Uses `auth` layout
- Renders `LoginForm`
- `definePageMeta({ layout: 'auth', middleware: 'guest' })`

### `register.vue`
- Uses `auth` layout
- Renders `RegisterForm`
- `definePageMeta({ layout: 'auth', middleware: 'guest' })`

### `auth/google/callback.vue`
- Receives `?accessToken=...&refreshToken=...` from backend redirect
- Extracts tokens from query params
- Calls `useAuth().setTokens()` then `fetchUser()`
- Redirects to `/app/dashboard`
- Shows loading spinner while processing

### `profile.vue`
- Uses `default` layout
- Displays user info in a form (name, email — email read-only)
- Edit name, save → `useAuth().updateProfile()`
- Shows linked Google account status
- Theme preference selector (light/dark/system)
- Default view preference (kanban/list)
- Master resume section (stub for Plan 07)

---

## Middleware

### `auth.global.ts`
```typescript
// Global middleware applied to all routes
// Logic:
// 1. `/` and `/web/**` → always public, skip auth
// 2. `/app/auth/**` → public auth routes; if authenticated → redirect to /app/dashboard
// 3. All other `/app/**` → if NOT authenticated → redirect to /app/auth/login
// 4. On first load: attempt to restore session from localStorage tokens
```

---

## Step-by-Step Implementation Order

1. **Create `types/auth.ts`** — All auth-related type definitions
2. **Create `useAuth` composable** — Full auth state management with token handling
3. **Update `useApi`** — Integrate with `useAuth` for auto-attaching tokens and 401 refresh
4. **Create `GoogleOAuthButton.vue`** component
5. **Create `LoginForm.vue`** component with validation
6. **Create `RegisterForm.vue`** component with validation
7. **Create `login.vue` page** — Auth layout, renders LoginForm
8. **Create `register.vue` page** — Auth layout, renders RegisterForm
9. **Create `auth/google/callback.vue` page** — Token extraction + redirect
10. **Update `auth.global.ts` middleware** — Full guard logic with session restoration
11. **Create `profile.vue` page** — User profile with edit form
12. **Update `AppHeader.vue`** — Add user menu dropdown (profile link, logout)
13. **Test complete flow** — Register → Login → Profile → Logout → Google OAuth

---

## Testing Strategy

### Unit Tests (Vitest)
- `useAuth`: mock API calls, verify login sets tokens, register sets tokens, logout clears state
- `useAuth`: verify `refreshAccessToken` updates tokens on success, clears on failure
- `LoginForm`: renders fields, validates required/email format, emits on valid submit
- `RegisterForm`: validates password match, min length
- `auth.global.ts`: verify redirect logic for public/private routes

### E2E Tests (Playwright)
- Register new user → redirected to `/app/dashboard` → user menu shows name
- Login with credentials → redirected to `/app/dashboard`
- Logout → redirected to `/app/auth/login`
- Access `/app/dashboard` while unauthenticated → redirected to `/app/auth/login`
- Access `/app/auth/login` while authenticated → redirected to `/app/dashboard`
- Token refresh: simulate expired access token → app auto-refreshes → no interruption

---

## Acceptance Criteria

- [ ] Login page renders with email/password form and Google button
- [ ] Register page renders with name/email/password/confirm form
- [ ] Form validation shows errors for invalid input
- [ ] Successful login stores tokens and redirects to dashboard
- [ ] Successful registration stores tokens and redirects to dashboard
- [ ] Google OAuth button redirects to backend OAuth URL
- [ ] Google OAuth callback page extracts tokens and redirects to dashboard
- [ ] Auth middleware protects private routes
- [ ] Auth middleware redirects authenticated users away from login/register
- [ ] `useAuth().logout()` clears all state and redirects to login
- [ ] Profile page displays user info and allows name edit
- [ ] Theme preference toggle works and persists
- [ ] Access token auto-refreshes on 401 (transparent to user)
- [ ] Session persists across page reloads (tokens restored from localStorage)
