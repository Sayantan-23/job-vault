import { useState } from 'react';
import { View } from 'react-native-css/components';

import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { Input } from './input';

export type RenameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  initialValue: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (newName: string) => void | Promise<void>;
  busy?: boolean;
};

function RenameDialogBody({
  title,
  description,
  initialValue,
  placeholder,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  description?: string;
  initialValue: string;
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (newName: string) => void | Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    void onConfirm(trimmed);
  };

  return (
    <DialogContent className="max-w-sm gap-3">
      <DialogTitle>{title}</DialogTitle>
      {description ? <DialogDescription>{description}</DialogDescription> : null}
      <View className="mt-1">
        <Input
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          autoFocus
          accessibilityLabel="Document name input"
          returnKeyType="done"
          onSubmitEditing={handleConfirm}
        />
      </View>
      <View className="mt-2 flex-row justify-end gap-2">
        <Button variant="outline" size="sm" onPress={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={!value.trim() || busy}
          onPress={handleConfirm}>
          {busy ? 'Saving…' : confirmLabel}
        </Button>
      </View>
    </DialogContent>
  );
}

export function RenameDialog({
  open,
  onOpenChange,
  title = 'Rename Document',
  description,
  initialValue,
  placeholder = 'Document name',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  onConfirm,
  busy = false,
}: RenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <RenameDialogBody
          key={initialValue}
          title={title}
          description={description}
          initialValue={initialValue}
          placeholder={placeholder}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          onConfirm={(newName) => {
            void onConfirm(newName);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
          busy={busy}
        />
      ) : null}
    </Dialog>
  );
}

