import { GearIcon, ArrowLeftIcon, LogoMark } from './icons'

export function TopBar({ onSettings, onBack }: { onSettings?: () => void; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            className="-ml-1.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
          </button>
        ) : (
          <span className="flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LogoMark className="size-3" />
          </span>
        )}
        <span className="font-serif text-lg leading-none">JobVault</span>
      </div>
      {onSettings ? (
        <button
          onClick={onSettings}
          aria-label="Settings"
          className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <GearIcon className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
