import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ExternalLink, FileText, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { Linking } from 'react-native';
import Animated from 'react-native-reanimated';
import { BlurTargetView } from 'expo-blur';
import { Pressable, Text, View } from 'react-native-css/components';

import { AppHeader } from '@/components/app-header';
import { Icon } from '@/components/icon';
import { BlurTargetProvider } from '@/components/ui/blur-target';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { RouteProgress } from '@/components/ui/route-progress';
import { SpeedDial } from '@/components/ui/speed-dial';
import { useHideOnScroll } from '@/hooks/use-hide-on-scroll';
import { useJobOptions, type JobOption } from '@/hooks/use-job-options';
import { usePersonas } from '@/hooks/use-personas';
import { useAllCoverLetters, useDeleteCoverLetter } from '@/hooks/use-cover-letters';
import { useDeleteResume, useResumes } from '@/hooks/use-resumes';
import { shortDate } from '@/lib/relative-time';
import { SCREEN_BOTTOM_INSET } from '@/theme';
import type { CoverLetter } from '@/types/cover-letter';

import { NewCoverLetterSheet } from './new-cover-letter-sheet';

const WEB_RESUMES_URL = 'https://jobvault.app/app/resumes';

export type VaultFilter = 'all' | 'resumes' | 'letters';

interface VaultRowItem {
  id: string;
  title: string;
  context: string;
  personaName?: string;
  createdAt: string;
  type: 'resume' | 'letter';
}

function resolveLetterContext(letter: CoverLetter, jobsById: Map<string, JobOption>): string {
  if (letter.adhocJob) return `${letter.adhocJob.company} · ${letter.adhocJob.title}`;
  const job = letter.jobId ? jobsById.get(letter.jobId) : undefined;
  return job ? `${job.company} · ${job.title}` : 'General';
}

