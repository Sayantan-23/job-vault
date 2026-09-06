import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { resumeToHtml, shareDocumentPdf } from '@/lib/document-pdf';
import { resumeToPlainText, splitBold } from '@/lib/resume-markup';
import { useDeleteResume } from '@/hooks/use-resumes';
import type { GeneratedResume, ResumeExperience, ResumeProject, ResumeSkillGroup, ResumeEducation } from '@/types/resume';

const WEB_RESUMES_URL = 'https://jobvault.app/app/resumes';

export interface ResumeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: GeneratedResume | null;
  onDeleted?: () => void;
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View className="mb-2 mt-5 border-b border-primary/30 pb-1">
      <Text className="font-sans-semibold text-xs uppercase tracking-wider text-foreground">
        {title}
      </Text>
    </View>
  );
}

function RichText({ text, className }: { text: string; className?: string }) {
  const runs = splitBold(text);
  return (
    <Text className={className}>
      {runs.map((r, i) => (
        <Text key={i} className={r.bold ? 'font-sans-semibold text-foreground' : undefined}>
          {r.text}
        </Text>
      ))}
    </Text>
  );
}

function ExperienceItem({ item }: { item: ResumeExperience }) {
  return (
    <View className="mb-4">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text className="font-sans-medium text-sm text-foreground">
          {item.title} <Text className="font-normal text-muted-foreground">— {item.company}</Text>
        </Text>
        <Text className="font-mono text-xs text-muted-foreground">{item.date}</Text>
      </View>
      <View className="mt-1.5 gap-1 pl-1">
        {item.bullets.map((b, i) => (
          <View key={i} className="flex-row items-start gap-2">
            <Text className="text-xs text-muted-foreground">•</Text>
            <RichText
              text={b}
              className="flex-1 text-xs leading-relaxed text-muted-foreground"
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function ProjectItem({ item }: { item: ResumeProject }) {
  return (
    <View className="mb-4">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text className="font-sans-medium text-sm text-foreground">
          {item.name}
          {item.tagline ? (
            <Text className="font-normal text-muted-foreground"> — {item.tagline}</Text>
          ) : null}
        </Text>
        {item.url ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open ${item.name} project url`}
            onPress={() => item.url && void Linking.openURL(item.url)}>
            <Text className="text-xs text-primary underline underline-offset-2">Link</Text>
          </Pressable>
        ) : null}
      </View>
      <View className="mt-1.5 gap-1 pl-1">
        {item.bullets.map((b, i) => (
          <View key={i} className="flex-row items-start gap-2">
            <Text className="text-xs text-muted-foreground">•</Text>
            <RichText
              text={b}
              className="flex-1 text-xs leading-relaxed text-muted-foreground"
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function SkillGroupItem({ item }: { item: ResumeSkillGroup }) {
  return (
    <View className="mb-2">
      <Text className="mb-1 font-sans-medium text-xs text-foreground">{item.category}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {item.items.map((skill, i) => (
          <Badge key={i} variant="secondary">
            {skill}
          </Badge>
        ))}
      </View>
    </View>
  );
}

function EducationItem({ item }: { item: ResumeEducation }) {
  return (
    <View className="mb-3 flex-row items-baseline justify-between gap-2">
      <View className="min-w-0 flex-1">
        <Text className="font-sans-medium text-sm text-foreground">{item.degree}</Text>
        <Text className="text-xs text-muted-foreground">{item.institution}</Text>
      </View>
      {item.period ? (
        <Text className="font-mono text-xs text-muted-foreground">{item.period}</Text>
      ) : null}
    </View>
  );
}

export function ResumeSheet({ open, onOpenChange, resume, onDeleted }: ResumeSheetProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const deleteMutation = useDeleteResume();

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  if (!resume) return null;

  const { basics } = resume.content;

  const handleCopyText = async () => {
    try {
      const plainText = resumeToPlainText(resume.content);
      await Clipboard.setStringAsync(plainText);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics unavailable in testing/simulator
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

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(resume.id);
      setConfirmDelete(false);
      onOpenChange(false);
      onDeleted?.();
    } catch {
      // Delete mutation failed
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="max-h-[92%] gap-0 p-0">
          {/* Header */}
          <View className="border-b border-border px-5 pb-4 pt-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Icon icon={FileText} size={18} className="text-primary" />
                <SheetTitle className="text-base font-sans-medium text-foreground">
                  {resume.title || 'Tailored Résumé'}
                </SheetTitle>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close résumé"
                onPress={() => onOpenChange(false)}
                className="rounded-md p-1 active:opacity-70">
                <Icon icon={X} size={18} className="text-muted-foreground" />
              </Pressable>
            </View>

            {/* Coming Soon notice badge */}
            <View className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-full bg-muted/60 px-2.5 py-1">
              <Icon icon={Sparkles} size={12} className="text-muted-foreground" />
              <Text className="text-[11px] font-sans-medium text-muted-foreground">
                Editing & Generation coming soon to mobile
              </Text>
            </View>
          </View>

          {/* Action Bar */}
          <View className="flex-row items-center justify-between border-b border-border bg-muted/20 px-5 py-2.5">
            <View className="flex-row items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                accessibilityLabel={copied ? 'Copied to clipboard' : 'Copy plain text to clipboard'}
                onPress={handleCopyText}
                className="gap-1.5">
                <Icon
                  icon={copied ? Check : Copy}
                  size={14}
                  className={copied ? 'text-primary' : 'text-foreground'}
                />
                <Text className="text-xs font-sans-medium text-foreground">
                  {copied ? 'Copied' : 'Copy text'}
                </Text>
              </Button>

              <Button
                variant="default"
                size="sm"
                accessibilityLabel="Share or download PDF"
                onPress={handleSharePdf}
                disabled={sharing}
                className="gap-1.5">
                <Icon icon={Share2} size={14} className="text-primary-foreground" />
                <Text className="text-xs font-sans-medium text-primary-foreground">
                  {sharing ? 'Generating…' : 'Share PDF'}
                </Text>
              </Button>
            </View>

            <Button
              variant="ghost"
              size="sm"
              accessibilityLabel="Delete résumé"
              onPress={() => setConfirmDelete(true)}
              className="p-2 text-destructive">
              <Icon icon={Trash2} size={16} className="text-destructive" />
            </Button>
          </View>

          {/* Scrollable CV Document */}
          <ScrollView
            className="flex-1 px-6 py-5"
            contentContainerStyle={{ paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}>
            {/* Basics Header */}
            <View className="items-center pb-3">
              <Text className="font-serif text-2xl font-bold text-foreground">
                {basics.name}
              </Text>
              <View className="mt-1.5 flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1">
                {basics.phone ? (
                  <Text className="text-xs text-muted-foreground">{basics.phone}</Text>
                ) : null}
                {basics.email ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Email ${basics.email}`}
                    onPress={() => void Linking.openURL(`mailto:${basics.email}`)}>
                    <Text className="text-xs text-primary underline underline-offset-2">
                      {basics.email}
                    </Text>
                  </Pressable>
                ) : null}
                {basics.location ? (
                  <Text className="text-xs text-muted-foreground">{basics.location}</Text>
                ) : null}
                {basics.links.map((link, i) => (
                  <Pressable
                    key={i}
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${link.label || link.url}`}
                    onPress={() => {
                      const url = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;
                      void Linking.openURL(url);
                    }}>
                    <Text className="text-xs text-primary underline underline-offset-2">
                      {link.label || link.url}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Professional Summary */}
            {resume.content.summary.trim() ? (
              <View>
                <SectionHeading title="Professional Summary" />
                <RichText
                  text={resume.content.summary}
                  className="text-xs leading-relaxed text-muted-foreground"
                />
              </View>
            ) : null}

            {/* Experience */}
            {resume.content.experience.length > 0 ? (
              <View>
                <SectionHeading title="Experience" />
                {resume.content.experience.map((exp, i) => (
                  <ExperienceItem key={i} item={exp} />
                ))}
              </View>
            ) : null}

            {/* Projects */}
            {resume.content.projects.length > 0 ? (
              <View>
                <SectionHeading title="Projects" />
                {resume.content.projects.map((proj, i) => (
                  <ProjectItem key={i} item={proj} />
                ))}
              </View>
            ) : null}

            {/* Skills */}
            {resume.content.skills.length > 0 ? (
              <View>
                <SectionHeading title="Skills" />
                {resume.content.skills.map((skillGroup, i) => (
                  <SkillGroupItem key={i} item={skillGroup} />
                ))}
              </View>
            ) : null}

            {/* Education */}
            {resume.content.education.length > 0 ? (
              <View>
                <SectionHeading title="Education" />
                {resume.content.education.map((edu, i) => (
                  <EducationItem key={i} item={edu} />
                ))}
              </View>
            ) : null}

            {/* Web App Coming Soon Card */}
            <View className="mt-8 rounded-lg border border-border bg-muted/40 p-4">
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
                <Text className="text-xs font-sans-medium text-primary">
                  Open web workspace
                </Text>
                <Icon icon={ExternalLink} size={12} className="text-primary" />
              </Pressable>
            </View>
          </ScrollView>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete résumé?"
        description="This will permanently delete this tailored résumé. You cannot undo this action."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
