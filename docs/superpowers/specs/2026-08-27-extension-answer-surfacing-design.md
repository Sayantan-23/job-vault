# Extension answer surfacing — design

**Task:** `t-0c5uc8` · **Date:** 2026-08-27 · **Depends on:** the saved answers library (`t-0c5xex`, shipped 2026-08-25)

Put the saved answer library inside the Chrome extension popup, so a screening
question can be answered without leaving the application form.

## Why this, and why now

The answers library shipped as a web surface. Until an answer reaches the form
page, using one costs a tab switch, a scan and a copy — per question. That cost
is the thing the library was built to remove, and it is not removed yet.

A competitor survey (reading the shipped Simplify and Teal CRX bundles, not
marketing copy) found reusable open-ended answers to be near-unoccupied ground.
Only Simplify has them, as a silent exact-string cache with no browsable UI, and
their own documentation apologises for it: *"The wording has to match exactly.
Similar questions with slightly different phrasing are treated as separate
questions."* Approximate matching clears the category leader's bar on day one.

## Scope

**In:** answers only. Read the question off the page, rank saved answers against
it, insert or copy the chosen variant.

**Out — deliberately:**

- **Form facts** (notice period, CTC, years of experience, work authorisation).
  Storage only pays when composing costs more than retrieving, and these are
  memorised. Browser autofill already covers name/email/phone/address natively.
