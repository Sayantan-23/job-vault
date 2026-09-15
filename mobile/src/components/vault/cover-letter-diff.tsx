import { Text } from 'react-native-css/components';

import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';
import { coverLetterToPlainText } from '@/lib/cover-letter-markdown';
import { diffWords } from '@/lib/word-diff';

export interface CoverLetterDiffProps {
  current: string;
  proposed: string;
}

/**
 * Word-level diff of the current letter vs the proposed one, for the "Fix grammar"
 * review where only a few words change. Insertions get a faint accent highlight;
 * deletions are struck through and muted. Diffs the plain text (markdown stripped)
 * so markdown markers do not confuse the diff.
 */
export function CoverLetterDiff({ current, proposed }: CoverLetterDiffProps) {
  const { colors = LIGHT_COLORS, effectiveTheme } = useTheme() ?? {};
  const plainCurrent = coverLetterToPlainText(current);
  const plainProposed = coverLetterToPlainText(proposed);
  const segments = diffWords(plainCurrent, plainProposed);

  return (
    <Text style={{ color: colors.foreground }} className="text-sm leading-relaxed text-foreground">
      {segments.map((seg, i) => {
        if (seg.op === 'insert') {
          return (
            <Text
              key={i}
              accessibilityLabel={`Inserted: ${seg.text}`}
              style={{
                backgroundColor: effectiveTheme === 'dark' ? 'rgba(112, 138, 222, 0.25)' : undefined,
                color: colors.foreground,
              }}
              className="bg-primary/20 font-sans-medium text-foreground">
              {seg.text}
            </Text>
          );
        }
        if (seg.op === 'delete') {
          return (
            <Text
              key={i}
              accessibilityLabel={`Deleted: ${seg.text}`}
              style={{ color: colors.mutedForeground }}
              className="bg-destructive/15 text-muted-foreground line-through">
              {seg.text}
            </Text>
          );
        }
        return (
          <Text key={i} style={{ color: colors.foreground }} className="text-foreground">
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}
