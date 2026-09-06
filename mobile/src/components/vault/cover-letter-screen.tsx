import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Eye,
  Pencil,
  Save,
  Undo2,
} from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurTargetView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { BlurTargetProvider } from '@/components/ui/blur-target';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { MarkdownProse } from '@/components/ui/markdown-prose';
import { RenameDialog } from '@/components/ui/rename-dialog';
import { RouteProgress } from '@/components/ui/route-progress';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { coverLetterToHtml, downloadDocumentPdf, shareDocumentPdf } from '@/lib/document-pdf';
import { coverLetterToPlainText } from '@/lib/cover-letter-markdown';
import { useCoverLetterRefine } from '@/hooks/use-cover-letter-refine';
import {
  useCoverLetter,
  useDeleteCoverLetter,
  useUpdateCoverLetter,
} from '@/hooks/use-cover-letters';
import { useJobOptions } from '@/hooks/use-job-options';

import { CoverLetterProposal } from './cover-letter-proposal';
import { DocumentActionFab } from './document-action-fab';
import { RefineControls } from './refine-controls';

type EditorMode = 'edit' | 'preview';

const MODE_OPTIONS: readonly SegmentedOption<EditorMode>[] = [
  { value: 'edit', label: 'Edit', icon: Pencil },
  { value: 'preview', label: 'Preview', icon: Eye },
];

function countWords(str: string): number {
  return str.trim() ? str.trim().split(/\s+/).length : 0;
}

