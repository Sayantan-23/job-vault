import { useState } from 'react';
import { Sparkles } from 'lucide-react-native';
import { Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import type { Persona } from '@/types/persona';

export interface JobOptionItem {
  id: string;
  title: string;
  company: string;
}

export interface GenerateAnswerControlsProps {
  personas: readonly Persona[];
  jobs?: readonly JobOptionItem[];
  question: string;
  onGenerate: (input: { personaId: string; jobId?: string; instructions?: string }) => void;
  isGenerating: boolean;
}

export function GenerateAnswerControls({
  personas,
  jobs = [],
  question,
  onGenerate,
  isGenerating,
}: GenerateAnswerControlsProps) {
  const [personaId, setPersonaId] = useState<string>(personas[0]?.id ?? '');
  const [jobId, setJobId] = useState<string>('none');
  const [instructions, setInstructions] = useState('');

  const canGenerate = question.trim().length > 0 && personaId !== '' && !isGenerating;

  const personaOptions: readonly SelectOption<string>[] = personas.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const jobOptions: readonly SelectOption<string>[] = [
    { value: 'none', label: 'None (general answer)' },
    ...jobs.map((j) => ({
      value: j.id,
      label: `${j.title} · ${j.company}`,
    })),
  ];

  const handleSubmit = () => {
    const trimmed = instructions.trim();
    onGenerate({
      personaId,
      ...(jobId !== 'none' ? { jobId } : {}),
      ...(trimmed ? { instructions: trimmed } : {}),
    });
  };

  return (
    <View className="gap-3.5 rounded-xl border border-border/70 bg-muted/20 p-4">
      <View className="flex-row items-center gap-1.5">
        <Icon icon={Sparkles} size={15} strokeWidth={2} className="text-primary" />
        <Text className="font-sans-medium text-xs text-primary uppercase tracking-wide">
          AI Answer Draft
        </Text>
      </View>

      <View className="gap-1.5">
        <Text className="font-sans-medium text-xs text-muted-foreground">PERSONA</Text>
        <Select
          value={personaId}
          onValueChange={setPersonaId}
          options={personaOptions}
          aria-label="Select Persona"
        />
      </View>

      <View className="gap-1.5">
        <Text className="font-sans-medium text-xs text-muted-foreground">JOB CONTEXT</Text>
        <Select
          value={jobId}
          onValueChange={setJobId}
          options={jobOptions}
          aria-label="Select Target Job"
        />
      </View>

      <View className="gap-1.5">
        <Text className="font-sans-medium text-xs text-muted-foreground">EXTRA INSTRUCTIONS</Text>
        <Input
          value={instructions}
          onChangeText={setInstructions}
          placeholder="e.g. emphasize leadership, keep tone direct"
          accessibilityLabel="Extra Instructions"
        />
      </View>

      <Button
        onPress={handleSubmit}
        disabled={!canGenerate}
        className="mt-1 flex-row items-center justify-center gap-2">
        <Icon
          icon={Sparkles}
          size={16}
          strokeWidth={2}
          className={canGenerate ? 'text-primary-foreground' : 'text-muted-foreground'}
        />
        <Text
          className={
            canGenerate
              ? 'font-sans-medium text-sm text-primary-foreground'
              : 'font-sans-medium text-sm text-muted-foreground'
          }>
          {isGenerating ? 'Generating…' : 'Generate with AI'}
        </Text>
      </Button>
    </View>
  );
}
