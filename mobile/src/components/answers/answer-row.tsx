import { Trash2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { relativeTime } from '@/lib/relative-time';
import type { Answer } from '@/types/answer';
import { AnswerCopyChip } from './answer-copy-chip';

export interface AnswerRowProps {
  answer: Answer;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCopied: (id: string) => void;
}

export function AnswerRow({ answer, onSelect, onDelete, onCopied }: AnswerRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Answer: ${answer.question}`}
      onPress={() => onSelect(answer.id)}
      className="border-b border-border/60 px-4 py-3.5 active:bg-muted/40">
      <View className="gap-2.5">
        <Text className="font-sans-medium text-sm text-foreground" numberOfLines={2}>
          {answer.question}
        </Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            {answer.answerShort ? (
              <AnswerCopyChip
                variant="short"
                text={answer.answerShort}
                question={answer.question}
                onCopied={() => onCopied(answer.id)}
              />
            ) : null}
            {answer.answerLong ? (
              <AnswerCopyChip
                variant="long"
                text={answer.answerLong}
                question={answer.question}
                onCopied={() => onCopied(answer.id)}
              />
            ) : null}
          </View>

          <View className="flex-row items-center gap-3">
            <Text className="font-mono text-xs tabular-nums text-muted-foreground">
              {relativeTime(answer.lastUsedAt)}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete “${answer.question}”`}
              onPress={() => onDelete(answer.id)}
              className="rounded p-1 active:bg-destructive/10">
              <Icon icon={Trash2} size={15} strokeWidth={1.75} className="text-muted-foreground" />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
