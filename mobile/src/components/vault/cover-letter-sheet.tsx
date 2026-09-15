import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  FileText,
  Pencil,
  Save,
  Share2,
  Trash2,
  Undo2,
  X,
} from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { MarkdownProse } from '@/components/ui/markdown-prose';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { coverLetterToHtml, shareDocumentPdf } from '@/lib/document-pdf';
import { coverLetterToPlainText } from '@/lib/cover-letter-markdown';
import { useCoverLetterRefine } from '@/hooks/use-cover-letter-refine';
import { useDeleteCoverLetter, useUpdateCoverLetter } from '@/hooks/use-cover-letters';
import { useJobOptions } from '@/hooks/use-job-options';
import { LIGHT_COLORS, useTheme } from '@/hooks/use-theme';
import type { CoverLetter } from '@/types/cover-letter';

import { CoverLetterProposal } from './cover-letter-proposal';
import { RefineControls } from './refine-controls';

export interface CoverLetterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coverLetter: CoverLetter | null;
  onDeleted?: () => void;
  onSaved?: (updated: CoverLetter) => void;
}

type EditorMode = 'edit' | 'preview';

const MODE_OPTIONS: readonly SegmentedOption<EditorMode>[] = [
  { value: 'edit', label: 'Edit', icon: Pencil },
  { value: 'preview', label: 'Preview', icon: Eye },
];

function countWords(str: string): number {
  return str.trim() ? str.trim().split(/\s+/).length : 0;
}

