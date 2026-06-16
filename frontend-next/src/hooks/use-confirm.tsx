'use client'

import { useCallback, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

// Promise-based confirmation: `await confirm({...})` resolves true/false; render
// `confirmDialog` once in the component. Keeps the dialog mounted (toggling open)
// so Radix open/close animations run.
export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' })
  const resolver = useRef<((value: boolean) => void) | undefined>(undefined)

  const settle = useCallback((value: boolean) => {
    setOpen(false)
    resolver.current?.(value)
    resolver.current = undefined
  }, [])

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const confirmDialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) settle(false)
      }}
      onConfirm={() => settle(true)}
      {...options}
    />
  )

  return { confirm, confirmDialog }
}
