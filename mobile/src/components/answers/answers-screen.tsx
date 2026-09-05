import { useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { BlurTargetView } from 'expo-blur';
import { View } from 'react-native-css/components';

import { BlurTargetProvider } from '@/components/ui/blur-target';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { RouteProgress } from '@/components/ui/route-progress';
import { SpeedDial } from '@/components/ui/speed-dial';
import { useAiStatus } from '@/hooks/use-ai-status';
import { useAnswers, useDeleteAnswer, useMarkAnswerUsed } from '@/hooks/use-answers';
import { useHideOnScroll } from '@/hooks/use-hide-on-scroll';
import { useInfiniteJobs } from '@/hooks/use-jobs';
import { usePersonas } from '@/hooks/use-personas';
import { SCREEN_BOTTOM_INSET } from '@/theme';
import { AnswerRow } from './answer-row';
import { AnswerSheet } from './answer-sheet';

export function AnswersScreen() {
  const [search, setSearch] = useState('');
  const [activeAnswerId, setActiveAnswerId] = useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { hidden, onScroll } = useHideOnScroll();
  const blurTargetRef = useRef<any>(null);

  const { data: answers, isLoading } = useAnswers();
  const { data: personas } = usePersonas();
  const { data: aiStatus } = useAiStatus();
  const { data: jobsList } = useInfiniteJobs({
    search: '',
    ghost: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const deleteMutation = useDeleteAnswer();
  const markUsedMutation = useMarkAnswerUsed();

  const jobs = useMemo(() => {
    const list = Array.isArray(jobsList) ? jobsList : [];
    return list.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
    }));
  }, [jobsList]);

  const filteredAnswers = useMemo(() => {
    const list = answers ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter(
      (a) =>
        a.question.toLowerCase().includes(query) ||
        (a.answerShort ?? '').toLowerCase().includes(query) ||
        (a.answerLong ?? '').toLowerCase().includes(query)
    );
  }, [answers, search]);

  const activeAnswer = useMemo(() => {
    if (!activeAnswerId) return null;
    return (answers ?? []).find((a) => a.id === activeAnswerId) ?? null;
  }, [answers, activeAnswerId]);

  const deleteTarget = useMemo(() => {
    if (!deleteTargetId) return null;
    return (answers ?? []).find((a) => a.id === deleteTargetId) ?? null;
  }, [answers, deleteTargetId]);

  const handleDeleteConfirm = () => {
    if (deleteTargetId) {
      deleteMutation.mutate(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const isSheetOpen = isNewOpen || activeAnswerId !== null;
  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      setIsNewOpen(false);
      setActiveAnswerId(null);
    }
  };

  const dialActions = [
    {
      key: 'add',
      label: 'New answer',
      icon: Plus,
      accessibilityLabel: 'New answer',
      onPress: () => setIsNewOpen(true),
    },
  ];

  return (
    <BlurTargetProvider blurTarget={blurTargetRef}>
      <View className="flex-1 bg-tab-bar">
        <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
          <View className="flex-1 overflow-hidden rounded-b-[20px] bg-background">
            <AppHeader title="Answers" />

            <View className="px-4 pb-2.5 pt-1">
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder="Search questions and answers…"
                accessibilityLabel="Search answers"
              />
            </View>

            {isLoading || deleteMutation.isPending ? <RouteProgress /> : null}

            <Animated.FlatList
              onScroll={onScroll}
              scrollEventThrottle={16}
              data={filteredAnswers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingBottom: SCREEN_BOTTOM_INSET,
                flexGrow: 1,
              }}
              renderItem={({ item }) => (
                <AnswerRow
                  answer={item}
                  onSelect={(id) => setActiveAnswerId(id)}
                  onDelete={(id) => setDeleteTargetId(id)}
                  onCopied={(id) => markUsedMutation.mutate(id)}
                />
              )}
              ListEmptyComponent={
                !isLoading ? (
                  <View className="flex-1 items-center justify-center p-6">
                    {answers && answers.length > 0 ? (
                      <EmptyState
                        title="No matching answers"
                        description="No saved answers match your search term."
                      />
                    ) : (
                      <EmptyState
                        title="No saved answers yet"
                        description="Save answers to common application questions to copy them into mobile forms with one tap."
                        action={
                          <Button onPress={() => setIsNewOpen(true)}>
                            Add your first answer
                          </Button>
                        }
                      />
                    )}
                  </View>
                ) : null
              }
            />
          </View>
        </BlurTargetView>

        {/* SpeedDial FAB (Google Keep-style with New Answer) */}
        <SpeedDial
          hidden={hidden}
          actions={dialActions}
          accessibilityLabel="Answer actions"
          blurTarget={blurTargetRef}
        />

        <AnswerSheet
          open={isSheetOpen}
          onOpenChange={handleSheetOpenChange}
          answer={activeAnswer}
          personas={personas ?? []}
          jobs={jobs}
          aiEnabled={aiStatus?.enabled ?? false}
        />

        <ConfirmDialog
          open={deleteTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetId(null);
          }}
          title="Delete this answer?"
          description={
            deleteTarget
              ? `“${deleteTarget.question}” will be permanently removed.`
              : 'This answer will be permanently removed.'
          }
          confirmLabel="Delete"
          destructive
          onConfirm={handleDeleteConfirm}
        />
      </View>
    </BlurTargetProvider>
  );
}
