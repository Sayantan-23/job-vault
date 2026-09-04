import { Linking } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';
import { ExternalLink } from 'lucide-react-native';

import { Icon } from '@/components/icon';
import { MarkdownProse } from '@/components/ui/markdown-prose';

export function JobSnapshot({
  markdown,
  sourceUrl,
}: {
  markdown: string | null;
  sourceUrl: string | null;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-medium text-xs uppercase tracking-wider text-muted-foreground">
          Snapshot
        </Text>
        {sourceUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View original posting"
            onPress={() => void Linking.openURL(sourceUrl)}
            className="flex-row items-center gap-1">
            <Icon icon={ExternalLink} size={14} strokeWidth={1.75} className="text-primary" />
            <Text className="text-xs font-sans-medium text-primary">View original</Text>
          </Pressable>
        ) : null}
      </View>
      {markdown ? (
        <MarkdownProse>{markdown}</MarkdownProse>
      ) : (
        <Text className="text-sm text-muted-foreground">
          No snapshot was captured for this job.
        </Text>
      )}
    </View>
  );
}
