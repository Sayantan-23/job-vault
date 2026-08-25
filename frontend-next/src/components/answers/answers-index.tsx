'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppPage } from '@/components/layout/app/app-page'
import { PageHeading } from '@/components/layout/app/page-heading'
import { SearchInput } from '@/components/jobs/search-input'
import { NoPersonasHint } from '@/components/documents/no-personas-hint'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import { useConfirm } from '@/hooks/use-confirm'
import { useAnswers, useDeleteAnswer, useMarkAnswerUsed } from '@/hooks/use-answers'
import { usePersonas } from '@/hooks/use-personas'
import { useAiStatus } from '@/hooks/use-ai-status'
import { AnswerList } from './answer-list'
import { AnswerDrawer } from './answer-drawer'

export function AnswersIndex() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('answer')
  const isNew = searchParams.has('new')

  const [filter, setFilter] = useState('')
  const { data: answers } = useAnswers()
  const { data: personas } = usePersonas()
  const { data: aiStatus } = useAiStatus()
  const remove = useDeleteAnswer()
  const markUsed = useMarkAnswerUsed()
  const { confirm, confirmDialog } = useConfirm()

  const rows = useMemo(() => {
    const all = answers ?? []
    const q = filter.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (a) =>
        a.question.toLowerCase().includes(q) ||
        (a.answerShort ?? '').toLowerCase().includes(q) ||
        (a.answerLong ?? '').toLowerCase().includes(q),
    )
  }, [answers, filter])

  const setParam = (next: URLSearchParams) => {
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }
  const open = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    next.set('answer', id)
    setParam(next)
  }
  const openNew = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('answer')
    next.set('new', '')
    setParam(next)
  }
  const close = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('answer')
    next.delete('new')
    setParam(next)
  }

  const onDelete = async (id: string) => {
    const answer = (answers ?? []).find((a) => a.id === id)
    const ok = await confirm({
      title: 'Delete this answer?',
      description: answer
        ? `“${answer.question}” will be permanently removed.`
        : 'This answer will be permanently removed.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (ok) remove.mutate(id)
  }

  return (
    <AppPage>
      <PageHeading
        title="Answers"
        description="Reusable answers to the questions application forms keep asking."
        actions={
          <Button type="button" onClick={openNew}>
            <Plus className="size-4" aria-hidden="true" />
            New answer
          </Button>
        }
      />
      {personas !== undefined && personas.length === 0 ? <NoPersonasHint noun="answer" /> : null}
      {remove.error ? <MutationErrorAlert error={remove.error} /> : null}
      <div className="mb-4 max-w-sm">
        <SearchInput value={filter} onChange={setFilter} placeholder="Search answers…" ariaLabel="Search answers" />
      </div>
      <AnswerList answers={rows} onSelect={open} onDelete={onDelete} onCopied={(id) => markUsed.mutate(id)} />
      <AnswerDrawer
        answer={(answers ?? []).find((a) => a.id === selectedId) ?? null}
        isNew={isNew}
        personas={personas ?? []}
        aiEnabled={aiStatus?.enabled ?? false}
        onClose={close}
      />
      {confirmDialog}
    </AppPage>
  )
}
