# Extension Answer Surfacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the saved answer library inside the Chrome extension popup so a screening question can be answered on the application form itself.

**Architecture:** One injected pass on popup open returns both the job data and the page's essay fields; `App.tsx` uses that to preselect one of two tabs. Answers are ranked against the detected question by a local bigram similarity, then inserted through the native value setter (so React-controlled ATS forms register the change) or copied.

**Tech Stack:** Vite + @crxjs, React 19, TypeScript, Vitest + Testing Library, Tailwind v4. Backend is Express 5 + Drizzle.

**Design spec:** `docs/superpowers/specs/2026-08-27-extension-answer-surfacing-design.md`
**Tracker:** `t-0c5uc8` · decisions `d-0c9ove` (surface + navigation), `d-0c9ovf` (matching)

---

## File Structure

| File | Responsibility |
|---|---|
| `backend-express/src/modules/extension/extension.controller.ts` | +2 handlers delegating to `answersService` |
| `backend-express/src/modules/extension/extension.router.ts` | +2 routes behind `apiKeyMiddleware` |
| `extension/src/lib/match.ts` | Normalise, score, rank. Pure, no DOM, no deps |
| `extension/src/lib/api.ts` | +`listAnswers`, +`markAnswerUsed` |
| `extension/src/lib/messages.ts` | +`SCAN_FIELDS`, +`INSERT_ANSWER` |
| `extension/src/content/answer-fields.ts` | Find essay fields, extract question, tag element |
| `extension/src/content/answer-insert.ts` | Write text into a tagged field |
| `extension/src/content/index.ts` | Route the two new messages |
| `extension/src/popup/capture.ts` | One injected pass returning job + fields |
| `extension/src/popup/ui/Tabs.tsx` | Tab strip primitive |
| `extension/src/popup/views/AnswersView.tsx` | The answers surface |
| `extension/src/popup/App.tsx` | Tab state, context preselect, hoisted page load |
| `extension/src/popup/views/CaptureView.tsx` | Takes page data as props instead of self-loading |

**Ordering rationale:** backend first (the extension calls it), then pure lib code (no DOM), then content scripts, then the popup UI that consumes all of it.

---

## Task 1: Extension answers endpoints

The extension authenticates with `X-API-Key` via `apiKeyMiddleware`; `answersRouter` mounts the cookie `authMiddleware`. The extension therefore cannot call `/api/answers`. Add two routes to the extension module that delegate to the existing `answersService` — no new service logic.

**Files:**
- Modify: `backend-express/src/modules/extension/extension.controller.ts`
- Modify: `backend-express/src/modules/extension/extension.router.ts`
- Test: `backend-express/src/modules/extension/extension.router.test.ts`

- [ ] **Step 1: Write the failing test**

Open `extension.router.test.ts` and mirror the existing route tests in that file (same app bootstrap, same api-key stubbing). Add:

```ts
describe('GET /api/extension/answers', () => {
  it('returns the api-key user’s answers', async () => {
    const res = await request(app).get('/api/extension/answers').set('X-API-Key', validKey)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('rejects a request with no api key', async () => {
    const res = await request(app).get('/api/extension/answers')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/extension/answers/:id/used', () => {
  it('stamps lastUsedAt and returns the id', async () => {
    const res = await request(app)
      .post(`/api/extension/answers/${seededAnswerId}/used`)
      .set('X-API-Key', validKey)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(seededAnswerId)
    expect(res.body.data.lastUsedAt).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `make test-backend`
Expected: FAIL — both new routes 404.

- [ ] **Step 3: Add the controller handlers**

In `extension.controller.ts`, import the service and add two handlers above the export. `requireApiUserId` already exists in this file.

```ts
import { answersService } from '@/modules/answers/answers.service.js'

async function listAnswers(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await answersService.list(requireApiUserId(req)) })
}
async function markAnswerUsed(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  res.status(200).json({ data: await answersService.markUsed(requireApiUserId(req), id) })
}
```

Extend the export:

```ts
export const extensionController = { verifyKey, checkUrl, quickCreate, scrape, listAnswers, markAnswerUsed }
```

- [ ] **Step 4: Add the routes**

In `extension.router.ts`, after the `/scrape` line:

```ts
router.get('/answers', asyncHandler(extensionController.listAnswers))
router.post('/answers/:id/used', asyncHandler(extensionController.markAnswerUsed))
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `make test-backend`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-express/src/modules/extension
git commit -m "feat(extension): expose saved answers to the api-key runtime"
```

---

## Task 2: Question matching

Pure functions, no DOM, no dependencies. See `d-0c9ovf` for why this is bigrams and not embeddings.

**Files:**
- Create: `extension/src/lib/match.ts`
- Test: `extension/src/lib/match.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { similarity, rankAnswers, MATCH_THRESHOLD, type RankableAnswer } from './match'

