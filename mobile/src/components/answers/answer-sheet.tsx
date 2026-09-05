import { useState } from 'react';
import { X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useCreateAnswer, useGenerateAnswer, useUpdateAnswer } from '@/hooks/use-answers';
import type { Answer, AnswerDraft } from '@/types/answer';
import type { Persona } from '@/types/persona';
import { GenerateAnswerControls, type JobOptionItem } from './generate-answer-controls';

export interface AnswerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answer: Answer | null;
  personas: readonly Persona[];
  jobs?: readonly JobOptionItem[];
  aiEnabled: boolean;
}

function CharacterCount({ value, target }: { value: string; target: number }) {
  return (
    <Text className="font-mono text-xs tabular-nums text-muted-foreground">
      {value.length.toLocaleString()} characters · aims for {target.toLocaleString()}
    </Text>
  );
}

function AnswerSheetBody({
  answer,
  personas,
  jobs = [],
  aiEnabled,
  onClose,
}: {
  answer: Answer | null;
  personas: readonly Persona[];
  jobs?: readonly JobOptionItem[];
  aiEnabled: boolean;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState(answer?.question ?? '');
  const [answerShort, setAnswerShort] = useState(answer?.answerShort ?? '');
  const [answerLong, setAnswerLong] = useState(answer?.answerLong ?? '');
  const [draft, setDraft] = useState<AnswerDraft | null>(null);

  const createMutation = useCreateAnswer();
  const updateMutation = useUpdateAnswer(answer?.id ?? '');
  const generateMutation = useGenerateAnswer();

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error || generateMutation.error;

  const canSave =
    question.trim().length > 0 &&
    (answerShort.trim().length > 0 || answerLong.trim().length > 0) &&
    !isSaving;

  const handleSave = () => {
    if (!canSave) return;
    const body = {
      question: question.trim(),
      answerShort: answerShort.trim() || undefined,
      answerLong: answerLong.trim() || undefined,
    };

    if (answer) {
      updateMutation.mutate(body, {
        onSuccess: onClose,
      });
    } else {
      createMutation.mutate(body, {
        onSuccess: onClose,
      });
    }
  };

  const handleGenerate = (input: { personaId: string; jobId?: string; instructions?: string }) => {
    generateMutation.mutate(
      {
        question: question.trim(),
        ...input,
      },
      {
        onSuccess: (result) => setDraft(result),
      }
    );
  };

  const acceptDraft = () => {
    if (!draft) return;
    setAnswerShort(draft.short);
    setAnswerLong(draft.long);
    setDraft(null);
  };

  return (
    <>
      <View className="mb-3 flex-row items-center justify-between">
        <SheetTitle>{answer ? 'Edit answer' : 'New answer'}</SheetTitle>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          onPress={onClose}
          className="rounded-md p-1">
          <Icon icon={X} size={16} strokeWidth={2} className="text-muted-foreground" />
        </Pressable>
      </View>

      {error ? (
        <View className="mb-3 rounded-md bg-destructive/10 p-2.5">
          <Text className="text-xs text-destructive">
            {error instanceof Error ? error.message : 'An error occurred'}
          </Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-5 pb-6">
          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">QUESTION</Text>
            <Input
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. Why are you interested in this role?"
              maxLength={500}
              accessibilityLabel="Question"
            />
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-medium text-xs text-muted-foreground">SHORT ANSWER</Text>
              <CharacterCount value={answerShort} target={500} />
            </View>
            <Textarea
              value={answerShort}
              onChangeText={setAnswerShort}
              placeholder="Concise response for short ATS form fields…"
              accessibilityLabel="Short Answer"
            />
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-medium text-xs text-muted-foreground">LONG ANSWER</Text>
              <CharacterCount value={answerLong} target={2000} />
            </View>
            <Textarea
              value={answerLong}
              onChangeText={setAnswerLong}
              placeholder="Comprehensive response with detailed examples…"
              accessibilityLabel="Long Answer"
            />
          </View>

          {/* AI Generation Section */}
          {aiEnabled && personas.length > 0 ? (
            <GenerateAnswerControls
              personas={personas}
              jobs={jobs}
              question={question}
              onGenerate={handleGenerate}
              isGenerating={generateMutation.isPending}
            />
          ) : null}

          {/* AI Draft Acceptance Preview */}
          {draft ? (
            <View className="gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <Text className="font-sans-medium text-xs text-primary uppercase">
                Generated Draft Preview
              </Text>

              <View className="gap-1">
                <Text className="font-sans-medium text-xs text-muted-foreground">SHORT DRAFT</Text>
                <Text className="text-sm text-foreground">{draft.short}</Text>
              </View>

              <View className="gap-1">
                <Text className="font-sans-medium text-xs text-muted-foreground">LONG DRAFT</Text>
                <Text className="text-sm text-foreground">{draft.long}</Text>
              </View>

              <View className="mt-2 flex-row gap-2">
                <Button size="sm" onPress={acceptDraft} className="flex-1">
                  Use Draft
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setDraft(null)}
                  className="flex-1">
                  Discard
                </Button>
              </View>
            </View>
          ) : null}

          <View className="mt-2 flex-row justify-end gap-3 border-t border-border/70 pt-4">
            <Button
              variant="outline"
              onPress={onClose}
              disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onPress={handleSave}
              disabled={!canSave}>
              {isSaving ? 'Saving…' : 'Save Answer'}
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

export function AnswerSheet({
  open,
  onOpenChange,
  answer,
  personas,
  jobs = [],
  aiEnabled,
}: AnswerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose>
        <AnswerSheetBody
          key={answer?.id ?? 'new'}
          answer={answer}
          personas={personas}
          jobs={jobs}
          aiEnabled={aiEnabled}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
