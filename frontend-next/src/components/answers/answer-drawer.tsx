'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useCreateAnswer, useGenerateAnswer, useUpdateAnswer } from '@/hooks/use-answers'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import type { Answer, AnswerDraft } from '@/types/answer'
import { AnswerEditor, type AnswerFormValues } from './answer-editor'

interface Props {
  answer: Answer | null
  isNew: boolean
  personas: { id: string; name: string }[]
  aiEnabled: boolean
  onClose: () => void
}

const EMPTY: AnswerFormValues = { question: '', answerShort: '', answerLong: '' }

export function AnswerDrawer({ answer, isNew, personas, aiEnabled, onClose }: Props) {
  const open = isNew || answer !== null
  const [draft, setDraft] = useState<AnswerDraft | null>(null)

  const create = useCreateAnswer()
  const update = useUpdateAnswer(answer?.id ?? '')
  const generate = useGenerateAnswer()
  const active = answer ? update : create
  const error = create.error ?? update.error ?? generate.error

  const initial: AnswerFormValues = answer
    ? { question: answer.question, answerShort: answer.answerShort ?? '', answerLong: answer.answerLong ?? '' }
    : EMPTY

  const close = () => {
    setDraft(null)
    create.reset()
    update.reset()
    generate.reset()
    onClose()
  }

  const save = (values: AnswerFormValues) => {
    const body = { question: values.question, answerShort: values.answerShort, answerLong: values.answerLong }
    if (answer) update.mutate(body, { onSuccess: close })
    else create.mutate(body, { onSuccess: close })
  }

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? undefined : close())}>
      <SheetContent className="p-0">
        <SheetTitle className="sr-only">{answer ? 'Edit answer' : 'New answer'}</SheetTitle>
        <div className="space-y-5 p-6">
          <h2 className="font-serif text-2xl">{answer ? 'Edit answer' : 'New answer'}</h2>
          {error ? <MutationErrorAlert error={error} /> : null}
          {/* Keyed on the answer id so switching rows resets every field —
              without it the previous answer's text leaks into the next one. */}
          <AnswerEditor
            key={answer?.id ?? 'new'}
            initial={initial}
            personas={personas}
            aiEnabled={aiEnabled}
            isSaving={active.isPending}
            onSave={save}
            isGenerating={generate.isPending}
            draft={draft}
            onAcceptDraft={() => setDraft(null)}
            onDiscardDraft={() => setDraft(null)}
            // `question` comes from the editor's live state, not from `initial`
            // — generating right after retyping the question must use what is
            // on screen.
            onGenerate={({ question, personaId, instructions }) =>
              generate.mutate({ question, personaId, ...(instructions ? { instructions } : {}) }, { onSuccess: setDraft })
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
