import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'
import { VariantChip } from '../ui/VariantChip'
import { CheckIcon, CopyIcon, FileTextIcon, SearchIcon } from '../ui/icons'
import { insertAnswer } from '../capture'
import { getSettings, getToken } from '@/lib/storage'
import { listAnswers, markAnswerUsed, type SavedAnswer } from '@/lib/api'
import { rankAnswers } from '@/lib/match'
import type { AnswerField } from '@/content/answer-fields'

type Variant = 'short' | 'long'

interface Props {
  fields: AnswerField[]
  tabId: number | null
}

function textFor(answer: SavedAnswer, variant: Variant): string | null {
  return variant === 'long' ? answer.answerLong : answer.answerShort
}

// The long variant is the default because it is the one worth pasting — unless
// the field declares a character cap it does not fit. Answers are measured in
// characters precisely so this call can be made.
function defaultVariant(answer: SavedAnswer, maxLength: number | null): Variant {
  if (!answer.answerLong) return 'short'
  if (!answer.answerShort) return 'long'
  if (maxLength != null && answer.answerLong.length > maxLength && answer.answerShort.length <= maxLength) {
    return 'short'
  }
  return 'long'
}

// A popup can't navigate itself anywhere useful — open the web app in a tab,
// the way CaptureView and SuccessView do.
function openInApp(event: MouseEvent<HTMLAnchorElement>, url: string) {
  event.preventDefault()
  chrome.tabs.create({ url })
}

