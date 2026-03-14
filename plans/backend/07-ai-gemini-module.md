# Backend Plan 07 — AI / Gemini Module

## Overview

Implement the AI-powered features using Google Gemini API: resume text extraction (from PDF/DOCX), resume structuring (converting raw text to structured profile), and cover letter generation. This module wraps the Gemini API, manages the CoverLetter entity, and provides rate limiting to prevent API abuse.

---

## Dependencies

```bash
npm install @google/genai
npm install pdf-parse              # PDF text extraction
npm install mammoth                # DOCX text extraction
npm install -D @types/pdf-parse
```

---

## Folder / File Structure

```
backend/src/modules/ai/
├── ai.module.ts                      # AiModule
├── ai.controller.ts                  # AI routes (generate cover letter)
├── services/
│   ├── gemini.service.ts             # Gemini API wrapper
│   ├── resume-parser.service.ts      # PDF/DOCX text extraction + structuring
│   └── cover-letter.service.ts       # Cover letter generation + CRUD
├── entities/
│   └── cover-letter.entity.ts        # CoverLetter entity
├── dto/
│   ├── generate-cover-letter.dto.ts  # Generation request
│   ├── create-cover-letter.dto.ts    # Manual save
│   └── update-cover-letter.dto.ts    # Update content
└── prompts/
    ├── resume-structure.prompt.ts    # Prompt template for resume structuring
    └── cover-letter.prompt.ts        # Prompt template for cover letter generation
```

---

## Entity Definition

### `cover-letter.entity.ts`

```typescript
import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Job } from '../../job/entities/job.entity';
import { User } from '../../auth/entities/user.entity';

@Entity({ tableName: 'cover_letters' })
export class CoverLetter extends BaseEntity {
  @ManyToOne(() => Job, { onDelete: 'cascade' })
  job: Job;

  @ManyToOne(() => User)
  user: User;

  @Property({ type: 'text' })
  content: string;  // HTML content
}
```

### Migration: `CreateCoverLettersTable`
```sql
CREATE TABLE cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cover_letters_job_id ON cover_letters(job_id);
CREATE INDEX idx_cover_letters_user_id ON cover_letters(user_id);
```

---

## DTO Definitions

### `generate-cover-letter.dto.ts`
```typescript
import { IsUUID, IsOptional, IsString, IsIn } from 'class-validator';

export class GenerateCoverLetterDto {
  @IsUUID()
  jobId: string;

  @IsOptional()
  @IsIn(['professional', 'conversational', 'enthusiastic'])
  tone?: 'professional' | 'conversational' | 'enthusiastic';

  @IsOptional()
  @IsString()
  additionalInstructions?: string;
}
```

### `create-cover-letter.dto.ts`
```typescript
import { IsUUID, IsString } from 'class-validator';

export class CreateCoverLetterDto {
  @IsUUID()
  jobId: string;

  @IsString()
  content: string;
}
```

### `update-cover-letter.dto.ts`
```typescript
import { IsString } from 'class-validator';

export class UpdateCoverLetterDto {
  @IsString()
  content: string;
}
```

---

## API Endpoints

| Method | Path | Auth | Request | Response | Description |
|--------|------|------|---------|----------|-------------|
| POST | `/api/cover-letters/generate` | Yes | `GenerateCoverLetterDto` | `{ content }` | Generate with AI |
| GET | `/api/jobs/:id/cover-letters` | Yes | — | `CoverLetter[]` | List cover letters for job |
| POST | `/api/cover-letters` | Yes | `CreateCoverLetterDto` | `CoverLetter` | Save cover letter |
| PATCH | `/api/cover-letters/:id` | Yes | `UpdateCoverLetterDto` | `CoverLetter` | Update content |
| DELETE | `/api/cover-letters/:id` | Yes | — | `{ message }` | Delete cover letter |

---

## Services

### `gemini.service.ts`

