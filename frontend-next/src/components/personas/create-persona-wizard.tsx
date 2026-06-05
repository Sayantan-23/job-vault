'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { CreatePersonaFormSchema, type CreatePersonaFormValues } from '@/schemas/persona'
import { useCreatePersona } from '@/hooks/use-personas'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePersonaWizard({ open, onOpenChange }: Props) {
  const create = useCreatePersona()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePersonaFormValues>({
    resolver: zodResolver(CreatePersonaFormSchema),
    defaultValues: { name: '', pastedResume: '', freeText: '' },
  })

  const onSubmit = (values: CreatePersonaFormValues) => {
    create.mutate(
      { name: values.name, inputs: { pastedResume: values.pastedResume ?? '', freeText: values.freeText ?? '' } },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold">New persona</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {create.error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {create.error.message}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="persona-name">Persona name</Label>
            <Input id="persona-name" placeholder="e.g. Backend" {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona-resume">Paste your résumé</Label>
            <Textarea id="persona-resume" rows={8} placeholder="Paste your existing résumé text…" {...register('pastedResume')} />
            {errors.pastedResume ? <p className="text-xs text-destructive">{errors.pastedResume.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona-notes">Extra notes (optional)</Label>
            <Textarea id="persona-notes" rows={3} placeholder="Anything to emphasize…" {...register('freeText')} />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? 'Structuring…' : 'Structure with AI'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
