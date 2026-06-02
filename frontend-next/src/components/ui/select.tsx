import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="group relative">
      <select
        ref={ref}
        className={cn(
          'h-11 w-full cursor-pointer appearance-none rounded-lg border border-input bg-background pl-3.5 pr-9 text-sm text-foreground',
          'transition-[color,border-color,box-shadow] outline-none',
          'hover:border-ring/50',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-foreground"
        aria-hidden="true"
      />
    </div>
  ),
)
Select.displayName = 'Select'