```typescript
import { GoogleGenAI } from '@google/genai';

export class GeminiService {
  private genai: GoogleGenAI;
  private model: string = 'gemini-2.0-flash';  // Fast, cost-effective

  constructor() {
    this.genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string>;
    // 1. Call Gemini with prompt
    // 2. Optional system instruction for role context
    // 3. Return generated text
    // 4. Handle errors: rate limit, API errors, timeout

  async generateStructuredOutput<T>(prompt: string, schema: object): Promise<T>;
    // 1. Call Gemini with JSON schema response format
    // 2. Parse and validate response
    // 3. Return typed object
}
```

### `resume-parser.service.ts`

```typescript
export class ResumeParserService {
  async extractText(file: Express.Multer.File): Promise<string>;
    // 1. Detect file type from mimetype
    // 2. PDF: use pdf-parse to extract text
    // 3. DOCX: use mammoth to extract text
    // 4. Return raw text

  async structureProfile(rawText: string): Promise<MasterProfile>;
    // 1. Send raw text to Gemini with resume structuring prompt
    // 2. Prompt asks for structured JSON output:
    //    { summary, skills[], experience[], education[], certifications[], languages[] }
    // 3. Parse response into MasterProfile type
    // 4. Return structured profile
}
```

### `cover-letter.service.ts`

```typescript
export class CoverLetterService {
  async generate(userId: string, dto: GenerateCoverLetterDto): Promise<{ content: string }>;
    // 1. Get user's master profile
    // 2. Get job details (title, company, snapshotMarkdown)
    // 3. Validate: master profile exists
    // 4. Build prompt with:
    //    - User's profile (skills, experience, summary)
    //    - Job description (snapshot markdown)
    //    - Tone preference
    //    - Additional instructions
    // 5. Call GeminiService.generateText()
    // 6. Format response as HTML (paragraphs, etc.)
    // 7. Create auto timeline entry: "Cover letter generated"
    // 8. Return { content }

  async findByJob(jobId: string, userId: string): Promise<CoverLetter[]>;
  async create(userId: string, dto: CreateCoverLetterDto): Promise<CoverLetter>;
  async update(id: string, userId: string, dto: UpdateCoverLetterDto): Promise<CoverLetter>;
  async delete(id: string, userId: string): Promise<void>;
  async findOne(id: string, userId: string): Promise<CoverLetter>;
}
```

---

## Prompt Templates

### `resume-structure.prompt.ts`

```typescript
export const RESUME_STRUCTURE_PROMPT = `
You are a resume parser. Extract structured information from the following resume text.

Return a JSON object with the following structure:
{
  "summary": "Brief professional summary (2-3 sentences)",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null if current",
      "description": "Brief role description",
      "highlights": ["achievement1", "achievement2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "graduationDate": "YYYY-MM",
      "gpa": "GPA if mentioned"
    }
  ],
  "certifications": ["cert1", "cert2"],
  "languages": ["language1", "language2"]
}

Resume text:
{resumeText}
`;
```

### `cover-letter.prompt.ts`

```typescript
export const COVER_LETTER_PROMPT = `
You are an expert cover letter writer. Generate a compelling, tailored cover letter.

Tone: {tone}
{additionalInstructions}

Candidate Profile:
- Summary: {summary}
- Key Skills: {skills}
- Recent Experience: {recentExperience}

Job Details:
- Title: {jobTitle}
- Company: {company}
- Description: {jobDescription}

Requirements:
1. Address the specific requirements mentioned in the job description
2. Highlight relevant skills and experience from the candidate's profile
3. Show genuine interest in the company and role
4. Keep it concise (3-4 paragraphs)
5. Use the specified tone
6. Do NOT include placeholder text like [Your Name] — use the candidate's information
7. Format as clean HTML with <p> tags for paragraphs

Generate the cover letter:
`;
```

---

## Rate Limiting

