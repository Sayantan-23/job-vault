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

// Everything that outlives a render lives here — the AI draft and the three
// mutations' error state — so the shell can key the whole body on the record and
// let a remount do the clearing.
function AnswerDrawerBody({ answer, personas, aiEnabled, onClose }: Omit<Props, 'isNew'>) {
  const [draft, setDraft] = useState<AnswerDraft | null>(null)

  const create = useCreateAnswer()
  const update = useUpdateAnswer(answer?.id ?? '')
  const generate = useGenerateAnswer()
  const active = answer ? update : create
  const error = create.error ?? update.error ?? generate.error

  const initial: AnswerFormValues = answer
    ? { question: answer.question, answerShort: answer.answerShort ?? '', answerLong: answer.answerLong ?? '' }
    : EMPTY

  const save = (values: AnswerFormValues) => {
    const body = { question: values.question, answerShort: values.answerShort, answerLong: values.answerLong }
    if (answer) update.mutate(body, { onSuccess: onClose })
    else create.mutate(body, { onSuccess: onClose })
  }

  return (
    <div className="space-y-5 p-6">
      <SheetTitle className="font-serif text-2xl">{answer ? 'Edit answer' : 'New answer'}</SheetTitle>
      {error ? <MutationErrorAlert error={error} /> : null}
      <AnswerEditor
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
  )
}

export function AnswerDrawer({ answer, isNew, personas, aiEnabled, onClose }: Props) {
  const open = isNew || answer !== null

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? undefined : onClose())}>
      <SheetContent className="p-0">
        {/* The key sits on the body because the body owns the state: the AI
            draft and every mutation error. Switching rows changes the key — and
            so does closing, since the answer goes null and the key falls back to
            'new' — so the body remounts and nothing from the previous answer can
            render, or be saved, under the next one. */}
        <AnswerDrawerBody
          key={answer?.id ?? 'new'}
          answer={answer}
          personas={personas}
          aiEnabled={aiEnabled}
          onClose={onClose}
        />
      </SheetContent>
    </Sheet>
  )
}
