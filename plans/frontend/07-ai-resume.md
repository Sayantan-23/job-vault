# Frontend Plan 07 — AI Module: Resume & Cover Letter

## Overview

Implement the AI-powered features: resume upload and parsing, master profile management (view + edit structured data extracted from resume), cover letter generation using AI, a TipTap rich text editor for cover letter editing, and export options (copy text + PDF download). This is Phase 2 functionality but planned now for architectural consistency.

---

## Dependencies

```bash
npm install @tiptap/vue-3 @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-underline
```

---

## Folder / File Structure

```
frontend/app/
├── components/
│   ├── resume/
│   │   ├── ResumeUpload.vue          # File upload dropzone (PDF/DOCX)
│   │   ├── MasterProfileView.vue     # Structured resume data display
│   │   ├── MasterProfileEditor.vue   # Edit structured resume data
│   │   └── ProfileSection.vue        # Reusable section (skills, experience, education)
│   ├── cover-letter/
│   │   ├── CoverLetterGenerator.vue  # AI generation form + preview
│   │   ├── CoverLetterEditor.vue     # TipTap rich text editor
│   │   ├── CoverLetterToolbar.vue    # Editor toolbar (bold, italic, etc.)
│   │   ├── CoverLetterExport.vue     # Copy + PDF export buttons
│   │   └── CoverLetterList.vue       # List of generated cover letters for a job
│   └── editor/
│       └── TipTapEditor.vue          # Reusable TipTap editor wrapper
├── composables/
│   ├── useResume.ts                  # Resume upload, parsing, master profile
│   └── useCoverLetter.ts            # Cover letter generation, CRUD, export
├── pages/
│   └── resume.vue                    # Master resume/profile page
└── types/
    ├── resume.ts                     # Resume/profile type definitions
    └── cover-letter.ts               # Cover letter type definitions
```

---

## Type Definitions

### `types/resume.ts`

```typescript
// Re-uses MasterProfile, WorkExperience, Education from types/auth.ts

export interface ResumeUploadResponse {
  masterResumeUrl: string;
  masterProfileJson: MasterProfile;
}
```

### `types/cover-letter.ts`

```typescript
export interface CoverLetter {
  id: string;
  jobId: string;
  userId: string;
  content: string;       // HTML content from TipTap
  createdAt: string;
  updatedAt: string;
}

export interface GenerateCoverLetterRequest {
  jobId: string;
  tone?: 'professional' | 'conversational' | 'enthusiastic';
  additionalInstructions?: string;
}

export interface GenerateCoverLetterResponse {
  content: string;  // Generated HTML content
}
```

---

## API Endpoints (consumed)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/resume/upload` | Yes | `FormData (file)` | `ResumeUploadResponse` |
| GET | `/api/auth/me` | Yes | — | `User` (includes masterProfileJson) |
| PATCH | `/api/auth/profile` | Yes | `{ masterProfileJson }` | `User` |
| POST | `/api/cover-letters/generate` | Yes | `GenerateCoverLetterRequest` | `GenerateCoverLetterResponse` |
| GET | `/api/jobs/:id/cover-letters` | Yes | — | `CoverLetter[]` |
| POST | `/api/cover-letters` | Yes | `{ jobId, content }` | `CoverLetter` |
| PATCH | `/api/cover-letters/:id` | Yes | `{ content }` | `CoverLetter` |
| DELETE | `/api/cover-letters/:id` | Yes | — | `{ message }` |
| GET | `/api/cover-letters/:id/pdf` | Yes | — | `Blob (PDF)` |

---

## Components

### `ResumeUpload.vue`
- **Emits**: `uploaded: ResumeUploadResponse`
- File upload dropzone: drag-and-drop or click to browse
- Accepts: `.pdf`, `.docx` only (max 10MB)
- Upload progress indicator
- Sends as `FormData` to `POST /api/resume/upload`
- On success: shows parsed profile preview
- Error handling: file type validation, size validation, parse errors

