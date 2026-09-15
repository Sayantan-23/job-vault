import {
  Briefcase,
  FileText,
  MessageSquareQuote,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';
import type { SearchResult, SearchResultType } from '@/types/search';
import { SearchSnippet } from './search-snippet';

export interface SearchResultRowProps {
  result: SearchResult;
  onPress: (result: SearchResult) => void;
}

const TYPE_CONFIG: Record<
  SearchResultType,
  { label: string; icon: LucideIcon }
> = {
  job: {
    label: 'Job',
    icon: Briefcase,
  },
  resume: {
    label: 'Résumé',
    icon: FileText,
  },
  coverLetter: {
    label: 'Cover letter',
    icon: Sparkles,
  },
  persona: {
    label: 'Persona',
    icon: Users,
  },
  answer: {
    label: 'Answer',
    icon: MessageSquareQuote,
  },
};

export function SearchResultRow({ result, onPress }: SearchResultRowProps) {
  const config = TYPE_CONFIG[result.type];
  const { colors = LIGHT_COLORS } = useTheme() ?? {};

  const isPrimary = result.type === 'job' || result.type === 'coverLetter';
  const iconBg = isPrimary ? `${colors.primary}20` : colors.secondary;
  const iconColor = isPrimary ? colors.primary : colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${config.label}: ${result.title}`}
      onPress={() => onPress(result)}
      style={{ borderBottomColor: colors.border }}
      className="flex-row items-start gap-3 border-b border-border/50 px-4 py-3 active:bg-muted/40">
      <View style={{ backgroundColor: iconBg }} className="mt-0.5 rounded-lg p-2">
        <Icon icon={config.icon} size={16} color={iconColor} className="text-foreground" />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            numberOfLines={1}
            style={{ color: colors.foreground }}
            className="flex-1 font-sans-medium text-sm text-foreground">
            {result.title}
          </Text>
          <Text
            style={{ color: colors.mutedForeground }}
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {config.label}
          </Text>
        </View>
        {result.subtitle ? (
          <Text
            numberOfLines={1}
            style={{ color: colors.mutedForeground }}
            className="mt-0.5 text-xs text-muted-foreground">
            {result.subtitle}
          </Text>
        ) : null}
        {result.snippet ? (
          <View className="mt-1">
            <SearchSnippet
              text={result.snippet}
              className="text-xs leading-relaxed text-muted-foreground/90"
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
