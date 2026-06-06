# Personas + User Master-Profile Redesign — Requirements Brief

> **STATUS: pre-brainstorm requirements capture — NOT an approved spec.** The next session should run the `superpowers:brainstorming` skill over this brief (resolve the open questions with the user), then write the real design spec + plan, then implement with ultracode. Captured 2026-06-06 from the user during Slice 6 review.

## Context
Slice 6 (6a Personas + 6b Résumés + 6c Cover letters) is **complete** on branch `slice-6-ai-resume-cover-letter` (gates green, reviewed, live-smoked; migrations `0004`–`0006`; **not yet merged to master**). While reviewing, the user flagged that the **persona creation flow is too thin**: today it's just `name + paste résumé text → AI structures it`. They want a richer model.

## What the user asked for
1. **A user "master profile"** (a new profile surface, added later): the user stores their reusable **skills, education, projects** (and almost certainly **experience**) once.
2. **Persona creation has two modes** (mode names TBD — user used "manual" vs "auto" just to explain):
   - **Manual mode** — the user fills details per section (skills, experience, projects…). For skills/projects they can **either select from already-added master-profile items OR add persona-specific ones**. **Education should be the same for every persona** (profile-level, shared — not edited per persona).
   - **Auto mode** — just a **persona name + a résumé**; we **scrape/parse the résumé and fill the data with AI** (this is roughly today's behavior). The user said "**upload** resume" — clarify paste-text vs file upload.
3. **Notes** field available in **both** modes (already exists as `personas.rawInput`).

## Open questions to brainstorm (resolve with the user)
1. **Master-profile data model.** A dedicated `user_profiles` table, or reuse the existing **`users.masterProfileJson`** column (it already exists in `backend-express/src/db/schema/users.ts` — verify) + `masterResumeUrl`? What shape — reuse the shared `ResumeContent` schema (`src/shared/resume-content.schema.ts`) for the profile too? Which sections are profile-level (skills, education, projects, experience, basics/contact?).
2. **Profile surface.** A new `/app/profile` page (or under Settings) to manage the master profile. Where does it sit in nav?
3. **Persona ↔ profile relationship.** Does a persona **reference** selected profile items (by id) or **copy/snapshot** them into `personas.data`? Résumé/cover-letter generation currently reads `personas.data` (a self-contained `ResumeContent`) — if personas become references + custom, generation must **resolve** profile + persona at read time (or keep storing a resolved snapshot). Decide the canonical representation.
4. **"Education shared" mechanics.** Education lives only on the profile and is injected into every persona's effective data? Personas never store their own education?
5. **Manual section UX.** Per section (skills, projects, experience): a picker of existing profile items (multi-select) **plus** an "add custom for this persona" affordance. How is "selected from profile" vs "custom" represented?
6. **Auto mode input.** Paste résumé **text** (current, no file infra) vs **file upload** (PDF/DOCX → text extraction). The latter re-opens résumé-file parsing that Slice 6 deliberately deferred (still **no Cloudinary needed** — text can be extracted in-memory with e.g. `pdf-parse`, nothing stored). Decide scope.
7. **Migration / back-compat.** Existing `personas.data` rows are self-contained `ResumeContent`. How do they map to the new reference-based model? (Probably: treat existing as all-custom.)
8. **Mode naming** (user wants better names than "manual"/"auto").
9. **Does this ship before or after merging Slice 6 to master?** (Recommendation: merge Slice 6 first, build this as the next slice from master — but the personas code it extends is only on the Slice 6 branch.)

## Anchors in the current code (for the brainstorm/plan)
- Personas: `backend-express/src/modules/personas/*`, table `src/db/schema/personas.ts` (`data jsonb $type<ResumeContent>`, `rawInput text`, cap via `MAX_PERSONAS`).
- Shared shape: `src/shared/resume-content.schema.ts` (`ResumeContent`: basics/summary/experience/projects/skills/education).
- AI: `src/modules/ai/gemini.service.ts` (`generateStructured`), `ai.prompts.ts` (`buildStructurePrompt`), `GET /api/ai/status`.
- Frontend: `/app/personas` (`personas-workspace.tsx`, `create-persona-wizard.tsx`), reusable `components/resume/resume-content-editor.tsx` (full-schema structured editor — reuse for manual mode), `usePersonas`, `useAiStatus`.
- `users` table already has `masterProfileJson` (jsonb) + `masterResumeUrl` columns (legacy parity) — candidate home for the master profile.

## How to proceed (next session)
1. `superpowers:brainstorming` over this brief → resolve the open questions with the user (one at a time; the user prefers **inline labeled options with a write-in**, not the AskUserQuestion modal — see memory).
2. Write the design spec → `docs/superpowers/specs/2026-06-…-personas-profile-redesign-design.md`.
3. Bite-sized TDD plan → `docs/superpowers/plans/…`.
4. Implement with ultracode (Workflow): per-task TDD → solo gates → adversarial review → live smoke, same loop as Slice 6.
