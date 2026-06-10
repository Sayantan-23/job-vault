import { cn } from '@/lib/utils'

// Deterministic, on-brand tints (light + dark) so a given name always maps to
// the same swatch — a generated monogram, stable per user rather than random.
const PALETTE = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
] as const

function swatchFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length] ?? PALETTE[0]
}

export interface MonogramAvatarProps {
  name: string
  className?: string
}

export function MonogramAvatar({ name, className }: MonogramAvatarProps) {
  const seed = name.trim() || '?'
  const initial = seed.charAt(0).toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 select-none items-center justify-center rounded-md text-sm font-medium',
        swatchFor(seed),
        className,
      )}
    >
      {initial}
    </span>
  )
}
