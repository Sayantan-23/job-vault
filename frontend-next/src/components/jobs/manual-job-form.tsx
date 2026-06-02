'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ManualJobSchema, type ManualJobValues } from '@/schemas/job'
import { useCreateJob } from '@/hooks/use-jobs'
import { JOB_STATUSES, STATUS_META } from '@/lib/job-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

export function ManualJobForm({
  onCreated,
  prefill,
}: {
  onCreated: () => void
  prefill?: Partial<ManualJobValues>
}) {
  const create = useCreateJob()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ManualJobValues>({
    resolver: zodResolver(ManualJobSchema),
    defaultValues: {
      title: prefill?.title ?? '',
      company: prefill?.company ?? '',
      location: prefill?.location ?? '',
      salaryRange: prefill?.salaryRange ?? '',
      sourceUrl: prefill?.sourceUrl ?? '',
      status: prefill?.status ?? 'WISHLIST',
      notes: prefill?.notes ?? '',
    },
  })

  const onSubmit = (values: ManualJobValues) => {
    // Drop empty optional strings so the backend stores null, not ''.
    const payload: ManualJobValues = { title: values.title, company: values.company }
    if (values.location) payload.location = values.location
    if (values.salaryRange) payload.salaryRange = values.salaryRange
    if (values.sourceUrl) payload.sourceUrl = values.sourceUrl
    if (values.status) payload.status = values.status
    if (values.notes) payload.notes = values.notes
    create.mutate(payload, { onSuccess: onCreated })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {create.error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {create.error.message}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="e.g. Senior Frontend Engineer" {...register('title')} />
          {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company">Company</Label>
          <Input id="company" placeholder="e.g. Acme Inc" {...register('company')} />
          {errors.company ? <p className="text-xs text-destructive">{errors.company.message}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="e.g. Remote, Berlin" {...register('location')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="salaryRange">Salary range</Label>
          <Input id="salaryRange" placeholder="e.g. ₹12–18 LPA" {...register('salaryRange')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sourceUrl">Source URL</Label>
        <Input id="sourceUrl" type="url" placeholder="https://…" {...register('sourceUrl')} />
        {errors.sourceUrl ? <p className="text-xs text-destructive">{errors.sourceUrl.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <Select id="status" {...register('status')}>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Anything worth remembering — contacts, deadlines, prep…"
          {...register('notes')}
        />
      </div>

      <Button type="submit" className="w-full" disabled={create.isPending}>
        {create.isPending ? 'Adding…' : 'Add job'}
      </Button>
    </form>
  )
}
