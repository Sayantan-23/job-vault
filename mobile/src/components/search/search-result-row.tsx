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
import type { SearchResult, SearchResultType } from '@/types/search';
import { SearchSnippet } from './search-snippet';

export interface SearchResultRowProps {
  result: SearchResult;
  onPress: (result: SearchResult) => void;
}

const TYPE_CONFIG: Record<
  SearchResultType,
  { label: string; icon: LucideIcon; iconBg: string; iconColor: string }
> = {
  job: {
    label: 'Job',
    icon: Briefcase,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  resume: {
    label: 'Résumé',
    icon: FileText,
    iconBg: 'bg-muted/80',
    iconColor: 'text-foreground',
  },
  coverLetter: {
    label: 'Cover letter',
    icon: Sparkles,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  persona: {
    label: 'Persona',
    icon: Users,
    iconBg: 'bg-muted/80',
    iconColor: 'text-foreground',
  },
  answer: {
    label: 'Answer',
    icon: MessageSquareQuote,
    iconBg: 'bg-secondary',
    iconColor: 'text-secondary-foreground',
  },
};

export function SearchResultRow({ result, onPress }: SearchResultRowProps) {
  const config = TYPE_CONFIG[result.type];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${config.label}: ${result.title}`}
      onPress={() => onPress(result)}
      className="flex-row items-start gap-3 border-b border-border/50 px-4 py-3 active:bg-muted/40">
      <View className={`mt-0.5 rounded-lg p-2 ${config.iconBg}`}>
        <Icon icon={config.icon} size={16} className={config.iconColor} />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="flex-1 font-sans-medium text-sm text-foreground">
            {result.title}
          </Text>
          <Text className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {config.label}
          </Text>
        </View>
        {result.subtitle ? (
          <Text numberOfLines={1} className="mt-0.5 text-xs text-muted-foreground">
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
