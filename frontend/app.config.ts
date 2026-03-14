export default defineAppConfig({
  ui: {
    colors: {
      primary: 'violet',
      secondary: 'indigo',
      success: 'emerald',
      info: 'sky',
      warning: 'amber',
      error: 'rose',
      neutral: 'zinc',
    },
    card: {
      slots: {
        root: 'rounded-2xl shadow-lg',
      },
    },
    input: {
      slots: {
        root: 'w-full !rounded-none !border-0 border-b border-gray-300 dark:border-gray-600 !bg-transparent !ring-0 !shadow-none focus-within:border-[var(--ui-primary)] transition-colors',
        base: '!rounded-none !bg-transparent',
        leadingIcon: 'shrink-0 text-dimmed/60',
        trailingIcon: 'shrink-0 text-dimmed/60',
      },
      variants: {
        variant: {
          outline: '!ring-0 !shadow-none !bg-transparent !border-0',
          soft: '!ring-0 !shadow-none !bg-transparent !border-0',
          subtle: '!ring-0 !shadow-none !bg-transparent !border-0',
          ghost: '!ring-0 !shadow-none !bg-transparent !border-0',
          none: '!ring-0 !shadow-none !bg-transparent !border-0',
        },
      },
      compoundVariants: [],
      defaultVariants: {
        variant: 'none' as const,
        size: 'xl' as const,
      },
    },
    button: {
      slots: {
        base: [
          'rounded-full font-semibold inline-flex items-center justify-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75',
          'transition-all',
        ],
      },
      defaultVariants: {
        color: 'primary' as const,
        variant: 'solid' as const,
      },
    },
    formField: {
      slots: {
        label: 'text-xs font-semibold uppercase tracking-wider text-highlighted',
      },
    },
  },
})
