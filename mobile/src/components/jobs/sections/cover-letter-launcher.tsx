import { Linking } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';

const WEB_BASE = 'https://jobvault.app';

// Read/copy link only — §4.7: no editing/generation on mobile.
// ponytail: degrade to a link — full reader is C7/C8.
export function CoverLetterLauncher({ jobId }: { jobId: string }) {
  const href = `${WEB_BASE}/app/cover-letters?new=1&job=${jobId}`;
  return (
    <View className="gap-2">
      <Text className="font-sans-medium text-sm text-foreground">Cover letter</Text>
      <Text className="text-sm text-muted-foreground">
        Generate a cover letter tailored to this job.
      </Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Generate cover letter on the web"
        onPress={() => void Linking.openURL(href)}
        className="flex-row items-center gap-1">
        <Text className="text-sm font-sans-medium text-primary">
          Generate cover letter →
        </Text>
      </Pressable>
    </View>
  );
}