```typescript
// Simple in-memory rate limiter per user
// Limits: 10 AI generations per hour per user
// Implementation: Map<userId, { count, resetAt }>
// Returns 429 Too Many Requests when limit exceeded
// Can be upgraded to Redis-based in production

export class AiRateLimiter {
  private limits = new Map<string, { count: number; resetAt: Date }>();

  check(userId: string): boolean;
  increment(userId: string): void;
  getRemainingRequests(userId: string): number;
}
```

---

## Integration with Storage Module

The `StorageService.uploadResume()` (Plan 06) calls:
```typescript
// In storage.service.ts:
const rawText = await this.resumeParserService.extractText(file);
const profile = await this.resumeParserService.structureProfile(rawText);
```

---

## Step-by-Step Implementation Order

1. **Create `cover-letter.entity.ts`** — CoverLetter entity
2. **Create migration** — `CreateCoverLettersTable`
3. **Create DTOs** — generate, create, update cover letter
4. **Create `gemini.service.ts`** — Gemini API wrapper
5. **Create prompt templates** — Resume structuring, cover letter generation
6. **Create `resume-parser.service.ts`** — PDF/DOCX extraction + AI structuring
7. **Create rate limiter** — Per-user AI generation limits
8. **Create `cover-letter.service.ts`** — Generation + CRUD
9. **Create `ai.controller.ts`** — AI routes
10. **Create `ai.module.ts`** — Wire up module, export services
11. **Integrate with StorageModule** — ResumeParserService for uploads
12. **Register AiModule in AppModule**
13. **Test resume extraction** — PDF text extraction, DOCX text extraction
14. **Test resume structuring** — Raw text → structured profile via Gemini
15. **Test cover letter generation** — Generate with various tones
16. **Test rate limiting** — Verify 429 after limit exceeded
17. **Test CRUD** — Save, update, delete cover letters

---

## Testing Strategy

### Unit Tests (Jest)
- `GeminiService.generateText`: mocks Gemini API, returns expected text
- `GeminiService`: handles API errors gracefully (rate limit, timeout)
- `ResumeParserService.extractText`: extracts text from PDF (mock pdf-parse)
- `ResumeParserService.extractText`: extracts text from DOCX (mock mammoth)
- `ResumeParserService.structureProfile`: sends correct prompt, parses response
- `CoverLetterService.generate`: builds correct prompt with profile + job data
- `CoverLetterService.generate`: validates master profile exists (400 if missing)
- `CoverLetterService.generate`: applies tone preference
- `AiRateLimiter`: allows within limit, blocks after limit, resets after window

### E2E Tests (Supertest)
- `POST /api/cover-letters/generate` — generates cover letter (mocked Gemini)
- `POST /api/cover-letters/generate` — 400 if no master profile
- `POST /api/cover-letters/generate` — 429 if rate limited
- `GET /api/jobs/:id/cover-letters` — returns cover letters for job
- `POST /api/cover-letters` — saves cover letter
- `PATCH /api/cover-letters/:id` — updates content
- `DELETE /api/cover-letters/:id` — removes cover letter

---

## Acceptance Criteria

- [ ] Gemini service connects to Google Gemini API
- [ ] Resume text extraction works for PDF files
- [ ] Resume text extraction works for DOCX files
- [ ] Resume structuring converts raw text to MasterProfile JSON
- [ ] Cover letter generation uses profile + job description
- [ ] Tone preference affects generated content
- [ ] Additional instructions are included in prompt
- [ ] Generated cover letter is formatted as HTML
- [ ] Rate limiting: 10 generations per hour per user
- [ ] Rate limiting returns 429 with remaining time info
- [ ] Cover letters can be saved (CRUD operations)
- [ ] Cover letters are scoped to user (ownership enforced)
- [ ] Multiple cover letters can exist per job
- [ ] Auto timeline entry created on generation
- [ ] Missing master profile returns clear 400 error
- [ ] Gemini API errors handled gracefully (don't crash server)
