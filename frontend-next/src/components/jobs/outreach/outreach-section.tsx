'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '@/hooks/use-contacts'
import { OutreachItem } from './outreach-item'
import { OutreachForm } from './outreach-form'
import type { JobContact, ContactStatus } from '@/types/contact'
import type { CreateContactValues } from '@/hooks/use-contacts'

export function OutreachSection({ jobId }: { jobId: string }) {
  const { data: contacts = [] } = useContacts(jobId)
  const create = useCreateContact(jobId)
  const update = useUpdateContact(jobId)
  const remove = useDeleteContact(jobId)
  const [editing, setEditing] = useState<JobContact | null>(null)
  const [adding, setAdding] = useState(false)

  function handleStatusChange(contact: JobContact, status: ContactStatus) {
    if (status !== contact.status) update.mutate({ id: contact.id, patch: { status } })
  }

  function handleEditSubmit(values: CreateContactValues) {
    if (!editing) return
    update.mutate({
      id: editing.id,
      patch: { contact: values.contact, channel: values.channel ?? null, notes: values.notes ?? null },
    })
    setEditing(null)
  }

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">Outreach</h3>
      {contacts.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">
          No outreach yet. Track who you&apos;ve contacted for a referral.
        </p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) =>
            editing?.id === contact.id ? (
              <OutreachForm
                key={contact.id}
                initial={editing}
                onSubmit={handleEditSubmit}
                onCancel={() => setEditing(null)}
                isPending={update.isPending}
              />
            ) : (
              <OutreachItem
                key={contact.id}
                contact={contact}
                onStatusChange={handleStatusChange}
                onEdit={setEditing}
                onDelete={(id) => remove.mutate(id)}
              />
            ),
          )}
        </div>
      )}
      {adding ? (
        <OutreachForm
          onSubmit={(values) => create.mutate(values, { onSuccess: () => setAdding(false) })}
          onCancel={() => setAdding(false)}
          isPending={create.isPending}
        />
      ) : editing ? null : (
        <Button type="button" variant="softPrimary" size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add contact
        </Button>
      )}
    </section>
  )
}
