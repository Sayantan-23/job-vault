import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface BulletListEditorProps {
  bullets: string[];
  onChange: (bullets: string[]) => void;
  placeholder?: string;
}

export function BulletListEditor({
  bullets,
  onChange,
  placeholder = 'Add a key achievement or bullet point…',
}: BulletListEditorProps) {
  const [draft, setDraft] = useState('');

  const addBullet = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...bullets, trimmed]);
    setDraft('');
  };

  const removeBullet = (index: number) => {
    onChange(bullets.filter((_, i) => i !== index));
  };

  return (
    <View className="gap-2">
      {bullets.map((bullet, idx) => (
        <View
          key={idx}
          className="flex-row items-start justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 p-2.5">
          <Text className="flex-1 text-sm text-foreground">
            <Text className="font-bold text-muted-foreground">• </Text>
            {bullet}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove bullet ${idx + 1}`}
            onPress={() => removeBullet(idx)}
            className="rounded p-1 active:opacity-60">
            <Icon icon={Trash2} size={14} className="text-muted-foreground" />
          </Pressable>
        </View>
      ))}

      <View className="flex-row items-center gap-2 pt-1">
        <View className="flex-1">
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            onSubmitEditing={addBullet}
            returnKeyType="done"
            accessibilityLabel="New bullet item"
          />
        </View>
        <Button
          variant="outline"
          size="sm"
          onPress={addBullet}
          disabled={!draft.trim()}
          accessibilityLabel="Add bullet">
          <Icon icon={Plus} size={15} />
        </Button>
      </View>
    </View>
  );
}
