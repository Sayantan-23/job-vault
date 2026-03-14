# Frontend Plan 08 — Chrome Extension (MV3)

## Overview

Build a Chrome Extension (Manifest V3) that allows users to capture job postings directly from job boards (LinkedIn, Indeed, and generic pages). The extension is fully decoupled from the main Nuxt frontend — it uses Vue 3 + Tailwind CSS (no Nuxt) and communicates with the backend via API key authentication. This can be paused/built independently of the main app.

---

## Dependencies

```bash
# Extension is a separate project, not inside frontend/
# Initialize in extension/ directory

npm init -y
npm install vue@3 @anthropic-ai/sdk  # Vue 3 for popup
npm install -D vite @vitejs/plugin-vue tailwindcss @tailwindcss/vite
npm install -D @types/chrome
```

---

## Folder / File Structure

```
extension/
├── manifest.json                     # MV3 manifest
├── vite.config.ts                    # Build config for popup + content scripts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── popup/
│   │   ├── index.html                # Popup entry
│   │   ├── main.ts                   # Vue app mount
│   │   ├── App.vue                   # Root component
│   │   ├── components/
│   │   │   ├── LoginView.vue         # API key input
│   │   │   ├── CaptureView.vue       # Job capture form (pre-filled from page)
│   │   │   ├── SuccessView.vue       # Capture success confirmation
│   │   │   └── SettingsView.vue      # API key management, server URL
│   │   ├── composables/
│   │   │   ├── useExtAuth.ts         # API key storage + validation
│   │   │   └── useExtApi.ts          # API client for extension
│   │   └── styles/
│   │       └── popup.css             # Tailwind + custom styles
│   ├── content/
│   │   ├── index.ts                  # Content script entry (injected into pages)
│   │   ├── extractors/
│   │   │   ├── linkedin.ts           # LinkedIn job page extractor
│   │   │   ├── indeed.ts             # Indeed job page extractor
│   │   │   └── generic.ts            # Generic page extractor (meta tags + body)
│   │   ├── detector.ts               # Detects which extractor to use
│   │   └── overlay.ts                # Floating "Save to JobVault" button overlay
│   ├── background/
│   │   └── service-worker.ts         # Background service worker
│   ├── shared/
│   │   ├── types.ts                  # Shared type definitions
│   │   ├── constants.ts              # API base URL, storage keys
│   │   └── storage.ts               # Chrome storage API wrapper
│   └── assets/
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
└── dist/                             # Build output (loaded into Chrome)
```

---

## Type Definitions

### `shared/types.ts`

```typescript
export interface ExtractedJobData {
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  sourceUrl: string;
  description: string;          // Raw text/HTML from page
  platform: 'linkedin' | 'indeed' | 'generic';
}

export interface QuickCreateJobRequest {
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  sourceUrl: string;
  description?: string;
}

export interface QuickCreateJobResponse {
  id: string;
  title: string;
  company: string;
  status: string;
  isDuplicate: boolean;
  message?: string;
}

export interface ExtensionSettings {
  apiKey: string;
  serverUrl: string;
  autoDetect: boolean;          // Auto-show overlay on job pages
  notifications: boolean;
}
```

---

## API Endpoints (consumed)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/extension/verify-key` | API Key | — | `{ valid: boolean, userName: string }` |
| POST | `/api/extension/jobs` | API Key | `QuickCreateJobRequest` | `QuickCreateJobResponse` |
| GET | `/api/extension/check-url` | API Key | Query: `url` | `{ exists: boolean, jobId?: string }` |

Auth header: `X-API-Key: <key>` (not Bearer token)

---

## Manifest V3

```json
{
  "manifest_version": 3,
  "name": "JobVault",
  "version": "1.0.0",
  "description": "Capture job postings to your JobVault",
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": [
    "https://www.linkedin.com/*",
    "https://www.indeed.com/*",
    "https://*.indeed.com/*"
  ],
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "32": "assets/icon-32.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.linkedin.com/jobs/*",
        "https://www.indeed.com/*",
        "https://*.indeed.com/*"
      ],
      "js": ["content/index.js"],
      "css": ["content/overlay.css"]
    }
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  }
}
```

---

## Content Script Extractors

### `detector.ts`
```typescript
// Detects the current page platform:
// - linkedin.com/jobs/* → 'linkedin'
// - indeed.com/* → 'indeed'
// - Any other page → 'generic'
export function detectPlatform(): 'linkedin' | 'indeed' | 'generic';
```

### `linkedin.ts`
```typescript
// Extracts from LinkedIn job page:
// - Title: .job-details-jobs-unified-top-card__job-title or h1
// - Company: .job-details-jobs-unified-top-card__company-name or data attribute
// - Location: .job-details-jobs-unified-top-card__bullet
// - Description: .jobs-description__content or #job-details
// - Salary: .salary-main-rail__pay or compensation section
// Note: Selectors may change; use multiple fallbacks
export function extractLinkedIn(): ExtractedJobData | null;
```

### `indeed.ts`
```typescript
// Extracts from Indeed job page:
// - Title: .jobsearch-JobInfoHeader-title or h1[data-testid]
// - Company: [data-testid="inlineHeader-companyName"] or .companyName
// - Location: [data-testid="inlineHeader-companyLocation"] or .companyLocation
// - Description: #jobDescriptionText
// - Salary: #salaryInfoAndJobType or .salary-snippet
export function extractIndeed(): ExtractedJobData | null;
```

### `generic.ts`
```typescript
// Extracts from any page:
// - Title: <title>, og:title, h1
// - Company: og:site_name, schema.org Organization
// - Description: meta description, og:description, main content area
// - Uses schema.org JobPosting structured data if present
export function extractGeneric(): ExtractedJobData | null;
```

