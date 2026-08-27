// One length variant of a saved answer, as a radio in the row's chip group.
// The count is CHARACTERS, not words — application forms cap characters, so the
// number here is the one that decides whether the variant fits the field.
export function VariantChip({
  label,
  text,
  checked,
  onSelect,
}: {
  label: string
  text: string | null
  checked: boolean
  onSelect: () => void
}) {
  if (!text) {
    return (
      <span className="rounded-full border border-dashed border-border px-2.5 py-[3px] text-[11px] font-medium text-muted-foreground opacity-65">
        {label} — none
      </span>
    )
  }
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`rounded-full border px-2.5 py-[3px] text-[11px] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked
          ? 'border-primary/45 bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {label} · {text.length.toLocaleString()}
    </button>
  )
}
