import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ExternalLink,
  Pencil,
  Sparkles,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurTargetView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { BlurTargetProvider } from '@/components/ui/blur-target';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { RenameDialog } from '@/components/ui/rename-dialog';
import { RouteProgress } from '@/components/ui/route-progress';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadDocumentPdf, resumeToHtml, shareDocumentPdf } from '@/lib/document-pdf';
import { resumeToPlainText } from '@/lib/resume-markup';
import { useDeleteResume, useResume, useUpdateResume } from '@/hooks/use-resumes';

import { DocumentActionFab } from './document-action-fab';
import { ResumeDocumentWebView } from './resume-document-webview';

const WEB_RESUMES_URL = 'https://jobvault.app/app/resumes';

export function ResumeScreen({ id }: { id: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const blurTargetRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: resume, isLoading } = useResume(id);
  const updateResumeMutation = useUpdateResume(id);
  const deleteMutation = useDeleteResume();

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const resumeHtml = useMemo(() => (resume ? resumeToHtml(resume) : ''), [resume]);

  if (isLoading || !resume) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <RouteProgress />
        <View className="p-5 gap-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-4 h-32 w-full" />
        </View>
      </View>
    );
  }

  const { basics } = resume.content;

  const handleCopyText = async () => {
    try {
      const plainText = resumeToPlainText(resume.content);
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
      const html = resumeToHtml(resume);
      await shareDocumentPdf({
        title: resume.title || `${basics.name} — Résumé`,
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
      const html = resumeToHtml(resume);
      await downloadDocumentPdf({
        title: resume.title || `${basics.name} — Résumé`,
        html,
      });
    } catch {
      // Download failed or dismissed
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(resume.id);
      setConfirmDelete(false);
      router.back();
    } catch {
      // Handled by deleteMutation.error
    }
  };

  const effectiveResumeTitle = resume.title || 'Tailored Résumé';

  return (
    <BlurTargetProvider blurTarget={blurTargetRef}>
      <View className="flex-1 bg-muted/30">
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
                  accessibilityLabel={`Rename résumé: ${effectiveResumeTitle}`}
                  onPress={() => setRenameOpen(true)}
                  className="min-w-0 flex-1 flex-row items-center gap-1.5 py-0.5 active:opacity-70">
                  <Text numberOfLines={1} className="font-serif text-lg font-semibold text-foreground">
                    {effectiveResumeTitle}
                  </Text>
                  <Icon icon={Pencil} size={13} className="text-muted-foreground flex-shrink-0" />
                </Pressable>
              </View>
            </View>

            {/* Subtitle / Context Bar */}
            <View className="mt-1 pl-10">
              <Text numberOfLines={1} className="text-xs text-muted-foreground">
                {basics.name}
              </Text>
            </View>

            {/* Coming Soon notice banner */}
            <View className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-full bg-muted/60 px-2.5 py-1">
              <Icon icon={Sparkles} size={11} className="text-muted-foreground" />
              <Text className="text-[11px] font-sans-medium text-muted-foreground">
                Editing & Generation coming soon to mobile · Web workspace active
              </Text>
            </View>
          </View>

          {/* Full Document View (Artboard Surface) */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingTop: 4 }}
            showsVerticalScrollIndicator={false}>
            {/* Document Artboard & Sheet */}
            <View className="w-full">
              <ResumeDocumentWebView html={resumeHtml} />
            </View>

            {/* Web Workspace Notice */}
            <View className="mx-4 mt-4 rounded-lg border border-border bg-card p-4">
              <View className="flex-row items-center gap-2">
                <Icon icon={Sparkles} size={16} className="text-primary" />
                <Text className="font-sans-medium text-sm text-foreground">
                  Want to customize or regenerate?
                </Text>
              </View>
              <Text className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Tailored AI résumé generation and granular section editing are on the way to mobile.
                You can edit or generate fresh résumés anytime in the web workspace.
              </Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open web resumes editor"
                onPress={() => void Linking.openURL(WEB_RESUMES_URL)}
                className="mt-3 flex-row items-center gap-1">
                <Text className="text-xs font-sans-medium text-primary">Open web workspace</Text>
                <Icon icon={ExternalLink} size={12} className="text-primary" />
              </Pressable>
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
          title="Rename Résumé"
          description="Enter a new title for this tailored résumé."
          initialValue={effectiveResumeTitle}
          onConfirm={async (newName) => {
            try {
              await updateResumeMutation.mutateAsync({ title: newName });
              try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {
                // Haptics unavailable
              }
            } catch {
              // Handled by updateResumeMutation.error
            }
          }}
        />

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete résumé?"
          description="This will permanently delete this tailored résumé. You cannot undo this action."
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
        />
      </View>
    </BlurTargetProvider>
  );
}