export function CoverLetterSheet({
  open,
  onOpenChange,
  coverLetter,
  onDeleted,
  onSaved,
}: CoverLetterSheetProps) {
  const { colors = LIGHT_COLORS, effectiveTheme } = useTheme() ?? {};
  const [mode, setMode] = useState<EditorMode>('edit');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (coverLetter && coverLetter.id !== prevIdRef.current) {
      prevIdRef.current = coverLetter.id;
      setDraftTitle(coverLetter.title ?? '');
      setDraftBody(coverLetter.bodyMarkdown);
      setMode('edit');
    }
  }, [coverLetter]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const updateMutation = useUpdateCoverLetter(coverLetter?.id ?? '');
  const deleteMutation = useDeleteCoverLetter();

  const refine = useCoverLetterRefine(coverLetter?.id ?? '', draftBody, (applied) => {
    setDraftBody(applied);
  });

  const { data: jobs = [] } = useJobOptions();

  if (!coverLetter) return null;

  const matchedJob = coverLetter.jobId ? jobs.find((j) => j.id === coverLetter.jobId) : null;
  const targetLabel = coverLetter.adhocJob
    ? `${coverLetter.adhocJob.company} — ${coverLetter.adhocJob.title}`
    : matchedJob
      ? `${matchedJob.company} — ${matchedJob.title}`
      : 'General Letter';

  const effectiveTitle = draftTitle.trim() || coverLetter.title || 'Cover Letter';
  const isDirty =
    draftTitle.trim() !== (coverLetter.title ?? '') || draftBody !== coverLetter.bodyMarkdown;
  const wordCount = countWords(draftBody);

  const handleCopyText = async () => {
    try {
      const plainText = coverLetterToPlainText(draftBody);
      await Clipboard.setStringAsync(plainText);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics unavailable in simulator/test
      }
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Handled silently
    }
  };

  const handleSharePdf = async () => {
    try {
      setSharing(true);
      const html = coverLetterToHtml({
        title: effectiveTitle,
        bodyMarkdown: draftBody,
      });
      await shareDocumentPdf({
        title: effectiveTitle,
        html,
      });
    } catch {
      // Sharing canceled or failed
    } finally {
      setSharing(false);
    }
  };

  const handleSave = async () => {
    try {
      const updated = await updateMutation.mutateAsync({
        title: draftTitle.trim() || undefined,
        bodyMarkdown: draftBody,
      });
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics unavailable
      }
      onSaved?.(updated);
    } catch {
      // Handled by updateMutation.error
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(coverLetter.id);
      setConfirmDelete(false);
      onOpenChange(false);
      onDeleted?.();
    } catch {
      // Handled by deleteMutation.error
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="max-h-[94%] gap-0 p-0">
          {/* Header */}
          <View
            className="border-b px-5 pb-3.5 pt-5"
            style={{ borderBottomColor: colors.border }}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Icon icon={FileText} size={16} color={colors.primary} />
                  <SheetTitle className="text-sm font-sans-medium">
                    Cover Letter
                  </SheetTitle>
                </View>
                <Input
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  placeholder="Document Title"
                  accessibilityLabel="Cover letter title"
                  className="mt-1 h-9 font-sans-medium text-sm"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close cover letter"
                onPress={() => onOpenChange(false)}
                className="mt-1 rounded-md p-1 active:opacity-70">
                <Icon icon={X} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View className="mt-2.5 flex-row items-center gap-2">
              <Badge variant="secondary">{targetLabel}</Badge>
            </View>
          </View>

          {/* Action Bar */}
          <View
            className="flex-row flex-wrap items-center justify-between gap-2 border-b px-5 py-2.5"
            style={{
              backgroundColor: effectiveTheme === 'dark' ? '#181614' : '#f5f3ef',
              borderBottomColor: colors.border,
            }}>
            <View className="flex-row items-center gap-2">
              <SegmentedControl
                value={mode}
                onValueChange={setMode}
                aria-label="Cover letter view mode"
                options={MODE_OPTIONS}
              />

              {isDirty ? (
                <Button
                  size="sm"
                  accessibilityLabel="Save cover letter changes"
                  disabled={updateMutation.isPending}
                  onPress={handleSave}
                  className="gap-1 px-3">
                  <Icon icon={Save} size={14} color={colors.primaryForeground} />
                  <Text
                    className="text-xs font-sans-medium"
                    style={{ color: colors.primaryForeground }}>
                    {updateMutation.isPending ? 'Saving…' : 'Save'}
                  </Text>
                </Button>
              ) : null}
            </View>

            <View className="flex-row items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                accessibilityLabel={copied ? 'Copied to clipboard' : 'Copy plain text to clipboard'}
                onPress={handleCopyText}
                className="gap-1 px-2.5">
                <Icon
                  icon={copied ? Check : Copy}
                  size={13}
                  color={copied ? colors.primary : colors.foreground}
                />
                <Text
                  className="text-xs font-sans-medium"
                  style={{ color: colors.foreground }}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </Button>

              <Button
                variant="default"
                size="sm"
                accessibilityLabel="Share or download PDF"
                onPress={handleSharePdf}
                disabled={sharing}
                className="gap-1 px-2.5">
                <Icon icon={Share2} size={13} color={colors.primaryForeground} />
                <Text
                  className="text-xs font-sans-medium"
                  style={{ color: colors.primaryForeground }}>
                  {sharing ? 'Generating…' : 'PDF'}
                </Text>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                accessibilityLabel="Delete cover letter"
                onPress={() => setConfirmDelete(true)}
                className="p-1.5">
                <Icon icon={Trash2} size={15} color={colors.destructive} />
              </Button>
            </View>
          </View>

          {/* Body Content */}
          <ScrollView
            className="flex-1 px-5 py-4"
            contentContainerStyle={{ paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View className="gap-3">
              {/* Proposal staged pane */}
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
                  {/* Undo proposal banner */}
                  {refine.undoBody !== null ? (
                    <View
                      className="flex-row items-center justify-between rounded-lg border px-3 py-2"
                      style={{
                        backgroundColor: colors.muted,
                        borderColor: colors.border,
                      }}>
                      <Text
                        className="text-xs"
                        style={{ color: colors.mutedForeground }}>
                        Applied proposal to editor.
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Undo proposal"
                        onPress={refine.undo}
                        className="flex-row items-center gap-1 active:opacity-70">
                        <Icon icon={Undo2} size={12} color={colors.primary} />
                        <Text
                          className="text-xs font-sans-medium"
                          style={{ color: colors.primary }}>
                          Undo
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {/* Refine Controls panel */}
                  <RefineControls busy={refine.busy} onRun={refine.run} />
                </>
              )}

              {/* Error alerts */}
              {refine.error ? (
                <View
                  className="rounded-lg border p-3"
                  style={{
                    backgroundColor: colors.destructive + '1a',
                    borderColor: colors.destructive + '33',
                  }}>
                  <Text
                    className="text-xs"
                    style={{ color: colors.destructive }}>
                    {refine.error.message || 'AI refinement failed.'}
                  </Text>
                </View>
              ) : null}
              {updateMutation.error ? (
                <View
                  className="rounded-lg border p-3"
                  style={{
                    backgroundColor: colors.destructive + '1a',
                    borderColor: colors.destructive + '33',
                  }}>
                  <Text
                    className="text-xs"
                    style={{ color: colors.destructive }}>
                    {updateMutation.error.message || 'Failed to save cover letter.'}
                  </Text>
                </View>
              ) : null}

              {/* Editor vs Preview Mode */}
              {mode === 'preview' ? (
                <View
                  className="rounded-lg border p-4"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  }}>
                  <MarkdownProse>{draftBody}</MarkdownProse>
                </View>
              ) : (
                <View className="gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-xs font-sans-medium"
                      style={{ color: colors.mutedForeground }}>
                      Body (Markdown)
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: colors.mutedForeground }}>
                      {wordCount} words · {draftBody.length} chars
                    </Text>
                  </View>
                  <Textarea
                    value={draftBody}
                    onChangeText={setDraftBody}
                    placeholder="Write your cover letter in Markdown…"
                    accessibilityLabel="Cover letter body markdown"
                    className="min-h-72 text-sm leading-relaxed"
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete cover letter?"
        description="This will permanently delete this cover letter. You cannot undo this action."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