### `MasterProfileView.vue`
- **Props**: `profile: MasterProfile`
- Read-only display of structured resume data
- Sections: Summary, Skills (chips), Experience, Education, Certifications, Languages
- Each section uses `ProfileSection` component
- "Edit" button → switches to `MasterProfileEditor`

### `MasterProfileEditor.vue`
- **Props**: `profile: MasterProfile`
- **Emits**: `saved: MasterProfile`
- Editable form for all profile sections
- Skills: chip input (add/remove)
- Experience: repeatable section (add/remove entries)
- Education: repeatable section
- Save → `PATCH /auth/profile { masterProfileJson }`
- Cancel → reverts to view mode

### `ProfileSection.vue`
- **Props**: `title: string`, `icon: string`
- Reusable section wrapper with title, icon, and slot for content
- Collapsible

### `CoverLetterGenerator.vue`
- **Props**: `jobId: string`
- AI generation form:
  - Tone selector: Professional / Conversational / Enthusiastic
  - Additional instructions textarea (optional)
  - "Generate" button → `POST /cover-letters/generate`
- Shows loading state: "Generating cover letter..." with animated indicator
- Requires master profile to exist (shows prompt to upload resume if missing)
- On success: populates `CoverLetterEditor` with generated content

### `CoverLetterEditor.vue`
- **Props**: `content: string`, `coverLetterId?: string`
- **Emits**: `save: string` (HTML content)
- TipTap editor with `CoverLetterToolbar`
- Auto-save with debounce (2s) when editing existing cover letter
- Manual save button for new cover letters

### `CoverLetterToolbar.vue`
- Toolbar for TipTap editor
- Buttons: Bold, Italic, Underline, Bullet List, Ordered List, Heading levels, Undo, Redo
- Uses `UButtonGroup` from Nuxt UI
- Active state highlighting for current formatting

### `TipTapEditor.vue`
- Reusable TipTap wrapper component
- **Props**: `modelValue: string`, `placeholder?: string`, `editable?: boolean`
- **Emits**: `update:modelValue`
- Extensions: StarterKit, Placeholder, Underline
- Styled to match Nuxt UI form fields

### `CoverLetterExport.vue`
- **Props**: `coverLetterId: string`, `content: string`
- "Copy Text" button → copies plain text to clipboard (strips HTML)
- "Download PDF" button → `GET /cover-letters/:id/pdf` → triggers download
- Uses `navigator.clipboard.writeText()` for copy

### `CoverLetterList.vue`
- **Props**: `jobId: string`
- Fetches cover letters for job: `GET /jobs/:id/cover-letters`
- List of saved cover letters with:
  - Preview text (first 100 chars)
  - Created date
  - Click → opens in editor
  - Delete button
- "Generate New" button → shows `CoverLetterGenerator`

---

## Composables

### `useResume`

```typescript
export function useResume() {
  const isUploading: Ref<boolean>;
  const masterProfile: ComputedRef<MasterProfile | null>;  // from useAuth().user

  async function uploadResume(file: File): Promise<ResumeUploadResponse>;
  async function updateProfile(profile: MasterProfile): Promise<void>;
  function hasProfile(): boolean;

  return { isUploading, masterProfile, uploadResume, updateProfile, hasProfile };
}
```

### `useCoverLetter`

```typescript
export function useCoverLetter(jobId: MaybeRef<string>) {
  const coverLetters: Ref<CoverLetter[]>;
  const isGenerating: Ref<boolean>;
  const isLoading: Ref<boolean>;

  async function fetchCoverLetters(): Promise<void>;
  async function generate(request: GenerateCoverLetterRequest): Promise<string>;
  async function save(content: string): Promise<CoverLetter>;
  async function update(id: string, content: string): Promise<CoverLetter>;
  async function remove(id: string): Promise<void>;
  async function downloadPdf(id: string): Promise<void>;
  function copyAsText(content: string): Promise<void>;

  return { coverLetters, isGenerating, isLoading, fetchCoverLetters, generate, save, update, remove, downloadPdf, copyAsText };
}
```

