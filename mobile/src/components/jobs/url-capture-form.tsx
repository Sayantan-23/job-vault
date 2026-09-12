import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Clipboard,
  Globe,
  MapPin,
  CircleDollarSign,
  Sparkles,
  X,
} from 'lucide-react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { APP_CONFIG } from '@/config/app';
import { useCreateJob, useScrapeJob } from '@/hooks/use-jobs';
import type { CreateJobValues, ScrapeResult } from '@/types/job';

const PLACEHOLDER_TITLE = 'Untitled Position';
const PLACEHOLDER_COMPANY = 'Unknown Company';

function cleanValue(val?: string | null, placeholder?: string): string {
  if (!val || val.trim() === placeholder) return '';
  return val.trim();
}

export function buildPrefillFromScrape(
  result: ScrapeResult,
  sourceUrl: string
): Partial<CreateJobValues> {
  const prefill: Partial<CreateJobValues> = {
    sourceUrl: sourceUrl.trim() || undefined,
  };
  const title = cleanValue(result.title, PLACEHOLDER_TITLE);
  const company = cleanValue(result.company, PLACEHOLDER_COMPANY);
  if (title) prefill.title = title;
  if (company) prefill.company = company;
  if (result.location) prefill.location = result.location.trim();
  if (result.salaryRange) prefill.salaryRange = result.salaryRange.trim();
  if (result.snapshotMarkdown) prefill.snapshotMarkdown = result.snapshotMarkdown;
  return prefill;
}

export interface UrlCaptureFormProps {
  initialUrl?: string;
  autoFetch?: boolean;
  onCreated: () => void;
  onSwitchToManual: (prefill: Partial<CreateJobValues>) => void;
}

