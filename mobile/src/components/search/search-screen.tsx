import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { APP_CONFIG } from '@/config/app';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { RouteProgress } from '@/components/ui/route-progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearch } from '@/hooks/use-search';
import { searchResultHref, type SearchResult, type SearchResultType } from '@/types/search';
import { SearchResultRow } from './search-result-row';

export type SearchFilter = 'all' | 'job' | 'answer' | 'vault' | 'persona';

export interface SearchScreenProps {
  onSelect?: (result: SearchResult) => void;
}

const FILTER_TABS: { key: SearchFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'job', label: 'Jobs' },
  { key: 'answer', label: 'Answers' },
  { key: 'vault', label: 'Vault' },
  { key: 'persona', label: 'Personas' },
];

const GROUP_LABELS: Record<SearchResultType, string> = {
  job: 'Jobs',
  resume: 'Résumés',
  coverLetter: 'Cover letters',
  persona: 'Personas',
  answer: 'Answers',
};

/**
 * Rank-ordered hits grouped by type. Groups are ordered by their best-ranked
 * member, while rows inside each group stay in rank order.
 */
export function groupByType(results: SearchResult[]): SearchResult[] {
  const groups = new Map<SearchResultType, SearchResult[]>();
  for (const result of results) {
    const group = groups.get(result.type);
    if (group) group.push(result);
    else groups.set(result.type, [result]);
  }
  return [...groups.values()].flat();
}

type ListItem =
  | { kind: 'header'; label: string; count: number }
  | { kind: 'row'; result: SearchResult };

export function SearchScreen({ onSelect }: SearchScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [term, setTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');

  const { data, isLoading, isFetching, settled } = useSearch(term);
  const trimmed = term.trim();
  const expanded = trimmed.length >= 2;

  const handleSelect = (result: SearchResult) => {
    if (onSelect) {
      onSelect(result);
    } else {
      router.push(searchResultHref(result) as any);
    }
  };

  const filteredResults = useMemo(() => {
    if (!expanded) return [];
    const list = data ?? [];
    if (activeFilter === 'all') return list;
    if (activeFilter === 'vault') {
      return list.filter((r) => r.type === 'resume' || r.type === 'coverLetter');
    }
    return list.filter((r) => r.type === activeFilter);
  }, [expanded, data, activeFilter]);

  const listItems = useMemo<ListItem[]>(() => {
    const grouped = groupByType(filteredResults);
    const items: ListItem[] = [];
    let currentType: SearchResultType | null = null;
    let currentCount = 0;
    let headerIndex = -1;

    for (const res of grouped) {
      if (res.type !== currentType) {
        currentType = res.type;
        currentCount = 1;
        headerIndex = items.length;
        items.push({ kind: 'header', label: GROUP_LABELS[res.type], count: 1 });
      } else {
        currentCount++;
        if (headerIndex >= 0) {
          const prev = items[headerIndex];
          if (prev && prev.kind === 'header') prev.count = currentCount;
        }
      }
      items.push({ kind: 'row', result: res });
    }
    return items;
  }, [filteredResults]);

  return (
    <View className="flex-1 bg-background">
      {/* Search Header */}
      <View
        className="border-b border-border/60 bg-card px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-2">
          <IconButton
            icon={ChevronLeft}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
          <View className="relative flex-1 justify-center">
            <Input
              value={term}
              onChangeText={setTerm}
              placeholder="Search jobs, answers, vault, personas…"
              autoFocus
              returnKeyType="search"
              className="pr-9"
              testID="search-input"
            />
            {term.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setTerm('')}
                className="absolute right-2.5 rounded-full p-1 active:opacity-70">
                <Icon icon={X} size={16} className="text-muted-foreground" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${tab.label}`}
                onPress={() => setActiveFilter(tab.key)}
                className={`rounded-full px-3 py-1.5 ${
                  isActive ? 'bg-primary' : 'bg-muted/70'
                }`}>
                <Text
                  className={`text-xs font-sans-medium ${
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Loading Progress Bar */}
      {isFetching && <RouteProgress />}

      {/* Content Area */}
      {trimmed.length === 0 ? (
        <View className="items-center px-6 py-20">
          <View className="mb-4 rounded-full bg-muted/50 p-4">
            <Icon icon={Search} size={32} className="text-muted-foreground/60" />
          </View>
          <Text className="text-center font-serif text-xl text-foreground">
            {`Search ${APP_CONFIG.name}`}
          </Text>
          <Text className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
            Find applications, saved answers, résumés, cover letters, and personas.
          </Text>
        </View>
      ) : trimmed.length === 1 ? (
        <View className="items-center px-6 py-16">
          <Text className="text-center text-sm text-muted-foreground">
            Type at least 2 characters to search
          </Text>
        </View>
      ) : isLoading && listItems.length === 0 ? (
        <View className="gap-3 p-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </View>
      ) : settled && listItems.length === 0 ? (
        <EmptyState
          title="No matches found"
          description={`No results found for “${trimmed}”. Try another search term or change your filter.`}
        />
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item, index) =>
            item.kind === 'header'
              ? `header-${item.label}`
              : `row-${item.result.type}-${item.result.id}-${index}`
          }
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <View className="flex-row items-center justify-between border-b border-border/40 bg-muted/30 px-4 py-1.5">
                  <Text className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </Text>
                  <Text className="font-mono text-[11px] text-muted-foreground/70">
                    {item.count}
                  </Text>
                </View>
              );
            }
            return <SearchResultRow result={item.result} onPress={handleSelect} />;
          }}
        />
      )}
    </View>
  );
}