export function VaultScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<VaultFilter>('all');
  const [isNewLetterOpen, setIsNewLetterOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'resume' | 'letter';
    id: string;
    title: string;
  } | null>(null);

  const { hidden, onScroll } = useHideOnScroll();
  const blurTargetRef = useRef<any>(null);

  const { data: resumes = [], isLoading: isResumesLoading } = useResumes();
  const { data: letters = [], isLoading: isLettersLoading } = useAllCoverLetters();
  const { data: jobs = [] } = useJobOptions();
  const { data: personas = [] } = usePersonas();

  const deleteResumeMutation = useDeleteResume();
  const deleteLetterMutation = useDeleteCoverLetter();

  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const personaNames = useMemo(() => new Map(personas.map((p) => [p.id, p.name])), [personas]);

  const allRows = useMemo<VaultRowItem[]>(() => {
    const resumeRows: VaultRowItem[] = resumes.map((resume) => {
      const job = resume.jobId ? jobsById.get(resume.jobId) : undefined;
      const context = job
        ? `${job.company} · ${job.title}`
        : resume.content.basics.name || 'Master Profile';
      return {
        id: resume.id,
        title: resume.title || `${resume.content.basics.name} — Résumé`,
        context,
        createdAt: resume.createdAt,
        type: 'resume',
      };
    });

    const letterRows: VaultRowItem[] = letters.map((letter) => ({
      id: letter.id,
      title: letter.title || 'Untitled Cover Letter',
      context: resolveLetterContext(letter, jobsById),
      personaName: (letter.personaId && personaNames.get(letter.personaId)) || undefined,
      createdAt: letter.createdAt,
      type: 'letter',
    }));

    // Unified feed sorted chronologically by createdAt (newest first)
    return [...resumeRows, ...letterRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [resumes, letters, jobsById, personaNames]);

  const displayedRows = useMemo(() => {
    if (filter === 'resumes') return allRows.filter((r) => r.type === 'resume');
    if (filter === 'letters') return allRows.filter((r) => r.type === 'letter');
    return allRows;
  }, [allRows, filter]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'resume') {
        await deleteResumeMutation.mutateAsync(deleteTarget.id);
      } else {
        await deleteLetterMutation.mutateAsync(deleteTarget.id);
      }
    } catch {
      // Handled by mutation error state
    } finally {
      setDeleteTarget(null);
    }
  };

  const isLoading =
    isResumesLoading ||
    isLettersLoading ||
    deleteResumeMutation.isPending ||
    deleteLetterMutation.isPending;

  const dialActions = [
    {
      key: 'new-letter',
      label: 'New cover letter',
      icon: Plus,
      accessibilityLabel: 'New cover letter',
      onPress: () => setIsNewLetterOpen(true),
    },
    {
      key: 'web-resumes',
      label: 'Open web résumés',
      icon: ExternalLink,
      accessibilityLabel: 'Open web résumés',
      onPress: () => void Linking.openURL(WEB_RESUMES_URL),
    },
  ];

  return (
    <BlurTargetProvider blurTarget={blurTargetRef}>
      <View className="flex-1 bg-tab-bar">
        <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
          <View className="flex-1 overflow-hidden rounded-b-[20px] bg-background">
            <AppHeader title="Vault" />

            {/* Native Filter Pills (Option A) */}
            <View className="flex-row items-center gap-2 px-4 pb-3 pt-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter all documents"
                accessibilityState={{ selected: filter === 'all' }}
                onPress={() => setFilter('all')}
                className={`rounded-full px-3.5 py-1.5 active:opacity-80 ${
                  filter === 'all'
                    ? 'bg-primary'
                    : 'border border-border/80 bg-muted/60'
                }`}>
                <Text
                  className={`text-xs font-sans-medium ${
                    filter === 'all' ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                  All ({allRows.length})
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter résumés"
                accessibilityState={{ selected: filter === 'resumes' }}
                onPress={() => setFilter('resumes')}
                className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5 active:opacity-80 ${
                  filter === 'resumes'
                    ? 'bg-primary'
                    : 'border border-border/80 bg-muted/60'
                }`}>
                <Icon
                  icon={FileText}
                  size={12}
                  className={filter === 'resumes' ? 'text-primary-foreground' : 'text-muted-foreground'}
                />
                <Text
                  className={`text-xs font-sans-medium ${
                    filter === 'resumes' ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                  Résumés ({resumes.length})
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter cover letters"
                accessibilityState={{ selected: filter === 'letters' }}
                onPress={() => setFilter('letters')}
                className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5 active:opacity-80 ${
                  filter === 'letters'
                    ? 'bg-primary'
                    : 'border border-border/80 bg-muted/60'
                }`}>
                <Icon
                  icon={Sparkles}
                  size={12}
                  className={filter === 'letters' ? 'text-primary-foreground' : 'text-muted-foreground'}
                />
                <Text
                  className={`text-xs font-sans-medium ${
                    filter === 'letters' ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                  Cover Letters ({letters.length})
                </Text>
              </Pressable>
            </View>

            {/* Informational Web Workspace Callout when résumés filter is selected */}
            {filter === 'resumes' ? (
              <View className="mx-4 mb-2 flex-row items-center justify-between rounded-lg border border-border/80 bg-muted/30 px-3.5 py-2">
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <Icon icon={Sparkles} size={13} className="text-primary" />
                  <Text className="text-xs text-muted-foreground">
                    Tailor or edit résumés on web · Mobile read & export active.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Open web resumes editor"
                  onPress={() => void Linking.openURL(WEB_RESUMES_URL)}
                  className="flex-row items-center gap-1 active:opacity-70">
                  <Text className="text-xs font-sans-medium text-primary">Web</Text>
                  <Icon icon={ExternalLink} size={11} className="text-primary" />
                </Pressable>
              </View>
            ) : null}

            {isLoading ? <RouteProgress /> : null}

            {/* Unified Document Feed */}
            <Animated.FlatList
              onScroll={onScroll}
              scrollEventThrottle={16}
              data={displayedRows}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              contentContainerStyle={{
                paddingBottom: SCREEN_BOTTOM_INSET,
                flexGrow: 1,
              }}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.type === 'resume' ? 'Résumé' : 'Cover letter'}: ${item.title}`}
                  onPress={() => {
                    if (item.type === 'resume') {
                      router.push(`/vault/resume/${item.id}`);
                    } else {
                      router.push(`/vault/cover-letter/${item.id}`);
                    }
                  }}
                  className="flex-row items-center gap-3 border-b border-border/60 px-4 py-3.5 active:bg-muted/40">
                  <View
                    className={`rounded-lg p-2 ${
                      item.type === 'resume' ? 'bg-muted/70' : 'bg-primary/10'
                    }`}>
                    <Icon
                      icon={item.type === 'resume' ? FileText : Sparkles}
                      size={18}
                      className={item.type === 'resume' ? 'text-foreground' : 'text-primary'}
                    />
                  </View>

                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        className="font-sans-medium text-sm text-foreground"
                        numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    <View className="mt-0.5 flex-row items-center gap-1">
                      <Text
                        className="text-[11px] font-sans-medium uppercase tracking-wider text-muted-foreground/70">
                        {item.type === 'resume' ? 'CV' : 'Letter'}
                      </Text>
                      <Text className="text-xs text-muted-foreground/40">·</Text>
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {item.context}
                      </Text>
                      {item.personaName ? (
                        <>
                          <Text className="text-xs text-muted-foreground/40">·</Text>
                          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                            {item.personaName}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2.5">
                    <Text className="font-mono text-xs tabular-nums text-muted-foreground">
                      {shortDate(item.createdAt)}
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.title}`}
                      onPress={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({
                          type: item.type,
                          id: item.id,
                          title: item.title,
                        });
                      }}
                      className="rounded p-1.5 active:bg-destructive/10">
                      <Icon
                        icon={Trash2}
                        size={15}
                        strokeWidth={1.75}
                        className="text-muted-foreground"
                      />
                    </Pressable>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                !isLoading ? (
                  <View className="flex-1 items-center justify-center p-6">
                    {filter === 'resumes' ? (
                      <EmptyState
                        title="No tailored résumés yet"
                        description="Tailor résumés from your tracked jobs in the web workspace, then view, copy, and export them here on mobile."
                        action={
                          <Button onPress={() => void Linking.openURL(WEB_RESUMES_URL)}>
                            Open web workspace
                          </Button>
                        }
                      />
                    ) : filter === 'letters' ? (
                      <EmptyState
                        title="No cover letters yet"
                        description="Generate tailored cover letters using your saved personas and jobs, or write one from scratch."
                        action={
                          <Button onPress={() => setIsNewLetterOpen(true)}>
                            Create cover letter
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState
                        title="Your Vault is empty"
                        description="Tailored résumés and AI-generated cover letters will appear here in your unified document feed."
                        action={
                          <Button onPress={() => setIsNewLetterOpen(true)}>
                            Create your first cover letter
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

        {/* SpeedDial FAB */}
        <SpeedDial
          hidden={hidden}
          actions={dialActions}
          accessibilityLabel="Vault actions"
          blurTarget={blurTargetRef}
        />

        {/* New Cover Letter Generator Sheet */}
        <NewCoverLetterSheet
          open={isNewLetterOpen}
          onOpenChange={setIsNewLetterOpen}
          onGenerated={(created) => {
            router.push(`/vault/cover-letter/${created.id}`);
          }}
        />

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={`Delete ${deleteTarget?.type === 'resume' ? 'résumé' : 'cover letter'}?`}
          description={
            deleteTarget
              ? `“${deleteTarget.title}” will be permanently removed.`
              : 'This document will be permanently removed.'
          }
          confirmLabel="Delete"
          destructive
          onConfirm={handleDeleteConfirm}
        />
      </View>
    </BlurTargetProvider>
  );
}