- **Silent autofill of essay fields.** This is where Simplify sits ("Autofill
  all fields with AI"). A wrong 200-word answer submitted to a real employer is
  unrecoverable in a way the saved time does not justify.
- **AI generation inside the popup.** The no-match state links out to
  `/app/answers`. This matches the dominant pattern across Huntr, Careerflow,
  Jobscan and Teal: the extension owns *this page, right now*; the web app owns
  composition and libraries.
- **On-page overlay.** Tracked separately as `t-0015`. It requires a persistent
  content script and broad host permissions — a real architectural change and a
  Web Store review surface, not a UI addition.

**Known ceiling.** Desktop browser only. Nothing here helps in a job-board
mobile app, where the fallback stays the responsive web app plus system copy and
paste. State this rather than implying the extension covers every apply path.

## Interaction model

The popup gains a second job. It now holds both "save this job" and "answer this
question", navigated by a **persistent two-tab strip whose active tab is chosen
by page context**.

Rejected alternatives:

- **Tabs alone** — discoverable, but always weights both jobs equally when the
  user is only ever doing one, and spends the tap.
- **Context auto-switch alone** — the best flow and the worst discovery. A mode
  reachable only by accident is a mode most users never learn exists.
- **Home list** — taxes every use of the popup with an extra click to serve
  discoverability once, and demotes the shipped one-click capture flow to two
  clicks.

Tabs plus context-preselection costs only the 38px strip: the feature is visible
on day one, and the correct tab is already active. The detection code is a
prerequisite regardless, since reading the question off the page *is* the
feature. Simplify ships this same shape — a flat persistent tab bar with context
branching inside it.

## Architecture

One injected pass on popup open returns both signals, because tab preselection
needs both before either view can render:

```ts
{ job: ExtractedJobData, fields: AnswerField[] }
```

This hoists `CaptureView`'s existing on-mount load up into `App.tsx`, with data
passed down as props. The alternative is injecting twice on every popup open,
and preselection cannot work without the answer scan resolving first anyway.

`CaptureView` already injects on mount today, so scanning on popup open is
existing behaviour, not a change.

**Permissions are unchanged**: `activeTab` + `scripting`, with
`host_permissions` still scoped to the web-app origin. On-demand injection is
granted by the user gesture of opening the popup.

### New files

| File | Role |
|---|---|
| `src/content/answer-fields.ts` | Find essay fields, extract each question, tag with `data-jv-field`, return `{fieldId, question, maxLength}[]` |
| `src/content/answer-insert.ts` | Write text into a tagged field |
| `src/lib/match.ts` | Rank saved answers against a question. No dependencies |
| `src/popup/views/AnswersView.tsx` | The view |
| `src/popup/ui/Tabs.tsx` | Tab strip primitive — a component, never inline styled markup |

### Touched

`App.tsx` (tab state + preselect) · `capture.ts` (combined pass) · `api.ts`
(+2 calls) · `messages.ts` (+2 messages) · `CaptureView.tsx` (props, not
self-load) · `extension.router.ts` and `extension.controller.ts` (+2 routes).

### Backend

`answersRouter` mounts `authMiddleware`, which reads the access-token cookie.
The extension authenticates with `X-API-Key` through `apiKeyMiddleware`, mounted
on `/api/extension/*`. So the extension cannot call `/api/answers` directly — it
would 401 — and slice 8's rule stands: the API key is the extension's runtime
auth and the cookie model is not weakened to accommodate it.

Two thin routes are added to the **extension** module, mirroring how
`quickCreate` and `checkUrl` already delegate:

| Route | Delegates to |
|---|---|
| `GET /api/extension/answers` | `answersService.list(userId)` |
| `POST /api/extension/answers/:id/used` | `answersService.markUsed(userId, id)` |

No new service logic, no schema change, no migration. The controller resolves
the principal with the existing `requireApiUserId(req)`.

## Field detection

An essay field is a `<textarea>` or `[contenteditable]`. Plain
`<input type="text">` is excluded — that is name, email and phone, which browser
autofill already owns.

Question text, first hit wins:

1. `aria-label`
2. `aria-labelledby`
3. `<label for>`
4. wrapping `<label>`
5. `placeholder`
6. nearest preceding text node above the field

The whole form is scanned, not just the focused field. A Workday or Greenhouse
screening page stacks several open-ended questions; scanning all of them means
one popup open instead of one per question. Each field is tagged with
`data-jv-field` so a later insert can find its target.

## Matching

Dice coefficient over character bigrams of the normalised question. Roughly
fifteen lines, no dependency, runs in the popup.

Above ~0.45 a row gets a match marker. Below, answers still list — just
unmarked.

**Honest ceiling.** This catches rewording and typos: *"Why do you want to work
at Acme?"* scores high against a saved *"Why do you want to work at this
company?"*. It will **not** match semantically equivalent but lexically
different phrasings — *"Why are you interested in this role?"* scores low. No
cheap local algorithm does. The upgrade path is server-side embeddings; the code
carries a `ponytail:` comment saying so rather than implying the problem is
solved.

## Insert and copy

**Insert appears only when the row has a target field.** When no field was
detected on the page, rows show Copy alone — a dead Insert button is worse than
no Insert button.

Two mechanics that matter:

**React-controlled forms need the native setter.** A plain `el.value = text`
does not fire React's `onChange`, so an ATS built on React would silently
discard the text on submit. The correct form is

```ts
Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
  .set.call(el, text)
el.dispatchEvent(new Event('input', { bubbles: true }))
```

**The variant auto-selects by `maxLength`.** If the field declares
`maxlength="500"` and the short variant is 412 characters against a long variant
of 1,240, short is preselected. This is where measuring answers in *characters*
rather than words pays off — forms declare character limits, and the two now
line up. The user can still override with the variant chips.

Insert and copy both stamp `last_used_at` through `POST /api/answers/:id/used`.

## Degradation

Never dead-end. A dead-end empty state is the outlier in this category; every
surveyed product degrades into manual mode instead. This also matches the
existing `CaptureView` empty state ("Couldn't read this page automatically. Fill
in the details below.").

| Situation | Behaviour |
|---|---|
| No question found on the page | Show the full library, copy-only rows |
| Question found, nothing matches well | Ranked list + "Write an answer for this question →" |
| No saved answers at all | Serif empty state + CTA into the web app |

## Verification

- Unit: `match.ts` ranking and normalisation; `answer-fields.ts` label cascade
  against fixture DOMs for LinkedIn/Greenhouse/Workday shapes.
- Unit: `answer-insert.ts` fires a bubbling `input` event and sets value through
  the native setter.
- Component: `AnswersView` renders match markers, variant preselection by
  `maxLength`, and all three degradation states.
- Component: `App` preselects the right tab from each context signal.
- Manual: load unpacked against a real Greenhouse or Workday application form.
