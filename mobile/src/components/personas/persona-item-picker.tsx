import { Pressable, Text, View } from 'react-native-css/components';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { newId } from '@/lib/profile';

export interface PersonaItemPickerProps<T extends { id?: string }> {
  label: string;
  profileItems: T[];
  selectedIds: Set<string>;
  getTitle: (item: T) => string;
  getSubtitle?: (item: T) => string | undefined;
  onAdd: (items: T[]) => void;
  onRemove: (ids: string[]) => void;
  emptyHint: string;
}

export function PersonaItemPicker<T extends { id?: string }>({
  label,
  profileItems,
  selectedIds,
  getTitle,
  getSubtitle,
  onAdd,
  onRemove,
  emptyHint,
}: PersonaItemPickerProps<T>) {
  if (profileItems.length === 0) {
    return (
      <View className="rounded-lg border border-dashed border-border/80 p-3 bg-muted/10">
        <Text className="text-xs text-muted-foreground italic">{emptyHint}</Text>
      </View>
    );
  }

  const isSelected = (item: T) => item.id !== undefined && selectedIds.has(item.id);
  const unselected = profileItems.filter((item) => !isSelected(item));

  return (
    <View
      accessibilityLabel={label}
      className="rounded-lg border border-border/80 bg-card overflow-hidden">
      {/* Picker Header */}
      <View className="flex-row items-center justify-between border-b border-border/60 bg-muted/20 px-3 py-2">
        <Text className="font-sans-medium text-xs uppercase tracking-wide text-muted-foreground">
          From your profile
        </Text>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={unselected.length === 0}
          onPress={() =>
            onAdd(
              unselected.map((item) => {
                const copy = structuredClone(item);
                if (!copy.id) copy.id = newId();
                return copy;
              })
            )
          }
          accessibilityLabel={`Add all ${label}`}>
          Add all
        </Button>
      </View>

      {/* Item Rows */}
      <View className="divide-y divide-border/50">
        {profileItems.map((item, i) => {
          const checked = isSelected(item);
          const title = getTitle(item);
          const subtitle = getSubtitle?.(item);
          const itemId = item.id ?? `item-${i}`;

          const toggle = () => {
            if (checked) {
              if (item.id) onRemove([item.id]);
            } else {
              const copy = structuredClone(item);
              if (!copy.id) copy.id = newId();
              onAdd([copy]);
            }
          };

          return (
            <Pressable
              key={itemId}
              onPress={toggle}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={`${checked ? 'Remove' : 'Add'} ${title}`}
              className="flex-row items-center gap-3 p-3 active:bg-muted/30">
              <View pointerEvents="none" className="shrink-0">
                <Checkbox checked={checked} />
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-sans-medium text-sm text-foreground">
                  {title}
                </Text>
                {subtitle ? (
                  <Text numberOfLines={1} className="mt-0.5 text-xs text-muted-foreground">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
