import { cn } from '@/lib/utils'

/**
 * Text-based brand lockup: a minimal "vault dial" mark (custom SVG, not an icon
 * library) in the brand square, next to the JobVault wordmark.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-[10px] bg-primary text-primary-foreground"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 12V5.5" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">JobVault</span>
    </span>
  )
}
