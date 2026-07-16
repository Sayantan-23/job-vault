'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useConfirm } from '@/hooks/use-confirm'
import { shortDate } from '@/lib/relative-time'
import { OutreachStatusChip } from './outreach-status-chip'
import { CONTACT_STATUSES, type JobContact, type ContactStatus } from '@/types/contact'

const STATUS_LABELS: Record<ContactStatus, string> = {
  NO_RESPONSE: 'No response',
  HEARD_BACK: 'Heard back',
  REFERRED: 'Referred',
  DECLINED: 'Declined',
}

export function OutreachItem({
  contact,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  contact: JobContact
  onStatusChange: (contact: JobContact, status: ContactStatus) => void
  onEdit: (contact: JobContact) => void
  onDelete: (id: string) => void
}) {
  const { confirm, confirmDialog } = useConfirm()

  const onDeleteClick = async () => {
    if (
      await confirm({
        title: 'Delete contact?',
        description: contact.contact,
        confirmLabel: 'Delete',
        destructive: true,
      })
    ) {
      onDelete(contact.id)
    }
  }

  return (
    <div data-testid="outreach-item" className="space-y-2 rounded-lg border border-border px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm leading-snug">{contact.contact}</p>
          <p className="font-mono text-xs text-muted-foreground">
            Reached out {shortDate(contact.reachedOutAt)}
          </p>
          {contact.notes ? <p className="text-xs text-muted-foreground">{contact.notes}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <OutreachStatusChip status={contact.status} />
          <Button type="button" variant="ghost" size="icon" aria-label="Edit contact" onClick={() => onEdit(contact)}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Delete contact" onClick={onDeleteClick}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <Select
        aria-label={`Status for ${contact.contact}`}
        className="h-8 text-xs"
        value={contact.status}
        onChange={(e) => onStatusChange(contact, e.target.value as ContactStatus)}
      >
        {CONTACT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {confirmDialog}
    </div>
  )
}