export function AnswersView({ fields, tabId }: Props) {
  const [answers, setAnswers] = useState<SavedAnswer[]>([])
  const [serverUrl, setServerUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<Record<string, Variant>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [insertedId, setInsertedId] = useState<string | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)

  // The page scan is form-wide, so the user picks which of its questions the
  // list ranks against and Insert writes into. Derived, not synced: a pick that
  // no longer exists just falls back to the first field.
  const target = fields.find((item) => item.fieldId === pickedId) ?? fields[0] ?? null
  const detected = target?.question ?? null

  // Loads on first show and never again: <Activity> re-runs effects each time
  // the tab comes back, and the library does not change while the popup is open.
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const settings = await getSettings()
      setServerUrl(settings.serverUrl)
      const token = await getToken()
      if (!token) throw new Error('Not connected')
      setAnswers(await listAnswers(settings.serverUrl, token))
    } catch {
      setError('Couldn’t load your answers.')
    } finally {
      setLoading(false)
    }
  }

  // Best-effort: a failed stamp must never look like a failed copy or insert.
  async function stamp(id: string) {
    try {
      const settings = await getSettings()
      const token = await getToken()
      if (token) await markAnswerUsed(settings.serverUrl, token, id)
    } catch {
      /* the answer still went where the user wanted it */
    }
  }

  // Stamps only once the clipboard has actually taken the text — a rejected
  // write must not record a use that never happened.
  async function copy(answer: SavedAnswer, text: string) {
    setError(null)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      setError('Couldn’t copy to the clipboard.')
      return
    }
    setCopiedId(answer.id)
    await stamp(answer.id)
  }

  async function insert(answer: SavedAnswer, text: string) {
    if (!target || tabId == null) return
    setError(null)
    if (!(await insertAnswer(tabId, target.fieldId, text))) {
      setError('Couldn’t fill that field. Copy the answer instead.')
      return
    }
    // The popup stays open on purpose: a screening page stacks several
    // questions, and closing here would cost a reopen per insert — the exact
    // cost this view exists to remove.
    setInsertedId(answer.id)
    setTimeout(() => setInsertedId((current) => (current === answer.id ? null : current)), 2500)
    await stamp(answer.id)
  }

  const ranked = rankAnswers(answers, detected)
  const hasMatch = ranked[0]?.isMatch === true
  const needle = query.trim().toLowerCase()
  const visible = needle
    ? ranked.filter((entry) => entry.answer.question.toLowerCase().includes(needle))
    : ranked
  const canInsert = fields.length > 0 && tabId != null
  const more =
    detected && !hasMatch
      ? { href: `${serverUrl}/app/answers?new`, label: 'Write an answer for this question →' }
      : {
          href: `${serverUrl}/app/answers`,
          label: `Browse all ${answers.length} answer${answers.length === 1 ? '' : 's'} →`,
        }

  return (
    <div>
      {loading ? (
        <div className="flex h-44 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <Spinner className="text-primary" />
          Loading your answers…
        </div>
      ) : (
        <div className="space-y-3 p-5">
          {answers.length > 0 ? (
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your answers"
                aria-label="Search your answers"
                className="pl-9"
              />
            </div>
          ) : null}

          {target ? (
            <div className="rounded-lg border border-border bg-muted/60 px-3 py-2">
              <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <FileTextIcon className="size-3" />
                From this page
              </div>
              {fields.length > 1 ? (
                <QuestionSwitcher
                  fields={fields}
                  picked={target.fieldId}
                  onPick={(fieldId) => {
                    setPickedId(fieldId)
                    // A variant picked under one field's cap must not survive into a
                    // field with a tighter one — that is how the 1,240-character long
                    // variant ends up in a 500-character box. Re-default instead.
                    setChosen({})
                  }}
                />
              ) : (
                <p className="text-[13px] font-medium">{target.question}</p>
              )}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {answers.length === 0 ? (
            <div className="px-1 pt-5 pb-2 text-center">
              <p className="font-serif text-xl">Nothing saved yet</p>
              <p className="mx-auto mt-1.5 mb-3.5 max-w-[250px] text-[12.5px] leading-relaxed text-muted-foreground">
                Save an answer once and it is here for every application that asks the same thing.
              </p>
              <a
                href={`${serverUrl}/app/answers`}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => openInApp(event, `${serverUrl}/app/answers`)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Write this answer in JobVault
              </a>
            </div>
          ) : (
            <>
              {!detected ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  No question found on this page. Search your library, or click into the field first and
                  reopen.
                </p>
              ) : null}
              {detected && !hasMatch ? (
                <p className="text-xs text-muted-foreground">
                  No saved answer matches this question. Showing your library:
                </p>
              ) : null}

              {visible.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No answers match “{query.trim()}”.
                </p>
              ) : (
                <div className="max-h-[306px] overflow-y-auto">
                  {visible.map((entry, index) => {
                    const answer = entry.answer
                    const variant = chosen[answer.id] ?? defaultVariant(answer, target?.maxLength ?? null)
                    const text = textFor(answer, variant)
                    return (
                      <AnswerRow
                        key={answer.id}
                        answer={answer}
                        variant={variant}
                        best={index === 0 && entry.isMatch}
                        copied={copiedId === answer.id}
                        inserted={insertedId === answer.id}
                        onVariant={(next) => setChosen((prev) => ({ ...prev, [answer.id]: next }))}
                        onCopy={text ? () => void copy(answer, text) : null}
                        onInsert={canInsert && text ? () => void insert(answer, text) : null}
                      />
                    )
                  })}
                </div>
              )}

              <a
                href={more.href}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => openInApp(event, more.href)}
                className="block border-t border-border pt-3 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {more.label}
              </a>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// One chip per open-ended question found on the page. Labels are truncated in
// CSS rather than in the string so the accessible name stays the whole question
// — questions are long and the popup is 360px wide.
function QuestionSwitcher({
  fields,
  picked,
  onPick,
}: {
  fields: AnswerField[]
  picked: string
  onPick: (fieldId: string) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Questions on this page"
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5"
    >
      {fields.map((item) => {
        const active = item.fieldId === picked
        return (
          <button
            key={item.fieldId}
            type="button"
            role="tab"
            aria-selected={active}
            title={item.question}
            onClick={() => onPick(item.fieldId)}
            className={`max-w-[168px] flex-none truncate rounded-full border px-2.5 py-[3px] text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? 'border-primary/45 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.question}
          </button>
        )
      })}
    </div>
  )
}

function AnswerRow({
  answer,
  variant,
  best,
  copied,
  inserted,
  onVariant,
  onCopy,
  onInsert,
}: {
  answer: SavedAnswer
  variant: Variant
  best: boolean
  copied: boolean
  inserted: boolean
  onVariant: (variant: Variant) => void
  onCopy: (() => void) | null
  onInsert: (() => void) | null
}) {
  return (
    <article className="border-t border-border py-3 first:border-t-0">
      <div className="flex items-start gap-2">
        <p className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug">{answer.question}</p>
        {best ? <Badge tone="success">Best match</Badge> : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div
          role="radiogroup"
          aria-label={`Answer length for “${answer.question}”`}
          className="flex min-w-0 gap-1.5"
        >
          <VariantChip
            label="Short"
            text={answer.answerShort}
            checked={variant === 'short'}
            onSelect={() => onVariant('short')}
          />
          <VariantChip
            label="Long"
            text={answer.answerLong}
            checked={variant === 'long'}
            onSelect={() => onVariant('long')}
          />
        </div>
        <div className="flex flex-none items-center gap-1.5">
          {onInsert ? (
            <button
              type="button"
              onClick={onInsert}
              className={`inline-flex h-7 items-center gap-1 rounded-lg px-3 text-xs font-medium shadow-[0_1px_2px_rgba(17,17,17,0.06)] transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                inserted ? 'bg-success/12 text-success shadow-none' : 'bg-primary text-primary-foreground'
              }`}
            >
              {inserted ? (
                <>
                  <CheckIcon className="size-3" /> Inserted
                </>
              ) : (
                'Insert'
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCopy ?? undefined}
            disabled={!onCopy}
            aria-label={`Copy the ${variant} answer to “${answer.question}”`}
            className="inline-flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          </button>
        </div>
      </div>
    </article>
  )
}