---

## Components

### `LoginView.vue`
- API key input field
- Server URL input (default: production URL)
- "Connect" button → `POST /extension/verify-key`
- Stores key + server URL in chrome.storage.sync
- Error display for invalid key

### `CaptureView.vue`
- Pre-filled form with extracted data from current page
- Fields: title, company, location, salary, source URL (read-only)
- "Save to JobVault" button
- Duplicate check: calls `GET /extension/check-url?url=...` on load
  - If duplicate: shows warning "Already saved" with link to open in app
- Loading state while saving

### `SuccessView.vue`
- Confirmation: "Job saved to JobVault!"
- "Open in JobVault" link → opens web app to job
- "Close" button

### `SettingsView.vue`
- Change API key
- Change server URL
- Toggle auto-detect (show overlay on job pages)
- Toggle notifications
- "Disconnect" button → clears stored credentials

---

## Overlay

### `overlay.ts`
- Injects floating button: "Save to JobVault" on detected job pages
- Positioned bottom-right, semi-transparent, hover to expand
- Click → extracts data from page → sends message to popup/background
- Shows mini status: "Saving..." → "Saved!" → auto-dismiss
- Respects `autoDetect` setting from chrome.storage
- CSS: scoped to avoid conflicts with host page styles

---

## Background Service Worker

### `service-worker.ts`
- Listens for messages from content scripts and popup
- Handles:
  - `EXTRACT_JOB` → runs content script extraction on active tab
  - `SAVE_JOB` → sends to API via `useExtApi`
  - `CHECK_DUPLICATE` → calls check-url endpoint
- Badge: updates extension icon badge when job saved (brief green checkmark)

---

## Composables (Extension-specific, not Nuxt)

### `useExtAuth`
```typescript
export function useExtAuth() {
  const isAuthenticated: Ref<boolean>;
  const userName: Ref<string>;

  async function login(apiKey: string, serverUrl: string): Promise<boolean>;
  async function logout(): Promise<void>;
  async function loadStoredCredentials(): Promise<boolean>;

  return { isAuthenticated, userName, login, logout, loadStoredCredentials };
}
```

### `useExtApi`
```typescript
export function useExtApi() {
  async function verifyKey(): Promise<{ valid: boolean; userName: string }>;
  async function quickCreate(job: QuickCreateJobRequest): Promise<QuickCreateJobResponse>;
  async function checkDuplicate(url: string): Promise<{ exists: boolean; jobId?: string }>;

  return { verifyKey, quickCreate, checkDuplicate };
}
```

---

## Build Configuration

### `vite.config.ts`
```typescript
// Multi-entry build:
// 1. popup/index.html → popup/index.js + popup/index.css
// 2. content/index.ts → content/index.js
// 3. background/service-worker.ts → background/service-worker.js
// Output: dist/ (ready to load as unpacked extension)
// No code splitting (MV3 limitation for content scripts)
```

---

## Step-by-Step Implementation Order

1. **Initialize extension project** — package.json, vite config, tailwind
2. **Create `manifest.json`** — MV3 with permissions and content scripts
3. **Create `shared/` modules** — types, constants, chrome storage wrapper
4. **Create background service worker** — message handling
5. **Create content script extractors** — LinkedIn, Indeed, generic
6. **Create `detector.ts`** — Platform detection
7. **Create `overlay.ts`** + CSS — Floating save button
8. **Create popup Vue app** — main.ts, App.vue, router-like view switching
9. **Create `LoginView.vue`** — API key authentication
10. **Create `useExtAuth` + `useExtApi`** — Extension composables
11. **Create `CaptureView.vue`** — Pre-filled capture form
12. **Create `SuccessView.vue`** — Confirmation view
13. **Create `SettingsView.vue`** — Configuration
14. **Build and test** — Load unpacked in Chrome
15. **Test on LinkedIn** — Navigate to job, verify extraction
16. **Test on Indeed** — Navigate to job, verify extraction
17. **Test generic pages** — Verify fallback extraction
18. **Test overlay** — Verify floating button, save flow

---

## Testing Strategy

### Unit Tests (Vitest)
- LinkedIn extractor: mock DOM, verify correct data extraction
- Indeed extractor: mock DOM, verify correct data extraction
- Generic extractor: mock DOM with schema.org, verify extraction
- `detector.ts`: returns correct platform for various URLs
- `useExtAuth`: stores/retrieves credentials from chrome.storage
- `useExtApi`: sends correct headers (X-API-Key), handles responses

### Manual Testing
- Load unpacked extension in Chrome
- Navigate to LinkedIn job posting → verify overlay appears
- Click overlay → verify data extracted correctly
- Open popup → verify data pre-filled
- Save job → verify created in web app
- Test duplicate detection → verify warning shown
- Test with invalid API key → verify error message

---

## Acceptance Criteria

- [ ] Extension loads in Chrome without errors
- [ ] Popup shows login view when not authenticated
- [ ] API key authentication works (stores in chrome.storage)
- [ ] LinkedIn job pages: overlay appears, data extracts correctly
- [ ] Indeed job pages: overlay appears, data extracts correctly
- [ ] Generic pages: basic extraction works (title, URL, description)
- [ ] Popup shows pre-filled capture form with extracted data
- [ ] "Save to JobVault" creates job in backend
- [ ] Duplicate detection warns when URL already saved
- [ ] Success view shows with link to open in web app
- [ ] Settings allow changing API key and server URL
- [ ] Auto-detect toggle controls overlay visibility
- [ ] Extension icon badge updates on successful save
- [ ] Content script styles don't affect host page
- [ ] Extension works in Chrome (MV3 compatible)