export function UrlCaptureForm({
  initialUrl = '',
  autoFetch = false,
  onCreated,
  onSwitchToManual,
}: UrlCaptureFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<ScrapeResult | null>(null);

  const { mutate: scrape, isPending: isScraping, isError: isScrapeError } = useScrapeJob();
  const { mutate: create, isPending: isSaving } = useCreateJob();
  const fetchedRef = useRef(false);

  const handleFetch = useCallback(
    (targetUrl?: string) => {
      const trimmed = (targetUrl ?? url).trim();
      if (!trimmed || isScraping) return;
      setPreview(null);
      scrape(trimmed, {
        onSuccess: (result) => {
          setPreview(result);
        },
      });
    },
    [url, isScraping, scrape]
  );

  useEffect(() => {
    if (autoFetch && initialUrl && !fetchedRef.current) {
      fetchedRef.current = true;
      handleFetch(initialUrl);
    }
  }, [autoFetch, initialUrl, handleFetch]);

  const handlePaste = async () => {
    try {
      const clip = await ExpoClipboard.getStringAsync();
      if (!clip) return;
      const trimmed = clip.trim();
      const match = trimmed.match(/https?:\/\/[^\s]+/);
      if (match) {
        setUrl(match[0]);
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        setUrl(trimmed);
      }
    } catch {
      // Clipboard access unavailable or denied
    }
  };

  const handleSave = () => {
    if (!preview) return;
    const title = cleanValue(preview.title, PLACEHOLDER_TITLE) || 'Untitled Position';
    const company = cleanValue(preview.company, PLACEHOLDER_COMPANY) || 'Unknown Company';

    create(
      {
        title,
        company,
        location: preview.location?.trim() || undefined,
        salaryRange: preview.salaryRange?.trim() || undefined,
        sourceUrl: url.trim() || undefined,
        snapshotMarkdown: preview.snapshotMarkdown || undefined,
      },
      {
        onSuccess: onCreated,
      }
    );
  };

  const handleManualSwitch = () => {
    if (preview) {
      onSwitchToManual(buildPrefillFromScrape(preview, url));
    } else {
      onSwitchToManual({ sourceUrl: url.trim() || undefined });
    }
  };

  const hasUrl = url.trim().length > 0;
  const displayTitle = preview ? cleanValue(preview.title, PLACEHOLDER_TITLE) || preview.title : '';
  const displayCompany = preview ? cleanValue(preview.company, PLACEHOLDER_COMPANY) || preview.company : '';

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="gap-4 pb-6">
        {/* URL Input Section */}
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-medium text-xs text-muted-foreground">JOB POSTING URL</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Paste URL from clipboard"
              onPress={handlePaste}
              className="flex-row items-center gap-1 active:opacity-70">
              <Icon icon={Clipboard} size={12} strokeWidth={2} className="text-accent" />
              <Text className="font-sans-medium text-xs text-accent">Paste</Text>
            </Pressable>
          </View>

          <View className="flex-row items-center gap-2">
            <View className="relative flex-1">
              <Input
                value={url}
                onChangeText={(t) => {
                  setUrl(t);
                  if (preview) setPreview(null);
                }}
                placeholder="https://..."
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Job posting URL"
                className="pr-8"
              />
              {hasUrl ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear URL"
                  onPress={() => {
                    setUrl('');
                    setPreview(null);
                  }}
                  className="absolute right-2.5 top-2.5 p-1 active:opacity-70">
                  <Icon icon={X} size={14} strokeWidth={2} className="text-muted-foreground" />
                </Pressable>
              ) : null}
            </View>

            <Button
              onPress={() => handleFetch()}
              disabled={!hasUrl || isScraping}
              size="default"
              accessibilityLabel="Fetch job posting">
              {isScraping ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                'Capture'
              )}
            </Button>
          </View>

          {isScraping ? (
            <View className="mt-1 flex-row items-center gap-2">
              <ActivityIndicator size="small" />
              <Text className="text-xs text-muted-foreground">
                Capturing posting details — this can take a few seconds…
              </Text>
            </View>
          ) : null}
        </View>

        {/* Scrape Error State */}
        {isScrapeError ? (
          <View className="gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5">
            <View className="flex-row items-start gap-2">
              <Icon icon={AlertCircle} size={16} strokeWidth={2} className="mt-0.5 text-destructive" />
              <View className="flex-1">
                <Text className="font-sans-medium text-xs text-destructive">
                  Could not capture posting automatically
                </Text>
                <Text className="mt-0.5 text-xs text-destructive/80">
                  Some job boards restrict automated access. You can enter the details manually with the URL prefilled.
                </Text>
              </View>
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={handleManualSwitch}
              accessibilityLabel="Enter details manually">
              Enter details manually
            </Button>
          </View>
        ) : null}

        {/* Scrape Preview Card */}
        {preview ? (
          <Card className="border-border/80 bg-card/70 p-4">
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5 rounded-full bg-accent/10 px-2 py-0.5">
                  <Icon icon={Sparkles} size={12} strokeWidth={2} className="text-accent" />
                  <Text className="font-sans-medium text-[11px] text-accent">
                    Captured from link
                  </Text>
                </View>
                {preview.status === 'partial' ? (
                  <Text className="text-[11px] text-amber-600">Partial capture</Text>
                ) : null}
              </View>

              <View className="gap-0.5">
                <Text className="font-sans-semibold text-base text-foreground">
                  {displayTitle || 'Untitled Position'}
                </Text>
                <Text className="font-sans-medium text-sm text-muted-foreground">
                  {displayCompany || 'Unknown Company'}
                </Text>
              </View>

              {preview.location || preview.salaryRange ? (
                <View className="flex-row flex-wrap items-center gap-2 pt-1">
                  {preview.location ? (
                    <View className="flex-row items-center gap-1 rounded-md bg-muted px-2 py-1">
                      <Icon icon={MapPin} size={12} strokeWidth={2} className="text-muted-foreground" />
                      <Text className="text-xs text-foreground">{preview.location}</Text>
                    </View>
                  ) : null}
                  {preview.salaryRange ? (
                    <View className="flex-row items-center gap-1 rounded-md bg-muted px-2 py-1">
                      <Icon icon={CircleDollarSign} size={12} strokeWidth={2} className="text-muted-foreground" />
                      <Text className="text-xs text-foreground">{preview.salaryRange}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {preview.snapshotMarkdown ? (
                <View className="rounded-md bg-muted/40 p-2.5">
                  <Text numberOfLines={3} className="text-xs text-muted-foreground">
                    {preview.snapshotMarkdown.replace(/[#*`_\[\]]/g, '').trim()}
                  </Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View className="mt-1 flex-row items-center justify-end gap-2.5 border-t border-hairline pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleManualSwitch}
                  disabled={isSaving}
                  accessibilityLabel="Edit details in manual form">
                  Edit details
                </Button>
                <Button
                  size="sm"
                  onPress={handleSave}
                  disabled={isSaving}
                  accessibilityLabel="Save captured job">
                  {isSaving ? 'Saving…' : 'Save job'}
                </Button>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Idle Helper Callout */}
        {!preview && !isScrapeError && !isScraping ? (
          <View className="rounded-lg border border-hairline bg-muted/30 p-3.5">
            <View className="flex-row items-start gap-2.5">
              <Icon icon={Globe} size={16} strokeWidth={1.75} className="mt-0.5 text-muted-foreground" />
              <View className="flex-1 gap-1">
                <Text className="font-sans-medium text-xs text-foreground">
                  Universal URL capture
                </Text>
                <Text className="text-xs leading-relaxed text-muted-foreground">
                  Paste a link from LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, or direct careers pages. {APP_CONFIG.name} parses the title, company, description, and details automatically.
                </Text>
              </View>
            </View>
            <View className="mt-3 border-t border-hairline pt-2.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Switch to manual form"
                onPress={handleManualSwitch}
                className="flex-row items-center justify-between active:opacity-70">
                <Text className="text-xs text-muted-foreground">Prefer to type details by hand?</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="font-sans-medium text-xs text-accent">Manual form</Text>
                  <Icon icon={ArrowRight} size={12} strokeWidth={2} className="text-accent" />
                </View>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
