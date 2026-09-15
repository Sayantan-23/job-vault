import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ExternalLink, FileText, Plus, Sparkles } from 'lucide-react-native';
import { Linking } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { NewCoverLetterSheet } from '@/components/vault/new-cover-letter-sheet';
import { useCoverLetters } from '@/hooks/use-cover-letters';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';

const WEB_BASE = 'https://jobvault.app';

export function CoverLetterLauncher({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const { colors = LIGHT_COLORS } = useTheme() ?? {};

  const { data: letters = [], isLoading } = useCoverLetters(jobId);
  const href = `${WEB_BASE}/app/cover-letters?new=1&job=${jobId}`;

  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between">
        <Text style={{ color: colors.foreground }} className="font-sans-medium text-sm text-foreground">Cover letters</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Generate cover letter on the web"
          onPress={() => void Linking.openURL(href)}
          className="flex-row items-center gap-1 active:opacity-70">
          <Text style={{ color: colors.mutedForeground }} className="text-xs text-muted-foreground">Web</Text>
          <Icon icon={ExternalLink} size={11} color={colors.mutedForeground} className="text-muted-foreground" />
        </Pressable>
      </View>

      {letters.length > 0 ? (
        <View className="gap-2">
          {letters.map((letter) => (
            <Pressable
              key={letter.id}
              accessibilityRole="button"
              accessibilityLabel={`Open cover letter: ${letter.title || 'Untitled'}`}
              onPress={() => router.push(`/vault/cover-letter/${letter.id}`)}
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="flex-row items-center justify-between rounded-lg border border-border bg-card p-3 active:bg-muted/40">
              <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                <View
                  style={{ backgroundColor: `${colors.primary}20` }}
                  className="rounded-md bg-primary/10 p-1.5">
                  <Icon icon={FileText} size={14} color={colors.primary} className="text-primary" />
                </View>
                <Text
                  style={{ color: colors.foreground }}
                  className="font-sans-medium text-xs text-foreground"
                  numberOfLines={1}>
                  {letter.title || 'Tailored Cover Letter'}
                </Text>
              </View>
              <Text style={{ color: colors.primary }} className="text-xs font-sans-medium text-primary">View →</Text>
            </Pressable>
          ))}

          <Button
            variant="outline"
            size="sm"
            accessibilityLabel="Create another cover letter for this job"
            onPress={() => setIsNewOpen(true)}
            className="mt-1 flex-row items-center justify-center gap-1">
            <Icon icon={Plus} size={13} color={colors.foreground} className="text-foreground" />
            <Text style={{ color: colors.foreground }} className="text-xs font-sans-medium text-foreground">New letter</Text>
          </Button>
        </View>
      ) : (
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="gap-2 rounded-lg border border-border/70 bg-card p-3.5">
          <Text style={{ color: colors.mutedForeground }} className="text-xs leading-relaxed text-muted-foreground">
            Generate an AI-tailored cover letter aligned with this job and your persona.
          </Text>
          <Button
            size="sm"
            disabled={isLoading}
            accessibilityLabel="Generate tailored cover letter"
            onPress={() => setIsNewOpen(true)}
            className="mt-1 flex-row items-center justify-center gap-1.5 bg-primary">
            <Icon icon={Sparkles} size={13} className="text-primary-foreground" />
            <Text className="text-xs font-sans-medium text-primary-foreground">
              Generate tailored letter
            </Text>
          </Button>
        </View>
      )}

      {/* New Cover Letter Generator Sheet */}
      <NewCoverLetterSheet
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        initialJobId={jobId}
        onGenerated={(created) => {
          router.push(`/vault/cover-letter/${created.id}`);
        }}
      />
    </View>
  );
}