export function CoverLetterScreen({ id }: { id: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const blurTargetRef = useRef(null);

  const [mode, setMode] = useState<EditorMode>('edit');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: letter, isLoading } = useCoverLetter(id);
  const { data: jobs = [] } = useJobOptions();
  const updateMutation = useUpdateCoverLetter(id);
  const deleteMutation = useDeleteCoverLetter();

  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (letter && letter.id !== prevIdRef.current) {
      prevIdRef.current = letter.id;
      setDraftTitle(letter.title ?? '');
      setDraftBody(letter.bodyMarkdown);
      setMode('edit');
    }
  }, [letter]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const refine = useCoverLetterRefine(id, draftBody, (applied) => {
    setDraftBody(applied);
  });

  if (isLoading || !letter) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <RouteProgress />
        <View className="p-5 gap-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-4 h-48 w-full" />
        </View>
      </View>
    );
  }

  const matchedJob = letter.jobId ? jobs.find((j) => j.id === letter.jobId) : null;
  const targetLabel = letter.adhocJob
    ? `${letter.adhocJob.company} — ${letter.adhocJob.title}`
    : matchedJob
      ? `${matchedJob.company} — ${matchedJob.title}`
      : 'General Letter';

  const effectiveTitle = draftTitle.trim() || letter.title || 'Cover Letter';
  const isDirty =
    draftTitle.trim() !== (letter.title ?? '') || draftBody !== letter.bodyMarkdown;
  const wordCount = countWords(draftBody);

  const handleCopyText = async () => {
    try {
      const plainText = coverLetterToPlainText(draftBody);
      await Clipboard.setStringAsync(plainText);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics unavailable
      }
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  const handleSharePdf = async () => {
    try {
      setSharing(true);
      const html = coverLetterToHtml({
        ...letter,
        title: effectiveTitle,
        bodyMarkdown: draftBody,
      });
      await shareDocumentPdf({
        title: effectiveTitle,
        html,
      });
    } catch {
      // Share failed or dismissed
    } finally {
      setSharing(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const html = coverLetterToHtml({
        ...letter,
        title: effectiveTitle,
        bodyMarkdown: draftBody,
      });
      await downloadDocumentPdf({
        title: effectiveTitle,
        html,
      });
    } catch {
      // Download failed or dismissed
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async () => {
    if (!isDirty || updateMutation.isPending) return;
    try {
      await updateMutation.mutateAsync({
        title: effectiveTitle,
        bodyMarkdown: draftBody,
      });
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics unavailable
      }
    } catch {
      // Handled by updateMutation.error
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(letter.id);
      setConfirmDelete(false);
      router.back();
    } catch {
      // Handled by deleteMutation.error
    }
  };

  return (
    <BlurTargetProvider blurTarget={blurTargetRef}>
      <View className="flex-1 bg-background">
        <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
          {/* Top Header Bar */}
          <View
            className="border-b border-border bg-card px-4 pb-3"
            style={{ paddingTop: insets.top + 8 }}>
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-2 min-w-0 flex-1">
                <IconButton
                  icon={ChevronLeft}
                  accessibilityLabel="Back to Vault"
                  onPress={() => router.back()}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rename cover letter: ${effectiveTitle}`}
                  onPress={() => setRenameOpen(true)}
                  className="min-w-0 flex-1 flex-row items-center gap-1.5 py-1 active:opacity-70">
                  <Text numberOfLines={1} className="font-serif text-lg font-semibold text-foreground">
                    {effectiveTitle}
                  </Text>
                  <Icon icon={Pencil} size={13} className="text-muted-foreground flex-shrink-0" />
                </Pressable>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center gap-1.5">
                {isDirty ? (
                  <Button
                    size="sm"
                    accessibilityLabel="Save cover letter changes"
                    disabled={updateMutation.isPending}
                    onPress={handleSave}
                    className="gap-1 bg-primary px-3">
                    <Icon icon={Save} size={14} className="text-primary-foreground" />
                    <Text className="text-xs font-sans-medium text-primary-foreground">
                      {updateMutation.isPending ? 'Saving…' : 'Save'}
                    </Text>
                  </Button>
                ) : null}
              </View>
            </View>

            {/* Subtitle / Context Bar: quiet text breadcrumb & mode toggle */}
            <View className="mt-2 flex-row items-center justify-between gap-2">
              <Text numberOfLines={1} className="min-w-0 flex-1 pl-1 text-xs text-muted-foreground">
                {targetLabel}
              </Text>
              <SegmentedControl
                value={mode}
                onValueChange={setMode}
                aria-label="Cover letter view mode"
                options={MODE_OPTIONS}
              />
            </View>
          </View>

          {/* Full Document Canvas */}
          <ScrollView
            className="flex-1 px-5 py-4"
            contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View className="gap-3.5">
              {/* Proposal Staged View */}
              {refine.staged && refine.candidate !== null && refine.lastAction !== null ? (
                <CoverLetterProposal
                  key={refine.proposalSeq}
                  action={refine.lastAction}
                  candidate={refine.candidate}
                  currentBody={draftBody}
                  busy={refine.busy}
                  onKeep={refine.keep}
                  onDiscard={refine.discard}
                  onTryAgain={refine.tryAgain}
                />
              ) : (
                <>
                  {/* Undo Proposal Banner */}
                  {refine.undoBody !== null ? (
                    <View className="flex-row items-center justify-between rounded-lg border border-border bg-muted/50 px-3.5 py-2.5">
                      <Text className="text-xs text-muted-foreground">
                        Applied proposal to editor. Save edits to keep it.
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Undo proposal"
                        onPress={refine.undo}
                        className="flex-row items-center gap-1 active:opacity-70">
                        <Icon icon={Undo2} size={13} className="text-primary" />
                        <Text className="text-xs font-sans-medium text-primary">Undo</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {/* Refine Controls panel */}
                  <RefineControls busy={refine.busy} onRun={refine.run} />
                </>
              )}

              {/* Error alerts */}
              {refine.error ? (
                <View className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <Text className="text-xs text-destructive">
                    {refine.error.message || 'AI refinement failed.'}
                  </Text>
                </View>
              ) : null}
              {updateMutation.error ? (
                <View className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <Text className="text-xs text-destructive">
                    {updateMutation.error.message || 'Failed to save cover letter.'}
                  </Text>
                </View>
              ) : null}

              {/* Mode Switch: Edit vs Preview */}
              {mode === 'preview' ? (
                <View
                  className="rounded-xl border border-slate-200/90 p-6 shadow-sm shadow-black/10"
                  style={{ backgroundColor: '#ffffff' }}>
                  <MarkdownProse>{draftBody}</MarkdownProse>
                </View>
              ) : (
                <View className="gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-sans-medium text-muted-foreground">
                      Body (Markdown)
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {wordCount} words · {draftBody.length} chars
                    </Text>
                  </View>
                  <Textarea
                    value={draftBody}
                    onChangeText={setDraftBody}
                    placeholder="Write your cover letter in Markdown…"
                    accessibilityLabel="Cover letter body markdown"
                    className="min-h-96 text-sm leading-relaxed"
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </BlurTargetView>

        {/* Floating Action Button with Copy, Share, Download, and Delete */}
        <DocumentActionFab
          onCopy={handleCopyText}
          onShare={handleSharePdf}
          onDownload={handleDownloadPdf}
          onDelete={() => setConfirmDelete(true)}
          copied={copied}
          sharing={sharing}
          downloading={downloading}
          blurTarget={blurTargetRef}
          bottom={insets.bottom + 20}
          right={20}
        />

        <RenameDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          title="Rename Cover Letter"
          description="Enter a new title for this cover letter."
          initialValue={effectiveTitle}
          onConfirm={async (newName) => {
            setDraftTitle(newName);
            try {
              await updateMutation.mutateAsync({
                title: newName,
                bodyMarkdown: draftBody,
              });
              try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {
                // Haptics unavailable
              }
            } catch {
              // Handled by updateMutation.error
            }
          }}
        />

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete cover letter?"
          description="This will permanently delete this cover letter. You cannot undo this action."
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
        />
      </View>
    </BlurTargetProvider>
  );
}
