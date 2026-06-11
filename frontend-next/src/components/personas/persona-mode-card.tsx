// frontend-next/src/components/personas/persona-mode-card.tsx
'use client'

// One creation-mode choice in the CreatePersonaSheet: a large clickable card
// with a title + muted subtitle, and an optional hint shown when disabled
// (e.g. "Import a résumé" with AI off).
interface Props {
  title: string
  subtitle: string
  onSelect: () => void
  disabled?: boolean
  disabledHint?: string
}

export function PersonaModeCard({ title, subtitle, onSelect, disabled = false, disabledHint }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-card"
    >
      <span className="block text-sm font-medium text-foreground">{title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{subtitle}</span>
      {disabled && disabledHint ? (
        <span className="mt-2 block text-xs text-muted-foreground">{disabledHint}</span>
      ) : null}
    </button>
  )
}
