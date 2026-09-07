import { useState } from 'react';
import { X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { newLink } from '@/lib/profile';
import type { ProfileLink } from '@/types/profile';

export interface EditLinkSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: ProfileLink | null;
  onSave: (link: ProfileLink) => void;
  onDelete?: () => void;
}

function EditLinkForm({
  link,
  onOpenChange,
  onSave,
  onDelete,
}: Omit<EditLinkSheetProps, 'open'>) {
  const [label, setLabel] = useState(link?.label ?? '');
  const [url, setUrl] = useState(link?.url ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmedLabel = label.trim();
    const trimmedUrl = url.trim();

    if (!trimmedLabel) {
      setError('Label is required (e.g. GitHub, Portfolio)');
      return;
    }
    if (!trimmedUrl) {
      setError('URL is required');
      return;
    }

    onSave({
      id: link?.id ?? newLink().id,
      label: trimmedLabel,
      url: trimmedUrl,
    });
    onOpenChange(false);
  };

  return (
    <>
      <View className="mb-3 flex-row items-center justify-between">
        <SheetTitle>{link ? 'Edit link' : 'Add link'}</SheetTitle>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          onPress={() => onOpenChange(false)}
          className="rounded-md p-1">
          <Icon icon={X} size={16} strokeWidth={2} className="text-muted-foreground" />
        </Pressable>
      </View>

      {error ? (
        <View className="mb-3 rounded-md bg-destructive/10 p-2.5">
          <Text className="text-xs text-destructive">{error}</Text>
        </View>
      ) : null}

      <View className="gap-4 pb-2">
        <View className="gap-1.5">
          <Text className="font-sans-medium text-xs text-muted-foreground">LABEL *</Text>
          <Input
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. GitHub, LinkedIn, Portfolio"
            accessibilityLabel="Link label"
          />
        </View>

        <View className="gap-1.5">
          <Text className="font-sans-medium text-xs text-muted-foreground">URL *</Text>
          <Input
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            keyboardType="url"
            autoCapitalize="none"
            accessibilityLabel="Link URL"
          />
        </View>

        <View className="flex-row items-center gap-2 pt-3">
          {onDelete && link ? (
            <Button
              variant="destructive"
              onPress={() => {
                onDelete();
                onOpenChange(false);
              }}
              className="flex-1">
              Delete
            </Button>
          ) : null}
          <Button onPress={handleSave} className="flex-1">
            Save
          </Button>
        </View>
      </View>
    </>
  );
}

export function EditLinkSheet({
  open,
  onOpenChange,
  link,
  onSave,
  onDelete,
}: EditLinkSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose>
        {open ? (
          <EditLinkForm
            key={link?.id ?? 'new'}
            link={link}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onDelete={onDelete}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