const a = (id: string, question: string, lastUsedAt: string | null = null): RankableAnswer =>
  ({ id, question, lastUsedAt })

describe('similarity', () => {
  it('scores an exact match as 1', () => {
    expect(similarity('Why do you want to work here?', 'Why do you want to work here?')).toBe(1)
  })

  it('ignores case and punctuation', () => {
    expect(similarity('Why us?', 'why us')).toBe(1)
  })

  it('scores a reworded question above the threshold', () => {
    const score = similarity(
      'Why do you want to work at Acme?',
      'Why do you want to work at this company?',
    )
    expect(score).toBeGreaterThan(MATCH_THRESHOLD)
  })

  it('scores an unrelated question below the threshold', () => {
    const score = similarity(
      'What is your expected salary?',
      'Describe a time you resolved a conflict on your team.',
    )
    expect(score).toBeLessThan(MATCH_THRESHOLD)
  })

  it('returns 0 for an empty input', () => {
    expect(similarity('', 'anything')).toBe(0)
  })
})

describe('rankAnswers', () => {
  it('puts the best match first and flags it', () => {
    const ranked = rankAnswers(
      [a('1', 'What are your salary expectations?'), a('2', 'Why do you want to work at this company?')],
      'Why do you want to work at Acme?',
    )
    expect(ranked[0].answer.id).toBe('2')
    expect(ranked[0].isMatch).toBe(true)
    expect(ranked[1].isMatch).toBe(false)
  })

  it('falls back to last-used order when there is no question', () => {
    const ranked = rankAnswers(
      [a('1', 'Older', '2026-01-01T00:00:00Z'), a('2', 'Newer', '2026-06-01T00:00:00Z')],
      null,
    )
    expect(ranked.map((r) => r.answer.id)).toEqual(['2', '1'])
    expect(ranked.every((r) => !r.isMatch)).toBe(true)
  })

  it('sorts never-used answers after used ones', () => {
    const ranked = rankAnswers([a('1', 'Never used', null), a('2', 'Used', '2026-06-01T00:00:00Z')], null)
    expect(ranked.map((r) => r.answer.id)).toEqual(['2', '1'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `docker compose exec frontend-next true` is irrelevant here — the extension suite runs on the host:
`cd extension && npx vitest run src/lib/match.test.ts`
Expected: FAIL — `Cannot find module './match'`.

- [ ] **Step 3: Write the implementation**

```ts
// Ranks saved answers against the question read off the page.
//
// ponytail: Dice over character bigrams — no dependency, runs in the popup, and
// it beats the category leader, which matches on the exact string only. It
// catches rewording and typos ("...at Acme?" vs "...at this company?") but NOT
// semantically equivalent phrasings ("Why are you interested in this role?").
// Upgrade path is server-side embeddings behind this same interface, once
// there's evidence users actually hit near-miss phrasings. See d-0c9ovf.

export const MATCH_THRESHOLD = 0.45

export interface RankableAnswer {
  id: string
  question: string
  lastUsedAt: string | null
}

export interface RankedAnswer<T extends RankableAnswer = RankableAnswer> {
  answer: T
  score: number
  isMatch: boolean
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function bigrams(value: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (let i = 0; i < value.length - 1; i += 1) {
    const gram = value.slice(i, i + 2)
    counts.set(gram, (counts.get(gram) ?? 0) + 1)
  }
  return counts
}

export function similarity(left: string, right: string): number {
  const a = normalize(left)
  const b = normalize(right)
  if (!a || !b) return 0
  if (a === b) return 1

  const gramsA = bigrams(a)
  const gramsB = bigrams(b)
  let overlap = 0
  for (const [gram, count] of gramsA) {
    overlap += Math.min(count, gramsB.get(gram) ?? 0)
  }
  const total = a.length - 1 + (b.length - 1)
  return total > 0 ? (2 * overlap) / total : 0
}

function usedAt(answer: RankableAnswer): number {
  return answer.lastUsedAt ? new Date(answer.lastUsedAt).getTime() : 0
}

export function rankAnswers<T extends RankableAnswer>(answers: T[], question: string | null): RankedAnswer<T>[] {
  return answers
    .map((answer) => {
      const score = question ? similarity(question, answer.question) : 0
      return { answer, score, isMatch: score >= MATCH_THRESHOLD }
    })
    .sort((a, b) => b.score - a.score || usedAt(b.answer) - usedAt(a.answer))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd extension && npx vitest run src/lib/match.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add extension/src/lib/match.ts extension/src/lib/match.test.ts
git commit -m "feat(extension): rank saved answers against a detected question"
```

---

## Task 3: Answer API calls

**Files:**
- Modify: `extension/src/lib/api.ts`
- Test: `extension/src/lib/api.test.ts`

- [ ] **Step 1: Write the failing test**

Mirror the existing fetch-mocking style already in `api.test.ts`. Add:

```ts
describe('listAnswers', () => {
  it('sends the api key and unwraps the envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: '1', question: 'Why us?', answerShort: 'a', answerLong: null, lastUsedAt: null }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const answers = await listAnswers('http://localhost:8080', 'key-123')

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/extension/answers')
    expect(fetchMock.mock.calls[0][1].headers['X-API-Key']).toBe('key-123')
    expect(answers).toHaveLength(1)
    expect(answers[0].question).toBe('Why us?')
  })
})

describe('markAnswerUsed', () => {
  it('posts to the used endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: '1', lastUsedAt: '2026-08-27T00:00:00Z' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await markAnswerUsed('http://localhost:8080', 'key-123', '1')

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/extension/answers/1/used')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })
})
```

Add `listAnswers, markAnswerUsed` to the import at the top of the file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd extension && npx vitest run src/lib/api.test.ts`
Expected: FAIL — the exports do not exist.

- [ ] **Step 3: Write the implementation**

In `api.ts`, add the type beside the other result interfaces:

```ts
export interface SavedAnswer {
  id: string
  question: string
  answerShort: string | null
  answerLong: string | null
  lastUsedAt: string | null
}
```

and the two calls beside `scrape`/`quickCreate`:

```ts
export function listAnswers(serverUrl: string, token: string): Promise<SavedAnswer[]> {
  return call<SavedAnswer[]>(serverUrl, token, '/api/extension/answers')
}

export function markAnswerUsed(serverUrl: string, token: string, id: string): Promise<{ id: string }> {
  return call<{ id: string }>(serverUrl, token, `/api/extension/answers/${id}/used`, { method: 'POST' })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd extension && npx vitest run src/lib/api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extension/src/lib/api.ts extension/src/lib/api.test.ts
git commit -m "feat(extension): add answer list and mark-used api calls"
```

---

## Task 4: Essay field detection

**Files:**
- Create: `extension/src/content/answer-fields.ts`
- Test: `extension/src/content/answer-fields.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { findAnswerFields, FIELD_ATTR } from './answer-fields'

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

describe('findAnswerFields', () => {
  it('reads aria-label first', () => {
    const doc = docFrom(`<textarea aria-label="Why do you want to work here?"></textarea>`)
    expect(findAnswerFields(doc)[0].question).toBe('Why do you want to work here?')
  })

  it('falls back to a label[for]', () => {
    const doc = docFrom(`<label for="q1">Describe a challenge you faced.</label><textarea id="q1"></textarea>`)
    expect(findAnswerFields(doc)[0].question).toBe('Describe a challenge you faced.')
  })

  it('falls back to a wrapping label', () => {
    const doc = docFrom(`<label>What motivates you?<textarea></textarea></label>`)
    expect(findAnswerFields(doc)[0].question).toBe('What motivates you?')
  })

  it('falls back to a placeholder', () => {
    const doc = docFrom(`<textarea placeholder="Tell us about yourself"></textarea>`)
    expect(findAnswerFields(doc)[0].question).toBe('Tell us about yourself')
  })

  it('falls back to the nearest preceding text', () => {
    const doc = docFrom(`<div><p>Why are you a good fit for this role?</p><textarea></textarea></div>`)
    expect(findAnswerFields(doc)[0].question).toBe('Why are you a good fit for this role?')
  })

  it('captures maxLength when the field declares one', () => {
    const doc = docFrom(`<textarea aria-label="Why us?" maxlength="500"></textarea>`)
    expect(findAnswerFields(doc)[0].maxLength).toBe(500)
  })

  it('reports maxLength as null when unset', () => {
    const doc = docFrom(`<textarea aria-label="Why us?"></textarea>`)
    expect(findAnswerFields(doc)[0].maxLength).toBeNull()
  })

  it('tags each field so an insert can find it later', () => {
    const doc = docFrom(`<textarea aria-label="One"></textarea><textarea aria-label="Two"></textarea>`)
    const fields = findAnswerFields(doc)
    expect(fields).toHaveLength(2)
    expect(doc.querySelector(`[${FIELD_ATTR}="${fields[0].fieldId}"]`)).not.toBeNull()
    expect(fields[0].fieldId).not.toBe(fields[1].fieldId)
  })

  it('finds contenteditable fields', () => {
    const doc = docFrom(`<div contenteditable="true" aria-label="Cover letter"></div>`)
    expect(findAnswerFields(doc)[0].question).toBe('Cover letter')
  })

  it('ignores plain text inputs — browser autofill already owns those', () => {
    const doc = docFrom(`<label for="n">Full name</label><input id="n" type="text">`)
    expect(findAnswerFields(doc)).toHaveLength(0)
  })

  it('ignores hidden fields', () => {
    const doc = docFrom(`<textarea aria-label="Hidden" hidden></textarea>`)
    expect(findAnswerFields(doc)).toHaveLength(0)
  })

  it('skips a field whose question cannot be read', () => {
    const doc = docFrom(`<textarea></textarea>`)
    expect(findAnswerFields(doc)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd extension && npx vitest run src/content/answer-fields.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// Finds the open-ended fields on an application form and reads the question
// each one is asking. Every field is tagged with FIELD_ATTR so a later insert
// can find its target without holding a element reference across the message
// boundary.

export const FIELD_ATTR = 'data-jv-field'

export interface AnswerField {
  fieldId: string
  question: string
  maxLength: number | null
}

// Plain <input type="text"> is deliberately excluded: that is name, email and
// phone, which browser autofill already owns natively.
const FIELD_SELECTOR = 'textarea, [contenteditable="true"], [contenteditable=""]'

function textOf(node: Element | null | undefined): string {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function precedingText(el: Element): string {
  let node: Element | null = el
  for (let depth = 0; node && depth < 4; depth += 1) {
    let sibling = node.previousElementSibling
    while (sibling) {
      const text = textOf(sibling)
      if (text.length >= 8 && text.length <= 300) return text
      sibling = sibling.previousElementSibling
    }
    node = node.parentElement
  }
  return ''
}

function questionFor(el: Element, doc: Document): string {
  const aria = el.getAttribute('aria-label')?.trim()
  if (aria) return aria

  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => textOf(doc.getElementById(id)))
      .filter(Boolean)
      .join(' ')
    if (text) return text
  }

  const id = el.getAttribute('id')
  if (id) {
    const labelled = textOf(doc.querySelector(`label[for="${CSS.escape(id)}"]`))
    if (labelled) return labelled
  }

  const wrapping = textOf(el.closest('label'))
  if (wrapping) return wrapping

  const placeholder = el.getAttribute('placeholder')?.trim()
  if (placeholder) return placeholder

  return precedingText(el)
}

function isHidden(el: Element): boolean {
  if (el.hasAttribute('hidden')) return true
  const style = el.getAttribute('style') ?? ''
  return /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)
}

function maxLengthOf(el: Element): number | null {
  const raw = el.getAttribute('maxlength')
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function findAnswerFields(doc: Document): AnswerField[] {
  const fields: AnswerField[] = []
  let index = 0

  for (const el of Array.from(doc.querySelectorAll(FIELD_SELECTOR))) {
    if (isHidden(el)) continue
    const question = questionFor(el, doc)
    // A field whose question cannot be read is useless — there is nothing to
    // match against, and inserting into an unlabelled box is a guess.
    if (!question) continue

    index += 1
    const fieldId = `jv-${index}`
    el.setAttribute(FIELD_ATTR, fieldId)
    fields.push({ fieldId, question, maxLength: maxLengthOf(el) })
  }

  return fields
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd extension && npx vitest run src/content/answer-fields.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add extension/src/content/answer-fields.ts extension/src/content/answer-fields.test.ts
git commit -m "feat(extension): detect essay fields and the question each asks"
```

---

## Task 5: Insert into a field

**Files:**
- Create: `extension/src/content/answer-insert.ts`
- Test: `extension/src/content/answer-insert.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { insertIntoField } from './answer-insert'
import { FIELD_ATTR } from './answer-fields'

function docWith(html: string): Document {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

describe('insertIntoField', () => {
  it('writes the text into a tagged textarea', () => {
    const doc = docWith(`<textarea ${FIELD_ATTR}="jv-1"></textarea>`)
    expect(insertIntoField(doc, 'jv-1', 'my answer')).toBe(true)
    expect(doc.querySelector('textarea')!.value).toBe('my answer')
  })

  it('fires a bubbling input event so React-controlled forms register it', () => {
    const doc = docWith(`<textarea ${FIELD_ATTR}="jv-1"></textarea>`)
    const onInput = vi.fn()
    doc.body.addEventListener('input', onInput)

    insertIntoField(doc, 'jv-1', 'my answer')

    expect(onInput).toHaveBeenCalledTimes(1)
  })

  it('writes into a contenteditable field', () => {
    const doc = docWith(`<div contenteditable="true" ${FIELD_ATTR}="jv-1"></div>`)
    expect(insertIntoField(doc, 'jv-1', 'my answer')).toBe(true)
    expect(doc.querySelector('div')!.textContent).toBe('my answer')
  })

  it('returns false when the field is gone', () => {
    const doc = docWith(`<textarea ${FIELD_ATTR}="jv-1"></textarea>`)
    expect(insertIntoField(doc, 'jv-missing', 'my answer')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd extension && npx vitest run src/content/answer-insert.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import { FIELD_ATTR } from './answer-fields'

// Assigning el.value directly does NOT fire React's onChange: React installs its
// own value setter on the element instance and tracks the last value it wrote.
// Going through the prototype's native setter and then dispatching a bubbling
// input event is what makes a controlled ATS form actually register the text —
// otherwise it looks filled and submits empty.
function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, text: string): void {
  const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (setter) setter.call(el, text)
  else el.value = text
}

export function insertIntoField(doc: Document, fieldId: string, text: string): boolean {
  const el = doc.querySelector(`[${FIELD_ATTR}="${CSS.escape(fieldId)}"]`)
  if (!el) return false

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    setNativeValue(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  if (el.getAttribute('contenteditable') !== null) {
    el.textContent = text
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }

  return false
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd extension && npx vitest run src/content/answer-insert.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add extension/src/content/answer-insert.ts extension/src/content/answer-insert.test.ts
git commit -m "feat(extension): insert an answer through the native value setter"
```

---

## Task 6: Message contracts and content-script routing

**Files:**
- Modify: `extension/src/lib/messages.ts`
- Modify: `extension/src/content/index.ts`

- [ ] **Step 1: Add the message contracts**

In `messages.ts`, beside the existing constants:

```ts
export const SCAN_FIELDS = 'JOBVAULT_SCAN_FIELDS' as const
export const INSERT_ANSWER = 'JOBVAULT_INSERT_ANSWER' as const

export interface ScanFieldsMessage {
  type: typeof SCAN_FIELDS
}
export interface InsertAnswerMessage {
  type: typeof INSERT_ANSWER
  fieldId: string
  text: string
}
```

- [ ] **Step 2: Route them in the content script**

`content/index.ts` currently handles only `EXTRACT`. Replace the listener body so all three messages are routed. Note the existing header comment claims the script is auto-injected via `manifest content_scripts` — that is stale (the manifest declares none; injection is on-demand through `activeTab`). Correct it while you are here.

```ts
import { extractFromDocument } from './extract'
import { findAnswerFields } from './answer-fields'
import { insertIntoField } from './answer-insert'
import { EXTRACT, SCAN_FIELDS, INSERT_ANSWER } from '@/lib/messages'

// Injected on demand via activeTab + scripting when the user opens the popup —
// the manifest declares no content_scripts and no job-site host permission.
// Replies to the popup with the job read from the live DOM, the open-ended
// fields on the page, and performs a user-initiated insert.
declare global {
  interface Window {
    __jobvaultListenerAttached?: boolean
  }
}

if (!window.__jobvaultListenerAttached) {
  window.__jobvaultListenerAttached = true
  chrome.runtime.onMessage.addListener(
    (message: { type?: string; fieldId?: string; text?: string }, _sender, sendResponse) => {
      if (message.type === EXTRACT) {
        sendResponse(extractFromDocument(document, location.href))
        return
      }
      if (message.type === SCAN_FIELDS) {
        sendResponse(findAnswerFields(document))
        return
      }
      if (message.type === INSERT_ANSWER && message.fieldId && typeof message.text === 'string') {
        sendResponse(insertIntoField(document, message.fieldId, message.text))
      }
    },
  )
}
```

- [ ] **Step 3: Verify the existing content tests still pass**

Run: `cd extension && npx vitest run src/content`
Expected: PASS — no regression in `extract.test.ts` or `detector.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add extension/src/lib/messages.ts extension/src/content/index.ts
git commit -m "feat(extension): route field-scan and insert messages"
```

---

## Task 7: One injected pass for both signals

Tab preselection needs the job data *and* the field list before either view renders, so one pass returns both. Without this the popup injects twice on every open.

**Files:**
- Modify: `extension/src/popup/capture.ts`

- [ ] **Step 1: Add the combined read**

Add to `capture.ts`, keeping `capturePage` exported and unchanged for now (Task 10 switches the caller):

```ts
import { SCAN_FIELDS } from '@/lib/messages'
import type { AnswerField } from '@/content/answer-fields'

export interface PageRead {
  job: ExtractedJobData
  fields: AnswerField[]
  tabId: number | null
}

// One injection, both signals. The tab strip cannot decide which tab is active
// until it knows whether this page has open-ended fields, so splitting this into
// two passes would mean injecting twice on every popup open.
export async function readPage(serverUrl: string, token: string): Promise<PageRead> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  const url = tab?.url ?? ''
  const tabId = tab?.id ?? null

  let fields: AnswerField[] = []
  let live: ExtractedJobData | null = null

  if (tabId != null && /^https?:/i.test(url)) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: [contentScriptUrl] })
      const [job, scanned] = await Promise.all([
        chrome.tabs.sendMessage(tabId, { type: EXTRACT }) as Promise<ExtractedJobData | undefined>,
        chrome.tabs.sendMessage(tabId, { type: SCAN_FIELDS }) as Promise<AnswerField[] | undefined>,
      ])
      if (job && job.confidence !== 'empty') live = job
      fields = scanned ?? []
    } catch {
      // Restricted page (chrome://, the Web Store, a PDF) — fall through.
    }
  }

  if (live) return { job: live, fields, tabId }

  const scraped = await scrape(serverUrl, token, url)
  return { job: scrapeToExtracted(scraped, url), fields, tabId }
}

export async function insertAnswer(tabId: number, fieldId: string, text: string): Promise<boolean> {
  try {
    return (await chrome.tabs.sendMessage(tabId, { type: INSERT_ANSWER, fieldId, text })) === true
  } catch {
    return false
  }
}
```

Add `INSERT_ANSWER` to the `@/lib/messages` import at the top of the file.

- [ ] **Step 2: Typecheck**

Run: `cd extension && npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add extension/src/popup/capture.ts
git commit -m "feat(extension): read the job and the page's fields in one pass"
```

---

## Task 8: Tab strip primitive

A component, never inline styled markup — this repo's rule.

**Files:**
- Create: `extension/src/popup/ui/Tabs.tsx`
- Test: `extension/src/popup/ui/Tabs.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs } from './Tabs'

const items = [
  { id: 'job', label: 'Save job' },
  { id: 'answers', label: 'Answers' },
]

describe('Tabs', () => {
  it('marks the active tab as selected', () => {
    render(<Tabs items={items} active="answers" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Answers' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Save job' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange with the clicked tab id', async () => {
    const onChange = vi.fn()
    render(<Tabs items={items} active="answers" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Save job' }))
    expect(onChange).toHaveBeenCalledWith('job')
  })

  it('exposes a tablist', () => {
    render(<Tabs items={items} active="job" onChange={() => {}} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd extension && npx vitest run src/popup/ui/Tabs.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Match the token vocabulary the sibling primitives already use (`Button.tsx`, `Badge.tsx`): `border-border`, `text-muted-foreground`, `text-primary`, `bg-background`.

```tsx
export interface TabItem {
  id: string
  label: string
}

interface Props {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ items, active, onChange }: Props) {
  return (
    <div role="tablist" className="flex border-b border-border bg-background">
      {items.map((item) => {
        const selected = item.id === active
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={[
              'flex-1 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd extension && npx vitest run src/popup/ui/Tabs.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add extension/src/popup/ui/Tabs.tsx extension/src/popup/ui/Tabs.test.tsx
git commit -m "feat(extension): add the tab strip primitive"
```

---

## Task 9: The answers view

Visual reference: `/home/weloin/jobvault-mockups/popup-nav.html`, frames 4a/4b and the edge-states row. Popup is 360px, `overflow: hidden` — the answer list scrolls inside a capped container, the page never does.

**Files:**
- Create: `extension/src/popup/views/AnswersView.tsx`
- Test: `extension/src/popup/views/AnswersView.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnswersView } from './AnswersView'
import type { SavedAnswer } from '@/lib/api'
import type { AnswerField } from '@/content/answer-fields'

vi.mock('@/lib/api', async () => ({
  ...(await vi.importActual<typeof import('@/lib/api')>('@/lib/api')),
  listAnswers: vi.fn(),
  markAnswerUsed: vi.fn().mockResolvedValue({ id: '1' }),
}))
vi.mock('@/lib/storage', () => ({
  getToken: vi.fn().mockResolvedValue('key-123'),
  getSettings: vi.fn().mockResolvedValue({ serverUrl: 'http://localhost:8080' }),
}))

const { listAnswers, markAnswerUsed } = await import('@/lib/api')

const answers: SavedAnswer[] = [
  { id: '1', question: 'Why do you want to work at this company?', answerShort: 'Short one.', answerLong: 'Long one, much longer.', lastUsedAt: null },
  { id: '2', question: 'What are your salary expectations?', answerShort: 'Market rate.', answerLong: null, lastUsedAt: null },
]

const field = (over: Partial<AnswerField> = {}): AnswerField => ({
  fieldId: 'jv-1',
  question: 'Why do you want to work at Acme?',
  maxLength: null,
  ...over,
})

beforeEach(() => {
  vi.mocked(listAnswers).mockResolvedValue(answers)
})

describe('AnswersView', () => {
  it('floats the matching answer to the top and marks it', async () => {
    render(<AnswersView fields={[field()]} tabId={7} onSettings={() => {}} />)
    const rows = await screen.findAllByRole('article')
    expect(rows[0]).toHaveTextContent('Why do you want to work at this company?')
    expect(rows[0]).toHaveTextContent(/match/i)
  })

  it('shows the detected question', async () => {
    render(<AnswersView fields={[field()]} tabId={7} onSettings={() => {}} />)
    expect(await screen.findByText('Why do you want to work at Acme?')).toBeInTheDocument()
  })

  it('offers copy only when no field was detected', async () => {
    render(<AnswersView fields={[]} tabId={7} onSettings={() => {}} />)
    await screen.findAllByRole('article')
    expect(screen.queryByRole('button', { name: /insert/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /copy/i }).length).toBeGreaterThan(0)
  })

  it('preselects the short variant when the field caps below the long one', async () => {
    render(<AnswersView fields={[field({ maxLength: 15 })]} tabId={7} onSettings={() => {}} />)
    const short = await screen.findByRole('radio', { name: /short/i })
    expect(short).toBeChecked()
  })

  it('stamps last-used after a copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<AnswersView fields={[]} tabId={7} onSettings={() => {}} />)
    const copies = await screen.findAllByRole('button', { name: /copy/i })
    await userEvent.click(copies[0])

    expect(writeText).toHaveBeenCalled()
    expect(markAnswerUsed).toHaveBeenCalled()
  })

  it('filters the list by the search box', async () => {
    render(<AnswersView fields={[]} tabId={7} onSettings={() => {}} />)
    await screen.findAllByRole('article')
    await userEvent.type(screen.getByRole('searchbox'), 'salary')
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  it('offers a way out when nothing matches well', async () => {
    render(<AnswersView fields={[field({ question: 'Describe your favourite programming language.' })]} tabId={7} onSettings={() => {}} />)
    expect(await screen.findByRole('link', { name: /write an answer/i })).toBeInTheDocument()
  })

  it('shows an empty state with a CTA when nothing is saved', async () => {
    vi.mocked(listAnswers).mockResolvedValue([])
    render(<AnswersView fields={[]} tabId={7} onSettings={() => {}} />)
    expect(await screen.findByText(/nothing saved yet/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd extension && npx vitest run src/popup/views/AnswersView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Requirements the tests pin, all of which come from the spec:

- Load answers on mount via `listAnswers`, using `getSettings`/`getToken` exactly as `CaptureView` does.
- Rank with `rankAnswers(answers, fields[0]?.question ?? null)` from `@/lib/match`.
- Each row is `role="article"`, carries the question (truncated after two lines) and a variant chip group of `role="radio"` inputs labelled `Short · <chars>` / `Long · <chars>`, where a missing variant renders a disabled chip reading `Long — none`.
- **Variant preselection:** if the field declares `maxLength` and the long variant exceeds it while the short variant fits, preselect short; otherwise preselect long when it exists, else short. This is why answers are measured in characters.
- **Insert renders only when `fields.length > 0` and `tabId != null`.** Otherwise the row shows copy alone.
- Insert calls `insertAnswer(tabId, fields[0].fieldId, text)` from `@/popup/capture`; on `false`, surface a failure message rather than closing silently.
- Insert and copy both call `markAnswerUsed`, and only stamp **after** the clipboard write or insert resolves — mirror `answer-copy-chip.tsx` in the web app, which fixed exactly this ordering bug (commit `474ad40`).
- A `role="searchbox"` input filters on the question text, case-insensitively.
- The detected question renders in a "From this page" strip above the list, only when `fields.length > 0`.
- Degradations: no fields → full library, copy-only, no strip; fields but nothing above `MATCH_THRESHOLD` → ranked list plus a link to `${serverUrl}/app/answers?new` reading "Write an answer for this question →"; zero answers → serif "Nothing saved yet" with a CTA to `${serverUrl}/app/answers`.
- List scrolls in a `max-h-[306px] overflow-y-auto` container; the popup body does not.

Reuse `Button`, `Badge`, `Input`, `Field`, `Spinner` from `../ui/`. No inline styled markup — if a shape repeats, extract it.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd extension && npx vitest run src/popup/views/AnswersView.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add extension/src/popup/views/AnswersView.tsx extension/src/popup/views/AnswersView.test.tsx
git commit -m "feat(extension): add the answers view with ranked insert and copy"
```

---

## Task 10: Tabs in the shell, preselected by context

**Files:**
- Modify: `extension/src/popup/App.tsx`
- Modify: `extension/src/popup/views/CaptureView.tsx`
- Test: `extension/src/popup/App.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('@/lib/storage', () => ({
  getToken: vi.fn().mockResolvedValue('key-123'),
  getSettings: vi.fn().mockResolvedValue({ serverUrl: 'http://localhost:8080' }),
  clearToken: vi.fn(),
}))
vi.mock('@/lib/api', () => ({
  verifyKey: vi.fn().mockResolvedValue({ ok: true, user: { email: 'a@b.c' } }),
  listAnswers: vi.fn().mockResolvedValue([]),
  markAnswerUsed: vi.fn(),
  checkUrl: vi.fn().mockResolvedValue({ isDuplicate: false }),
  quickCreate: vi.fn(),
}))
vi.mock('./capture', () => ({ readPage: vi.fn(), insertAnswer: vi.fn() }))

const { readPage } = await import('./capture')

const job = { title: 'Engineer', company: 'Acme', sourceUrl: 'https://x', platform: 'generic', confidence: 'ok' } as const

beforeEach(() => vi.clearAllMocks())

describe('App tab preselection', () => {
  it('opens on Answers when the page has essay fields', async () => {
    vi.mocked(readPage).mockResolvedValue({
      job: { ...job },
      fields: [{ fieldId: 'jv-1', question: 'Why us?', maxLength: null }],
      tabId: 7,
    })
    render(<App />)
    expect(await screen.findByRole('tab', { name: 'Answers' })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens on Save job when the page has none', async () => {
    vi.mocked(readPage).mockResolvedValue({ job: { ...job }, fields: [], tabId: 7 })
    render(<App />)
    expect(await screen.findByRole('tab', { name: 'Save job' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows both tabs regardless of context', async () => {
    vi.mocked(readPage).mockResolvedValue({ job: { ...job }, fields: [], tabId: 7 })
    render(<App />)
    expect(await screen.findByRole('tab', { name: 'Answers' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Save job' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd extension && npx vitest run src/popup/App.test.tsx`
Expected: FAIL — no tablist rendered.

- [ ] **Step 3: Hoist the page read and add the tab state**

In `App.tsx`:
- Extend the `capture` screen to carry the `PageRead`: `{ name: 'capture'; email: string | null; page: PageRead }`.
- In `refresh`, after `verifyKey` succeeds, `const page = await readPage(serverUrl, token)` and store it on the screen.
- Add `const [tab, setTab] = useState<'job' | 'answers'>('job')`, and set it from the read: `setTab(page.fields.length > 0 ? 'answers' : 'job')`.
- Render `<Tabs items={[{id:'job',label:'Save job'},{id:'answers',label:'Answers'}]} active={tab} onChange={(id) => setTab(id as 'job'|'answers')} />` above the active view, in the `capture` case only. Connect, success and settings keep no tab strip.
- Render `<CaptureView page={screen.page} ... />` or `<AnswersView fields={screen.page.fields} tabId={screen.page.tabId} ... />` by `tab`.

In `CaptureView.tsx`:
- Add `page: PageRead` to `Props`.
- Delete the `useEffect`/`load` pair that called `capturePage`, and the `loading` state it drove. Seed `data`, `title`, `company`, `location` from `page.job` in `useState` initialisers.
- Keep the `checkUrl` duplicate lookup — move it into a `useEffect` keyed on `page.job.sourceUrl`.
- `capturePage` is now unused; delete it from `capture.ts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd extension && npx vitest run`
Expected: PASS — the new App tests plus every pre-existing extension test.

- [ ] **Step 5: Commit**

```bash
git add extension/src/popup
git commit -m "feat(extension): preselect the popup tab from page context"
```

---

## Task 11: Gates, manual verification, tracker

- [ ] **Step 1: Full extension suite and typecheck**

Run: `cd extension && npx vitest run && npx tsc -p tsconfig.json --noEmit && npm run lint`
Expected: all pass.

- [ ] **Step 2: Repo gates**

Run: `make gates`
Expected: backend + web typecheck, lint, both suites, production web build all pass.

- [ ] **Step 3: Build the extension and load it unpacked**

Run: `cd extension && npm run build`
Then in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `extension/dist`.

- [ ] **Step 4: Manual verification against a real form**

Confirm on a live Greenhouse or Workday application page:
1. Opening the popup lands on the **Answers** tab, with the page's question in the strip.
2. A saved answer with similar wording is first and marked as a match.
3. Insert puts the text in the box, and the ATS's own character counter updates — this is the proof the native-setter path works. If the counter stays at 0, the `input` event is not reaching their handler.
4. On a plain job listing (LinkedIn), the popup lands on **Save job** instead, and capture still works.
5. On a page with no essay fields, the answers tab lists the library with copy-only rows.

- [ ] **Step 5: Update the tracker and progress**

Set `t-0c5uc8` to `status: done`, bump `updated`. Add a one-line entry to `CLAUDE.md`'s Done list and the narrative to `progress.md`. Run `blink validate` — expect `0 error(s)`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: record the extension answer surface"
```

---

## Deferred, tracked elsewhere

- **On-page overlay chip** — `t-0015`. Needs a persistent content script and broad host permissions.
- **Pin the extension key** — `t-0012`. Graduates from polish to security work once the extension is a primary answer surface.
- **Job-context picker for generation** — `t-0c61ek`, web app side.
