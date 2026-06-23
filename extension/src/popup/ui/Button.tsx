import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(17,17,17,0.06)] hover:opacity-95 active:scale-[0.99]',
  outline: 'border border-border bg-card text-foreground hover:bg-muted active:scale-[0.99]',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'text-destructive hover:bg-destructive/10 active:scale-[0.99]',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-[opacity,transform,background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
