import { useState } from 'react';
import { Sparkles } from 'lucide-react-native';
import { Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { MarkdownProse } from '@/components/ui/markdown-prose';
import type { RefineAction } from '@/types/cover-letter';

import { CoverLetterDiff } from './cover-letter-diff';

const ACTION_LABEL: Record<RefineAction, string> = {
  humanize: 'Humanize',
  shorten: 'Shorten',
  lengthen: 'Make longer',
  'fix-grammar': 'Fix grammar',
  custom: 'Custom',
};

export interface CoverLetterProposalProps {
  action: RefineAction;
  candidate: string;
  currentBody: string;
  busy: boolean;
  onKeep: () => void;
  onDiscard: () => void;
  onTryAgain: () => void;
}

/**
 * The staged AI rewrite panel, shown in the same slot the letter occupies.
 * Accent border + header mark it as a proposal; a toggle compares against the
 * current letter; "Fix grammar" shows a word-diff by default.
 */
export function CoverLetterProposal({
  action,
  candidate,
  currentBody,
  busy,
  onKeep,
  onDiscard,
  onTryAgain,
}: CoverLetterProposalProps) {
  const isGrammar = action === 'fix-grammar';
  const [showAlt, setShowAlt] = useState(false);

  // Non-grammar alt view = the current letter (compare-only); grammar alt = the
  // clean proposed text (the diff already contains the original).
  const viewingOriginal = !isGrammar && showAlt;
  const toggleLabel = isGrammar
    ? showAlt
      ? 'Show diff'
      : 'Show clean'
    : showAlt
      ? 'Show proposed'
      : 'Show original';

  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn(
        'overflow-hidden rounded-lg border border-border',
        viewingOriginal ? 'bg-card' : 'border-l-4 border-l-primary bg-primary/[0.03]'
      )}>
      {/* Proposal Header */}
      <View className="flex-row items-center justify-between border-b border-border/60 px-4 py-2.5">
        {viewingOriginal ? (
          <Text className="font-sans-medium text-xs uppercase tracking-wider text-muted-foreground">
            Current letter
          </Text>
        ) : (
          <View className="flex-row items-center gap-1.5">
            <Icon icon={Sparkles} size={14} className="text-primary" />
            <Text className="font-sans-medium text-xs uppercase tracking-wider text-primary">
              Proposed rewrite
            </Text>
          </View>
        )}
        <View className="rounded-full bg-muted px-2 py-0.5">
          <Text className="font-sans-medium text-xs text-muted-foreground">
            {ACTION_LABEL[action]}
          </Text>
        </View>
      </View>

      {/* Body or Diff */}
      <View className="p-4">
        {isGrammar ? (
          showAlt ? (
            <MarkdownProse>{candidate}</MarkdownProse>
          ) : (
            <CoverLetterDiff current={currentBody} proposed={candidate} />
          )
        ) : (
          <MarkdownProse>{showAlt ? currentBody : candidate}</MarkdownProse>
        )}
      </View>

      {/* Action footer */}
      <View className="flex-row flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2.5">
        {!viewingOriginal ? (
          <Button
            size="sm"
            accessibilityLabel="Keep proposed changes"
            disabled={busy}
            onPress={onKeep}>
            <Text className="text-xs font-sans-medium text-primary-foreground">Keep</Text>
          </Button>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          accessibilityLabel={toggleLabel}
          disabled={busy}
          onPress={() => setShowAlt((v) => !v)}>
          <Text className="text-xs font-sans-medium text-foreground">{toggleLabel}</Text>
        </Button>

        {!viewingOriginal ? (
          <Button
            variant="ghost"
            size="sm"
            accessibilityLabel="Try again"
            disabled={busy}
            onPress={onTryAgain}>
            <Text className="text-xs font-sans-medium text-foreground">
              {busy ? 'Improving…' : 'Try again'}
            </Text>
          </Button>
        ) : null}

        <View className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          accessibilityLabel="Discard proposed changes"
          disabled={busy}
          onPress={onDiscard}>
          <Text className="text-xs font-sans-medium text-destructive">Discard</Text>
        </Button>
      </View>
    </View>
  );
}