---

## Pages

### `resume.vue`
- **Layout**: `default`
- Two sections:
  1. **Resume Upload** — `ResumeUpload` component + current resume file name
  2. **Master Profile** — `MasterProfileView` / `MasterProfileEditor` toggle
- If no profile: prominent upload CTA
- If profile exists: show view with edit toggle

---

## Integration with Job Drawer

Extend `JobDetails.vue` tabs (from Plan 06) to include Cover Letter tab:
```
<template #cover-letter>
  <CoverLetterList :job-id="job.id" />
</template>
```

---

## Step-by-Step Implementation Order

1. **Create type definitions** — `resume.ts`, `cover-letter.ts`
2. **Create `TipTapEditor.vue`** — Reusable editor wrapper
3. **Create `CoverLetterToolbar.vue`** — Editor toolbar
4. **Create `ResumeUpload.vue`** — File upload with validation
5. **Create `useResume` composable** — Upload + profile management
6. **Create `ProfileSection.vue`** — Reusable section component
7. **Create `MasterProfileView.vue`** — Read-only profile display
8. **Create `MasterProfileEditor.vue`** — Editable profile form
9. **Create `resume.vue` page** — Upload + profile management
10. **Create `useCoverLetter` composable** — Generation + CRUD + export
11. **Create `CoverLetterGenerator.vue`** — AI generation form
12. **Create `CoverLetterEditor.vue`** — TipTap editing with save
13. **Create `CoverLetterExport.vue`** — Copy + PDF export
14. **Create `CoverLetterList.vue`** — List of cover letters per job
15. **Integrate into Job Drawer tabs**
16. **Add "Resume" link to navigation**
17. **Test full flow** — Upload → Parse → Edit Profile → Generate Cover Letter → Edit → Export

---

## Testing Strategy

### Unit Tests (Vitest)
- `ResumeUpload`: validates file type/size, shows progress, emits on success
- `useResume`: upload calls correct endpoint with FormData, updates user state
- `MasterProfileEditor`: adds/removes skills, experience entries, saves correctly
- `TipTapEditor`: initializes with content, emits changes
- `CoverLetterGenerator`: validates master profile exists, sends correct request
- `useCoverLetter`: generate returns content, save/update/delete work correctly
- `CoverLetterExport`: copy strips HTML, download triggers blob save

### E2E Tests (Playwright)
- Navigate to Resume page → upload PDF → profile parsed and displayed
- Edit profile → add skill → save → skill persists on reload
- Open job drawer → Cover Letter tab → "Generate New"
- Select tone → generate → loading state → content appears in editor
- Edit generated content in TipTap → save → appears in cover letter list
- Copy as text → clipboard contains plain text
- Download PDF → file downloaded
- Delete cover letter → removed from list
- Generate without resume → shows upload prompt

---

## Acceptance Criteria

- [ ] Resume page accessible from navigation
- [ ] PDF and DOCX files can be uploaded (drag-and-drop + click)
- [ ] File validation: type (.pdf, .docx), size (max 10MB)
- [ ] Upload shows progress indicator
- [ ] Parsed resume displays as structured master profile
- [ ] Master profile is editable (skills, experience, education, etc.)
- [ ] Profile changes save and persist
- [ ] Cover Letter tab appears in job drawer
- [ ] AI generates cover letter when master profile exists
- [ ] Tone selection (professional/conversational/enthusiastic) works
- [ ] Additional instructions are sent to AI
- [ ] Generated content loads in TipTap editor
- [ ] TipTap toolbar works (bold, italic, lists, headings)
- [ ] Cover letter auto-saves on edit (debounced)
- [ ] "Copy Text" copies plain text to clipboard
- [ ] "Download PDF" downloads PDF file
- [ ] Multiple cover letters can be saved per job
- [ ] Cover letters can be deleted
- [ ] Missing master profile shows upload prompt
