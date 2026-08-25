'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AnswerDraft } from '@/types/answer'
import { AiDraftNote } from './ai-draft-note'
import { GenerateAnswerControls } from './generate-answer-controls'

export interface AnswerFormValues {
  question: string
  answerShort: string
  answerLong: string
}

interface Props {
  initial: AnswerFormValues
  personas: { id: string; name: string }[]
  aiEnabled: boolean
  isSaving: boolean
  onSave: (values: AnswerFormValues) => void
  // The editor owns the live question text, so it adds it here rather than
  // letting the caller reach for a stale saved value.
  onGenerate: (input: { question: string; personaId: string; instructions?: string }) => void
  isGenerating: boolean
  draft: AnswerDraft | null
  onAcceptDraft: (draft: AnswerDraft) => void
  onDiscardDraft: () => void
}

// Counts are in CHARACTERS, not words: ATS fields cap characters ("max 1500
// characters"), so a word count is a number the user has to translate.
function CharacterCount({ value, target }: { value: string; target: number }) {
  return (
    <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
      {value.length.toLocaleString()} characters
      <span className="px-1.5 text-muted-foreground/50">·</span>
      aims for {target.toLocaleString()}
    </p>
  )
}

function DraftVariant({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{text}</p>
    </div>
  )
}

export function AnswerEditor({
  initial,
  personas,
  aiEnabled,
  isSaving,
  onSave,
  onGenerate,
  isGenerating,
  draft,
  onAcceptDraft,
  onDiscardDraft,
}: Props) {
  const [question, setQuestion] = useState(initial.question)
  const [short, setShort] = useState(initial.answerShort)
  const [long, setLong] = useState(initial.answerLong)

  const canSave =
    question.trim().length > 0 && (short.trim().length > 0 || long.trim().length > 0) && !isSaving

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="answer-question">Question</Label>
        <Input
          id="answer-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Why are you leaving your current role?"
          maxLength={500}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="answer-short">Short answer</Label>
        <Textarea id="answer-short" rows={4} value={short} onChange={(e) => setShort(e.target.value)} />
        <CharacterCount value={short} target={500} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="answer-long">Long answer</Label>
        <Textarea id="answer-long" rows={10} value={long} onChange={(e) => setLong(e.target.value)} />
        <CharacterCount value={long} target={2000} />
      </div>

      {aiEnabled && personas.length > 0 ? (
        <div className="border-t border-hairline pt-5">
          <GenerateAnswerControls
            personas={personas}
            question={question}
            onGenerate={(input) => onGenerate({ ...input, question: question.trim() })}
            isGenerating={isGenerating}
          />
        </div>
      ) : null}

      {draft ? (
        <div className="space-y-4 border-t border-hairline pt-5">
          <AiDraftNote placement="draft" />
          <DraftVariant label="Short" text={draft.short} />
          <DraftVariant label="Long" text={draft.long} />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                setShort(draft.short)
                setLong(draft.long)
                onAcceptDraft(draft)
              }}
            >
              Use this draft
            </Button>
            <Button type="button" variant="ghost" onClick={onDiscardDraft}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end border-t border-hairline pt-5">
        <Button
          type="button"
          disabled={!canSave}
          onClick={() => onSave({ question: question.trim(), answerShort: short.trim(), answerLong: long.trim() })}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
