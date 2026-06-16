'use client'

import { Dialog, DialogContent, DialogTitle, DialogDescription } from './dialog'
import { Button } from './button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

// A small modal for confirming a consequential action (deleting a saved record).
// Parent owns `open`: Cancel/overlay/Esc call onOpenChange(false); Confirm calls
// onConfirm (the parent closes + acts).
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-3">
        <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        {description ? <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription> : null}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={destructive ? 'destructive' : 'default'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
