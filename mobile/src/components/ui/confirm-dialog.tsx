import { View } from 'react-native-css/components';

import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

// A small modal for confirming a consequential action (deleting a saved record).
// Parent owns `open`: Cancel/scrim/back call onOpenChange(false); Confirm calls
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
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-3">
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
        <View className="mt-2 flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onPress={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            size="sm"
            onPress={onConfirm}>
            {confirmLabel}
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}
