import { useState } from 'react';
import { Briefcase, ClipboardList, Sparkles, Wand2, X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { Select, type SelectOption } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useAiStatus } from '@/hooks/use-ai-status';
import { useGenerateCoverLetter } from '@/hooks/use-cover-letters';
import { useJobOptions } from '@/hooks/use-job-options';
import { usePersonas } from '@/hooks/use-personas';
import type { CoverLetter, GenerateCoverLetterBody } from '@/types/cover-letter';

export interface NewCoverLetterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialJobId?: string;
  onGenerated?: (letter: CoverLetter) => void;
}

type JobSource = 'tracked' | 'paste';

const JOB_SOURCE_OPTIONS: readonly SegmentedOption<JobSource>[] = [
  { value: 'tracked', label: 'Tracked job', icon: Briefcase },
  { value: 'paste', label: 'Paste JD', icon: ClipboardList },
];

export function NewCoverLetterSheet({
  open,
  onOpenChange,
  initialJobId,
  onGenerated,
}: NewCoverLetterSheetProps) {
  const { data: personas = [] } = usePersonas();
  const { data: jobs = [] } = useJobOptions();
  const { data: aiStatus } = useAiStatus();

  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [source, setSource] = useState<JobSource>('tracked');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');

  const generateMutation = useGenerateCoverLetter();

  const personaId = selectedPersonaId ?? (personas[0]?.id ?? '');
  const jobId = selectedJobId ?? (initialJobId ?? '');

  const resetForm = () => {
    setSelectedPersonaId(null);
    setSelectedJobId(null);
    setTitle('');
    setCompany('');
    setDescription('');
    setInstructions('');
    setSource('tracked');
  };

  const personaOptions: SelectOption<string>[] = personas.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const jobOptions: SelectOption<string>[] = jobs.map((j) => ({
    value: j.id,
    label: `${j.title} — ${j.company}`,
  }));

  const trackedJobValid = jobs.some((j) => j.id === jobId);
  const isValid =
    Boolean(personaId) &&
    (source === 'tracked' ? trackedJobValid : Boolean(title.trim() && company.trim()));

  const aiConfigured = aiStatus?.enabled !== false;

  const handleGenerate = async () => {
    if (!isValid || generateMutation.isPending) return;

    const trimmedInstructions = instructions.trim();
    const base = trimmedInstructions ? { instructions: trimmedInstructions } : {};

    let payload: GenerateCoverLetterBody;
    if (source === 'tracked') {
      payload = { personaId, jobId, ...base };
    } else {
      const trimmedDescription = description.trim();
      payload = {
        personaId,
        job: {
          title: title.trim(),
          company: company.trim(),
          ...(trimmedDescription ? { description: trimmedDescription } : {}),
        },
        ...base,
      };
    }

    try {
      const created = await generateMutation.mutateAsync(payload);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics unavailable
      }
      resetForm();
      onOpenChange(false);
      onGenerated?.(created);
    } catch {
      // Error is captured in generateMutation.error
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[94%] gap-0 p-0">
        {/* Header */}
        <View className="border-b border-border px-5 pb-3.5 pt-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon icon={Sparkles} size={18} className="text-primary" />
              <SheetTitle className="text-base font-sans-medium text-foreground">
                New Cover Letter
              </SheetTitle>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close new cover letter sheet"
              onPress={() => onOpenChange(false)}
              className="rounded-md p-1 active:opacity-70">
              <Icon icon={X} size={18} className="text-muted-foreground" />
            </Pressable>
          </View>
          <Text className="mt-1 text-xs text-muted-foreground">
            Generate a tailored cover letter using your persona and target job.
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-5 py-4"
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {!aiConfigured ? (
            <View className="rounded-lg border border-border bg-muted/40 p-3.5">
              <Text className="text-xs text-muted-foreground">
                AI features are not configured on the server. Please check your backend
                configuration.
              </Text>
            </View>
          ) : personas.length === 0 ? (
            <View className="rounded-lg border border-border bg-muted/40 p-3.5">
              <Text className="text-xs text-muted-foreground">
                No personas found. Please create a persona first to generate tailored cover letters.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {/* Persona Selector */}
              <View className="gap-1.5">
                <Text className="text-xs font-sans-medium text-foreground">Select Persona</Text>
                <Select
                  value={personaId}
                  onValueChange={setSelectedPersonaId}
                  options={personaOptions}
                  placeholder="Choose a persona…"
                  aria-label="Persona"
                />
              </View>

              {/* Source Switcher */}
              <View className="gap-1.5">
                <Text className="text-xs font-sans-medium text-foreground">Job Source</Text>
                <SegmentedControl
                  value={source}
                  onValueChange={setSource}
                  options={JOB_SOURCE_OPTIONS}
                  aria-label="Job source"
                />
              </View>

              {/* Source Fields */}
              {source === 'tracked' ? (
                <View className="gap-1.5">
                  <Text className="text-xs font-sans-medium text-foreground">Target Job</Text>
                  {jobs.length === 0 ? (
                    <Text className="text-xs text-muted-foreground">
                      No tracked jobs yet — switch to &quot;Paste JD&quot;.
                    </Text>
                  ) : (
                    <Select
                      value={jobId}
                      onValueChange={setSelectedJobId}
                      options={jobOptions}
                      placeholder="Select a tracked job…"
                      aria-label="Tracked Job"
                    />
                  )}
                </View>
              ) : (
                <View className="gap-3">
                  <View className="gap-1.5">
                    <Text className="text-xs font-sans-medium text-foreground">Job Title *</Text>
                    <Input
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g. Senior Frontend Engineer"
                      accessibilityLabel="Job title"
                      maxLength={255}
                    />
                  </View>

                  <View className="gap-1.5">
                    <Text className="text-xs font-sans-medium text-foreground">Company *</Text>
                    <Input
                      value={company}
                      onChangeText={setCompany}
                      placeholder="e.g. Stripe"
                      accessibilityLabel="Company name"
                      maxLength={255}
                    />
                  </View>

                  <View className="gap-1.5">
                    <Text className="text-xs font-sans-medium text-foreground">
                      Job Description (Optional)
                    </Text>
                    <Textarea
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Paste the job description to tailor the letter…"
                      accessibilityLabel="Job description"
                      className="min-h-24 text-xs"
                    />
                  </View>
                </View>
              )}

              {/* Instructions */}
              <View className="gap-1.5">
                <Text className="text-xs font-sans-medium text-foreground">
                  Special Instructions (Optional)
                </Text>
                <Textarea
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholder="e.g. emphasize GraphQL experience and keep it under 350 words"
                  accessibilityLabel="Generation instructions"
                  className="min-h-20 text-xs"
                  maxLength={2000}
                />
              </View>

              {/* Error message */}
              {generateMutation.error ? (
                <View className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <Text className="text-xs text-destructive">
                    {generateMutation.error.message || 'Failed to generate cover letter.'}
                  </Text>
                </View>
              ) : null}

              {/* Generate Button */}
              <Button
                disabled={!isValid || generateMutation.isPending}
                onPress={handleGenerate}
                accessibilityLabel="Generate cover letter"
                className="mt-2 h-11 gap-2 bg-primary">
                <Icon icon={Wand2} size={16} className="text-primary-foreground" />
                <Text className="text-sm font-sans-medium text-primary-foreground">
                  {generateMutation.isPending ? 'Generating…' : 'Generate cover letter'}
                </Text>
              </Button>
            </View>
          )}
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}
