import { Linking } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';

const WEB_BASE = 'https://jobvault.app';

// Read/copy link only — §4.7: no editing/generation on mobile.
// ponytail: degrade to a link — full reader is C7/C8.
export function ResumeLauncher({ jobId }: { jobId: string }) {
  const href = `${WEB_BASE}/app/resumes?job=${jobId}`;
  return (
    <View className="gap-2">
      <Text className="font-sans-medium text-sm text-foreground">Résumé</Text>
      <Text className="text-sm text-muted-foreground">
        Generate a résumé tailored to this job.
      </Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Generate résumé on the web"
        onPress={() => void Linking.openURL(href)}
        className="flex-row items-center gap-1">
        <Text className="text-sm font-sans-medium text-primary">
          Generate tailored résumé →
        </Text>
      </Pressable>
    </View>
  );
}
