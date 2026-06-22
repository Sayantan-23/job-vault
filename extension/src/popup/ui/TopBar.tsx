import { GearIcon, ArrowLeftIcon } from './icons'

export function TopBar({ onSettings, onBack }: { onSettings?: () => void; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-2">
        {onBack ? (
          <button onClick={onBack} aria-label="Back" className="text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4" />
          </button>
        ) : null}
        <span className="text-sm font-semibold tracking-tight">JobVault</span>
      </div>
      {onSettings ? (
        <button onClick={onSettings} aria-label="Settings" className="text-muted-foreground hover:text-foreground">
          <GearIcon className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
