// frontend-next/src/components/personas/persona-item-picker.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

// Generic multi-select over master-profile items for the persona editor.
// Checking copies the profile item into the persona draft (deep copy, id kept
// so the checkbox reflects draft membership); unchecking removes it by id.
export interface PersonaItemPickerProps<T extends { id?: string }> {
  label: string
  profileItems: T[]
  selectedIds: Set<string>
  getTitle: (item: T) => string
  getSubtitle?: (item: T) => string
  onAdd: (items: T[]) => void
  onRemove: (ids: string[]) => void
  emptyHint: string
}

export function PersonaItemPicker<T extends { id?: string }>({
  label,
  profileItems,
  selectedIds,
  getTitle,
  getSubtitle,
  onAdd,
  onRemove,
  emptyHint,
}: PersonaItemPickerProps<T>) {
  if (profileItems.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>
  }

  const isSelected = (item: T) => item.id !== undefined && selectedIds.has(item.id)
  const unselected = profileItems.filter((item) => !isSelected(item))

  return (
    <div role="group" aria-label={label} className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border py-1 pl-3 pr-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          From your profile
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={unselected.length === 0}
          onClick={() => onAdd(unselected.map((item) => structuredClone(item)))}
        >
          Add all
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {profileItems.map((item, i) => (
          <PersonaItemPickerRow
            key={item.id ?? i}
            title={getTitle(item)}
            subtitle={getSubtitle?.(item)}
            checked={isSelected(item)}
            onToggle={() => {
              if (isSelected(item)) onRemove([item.id as string])
              else onAdd([structuredClone(item)])
            }}
          />
        ))}
      </ul>
    </div>
  )
}

function PersonaItemPickerRow({
  title,
  subtitle,
  checked,
  onToggle,
}: {
  title: string
  subtitle?: string | undefined
  checked: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-3 px-3 py-2 transition-colors hover:bg-accent/50">
        <Checkbox checked={checked} onChange={onToggle} className="mt-0.5" />
        <span className="min-w-0">
          <span className="block truncate text-sm text-foreground">{title}</span>
          {subtitle ? (
            <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
          ) : null}
        </span>
      </label>
    </li>
  )
}
