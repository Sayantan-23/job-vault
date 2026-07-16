'use client'

import { useState } from 'react'
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
      {contacts.length === 0 ? (
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
      {editing ? null : <OutreachForm onSubmit={(values) => create.mutate(values)} isPending={create.isPending} />}
    </section>
  )
}
