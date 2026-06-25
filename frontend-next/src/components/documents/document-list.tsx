'use client'

import { DocumentListRow, type DocumentRow } from './document-list-row'

export type { DocumentRow } from './document-list-row'

interface Props {
  rows: DocumentRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  emptyText: string
  'aria-label': string
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>
}

// Shared borderless aligned library list (Linear/Height style) — both the
// cover-letters and résumés libraries map their items into DocumentRow.
export function DocumentList({ rows, selectedId, onSelect, onDelete, emptyText, 'aria-label': ariaLabel }: Props) {
  if (rows.length === 0) return <EmptyState text={emptyText} />

  return (
    <ul aria-label={ariaLabel} className="divide-y divide-hairline">
      {rows.map((row) => (
        <li key={row.id}>
          <DocumentListRow row={row} selected={row.id === selectedId} onSelect={onSelect} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  )
}
