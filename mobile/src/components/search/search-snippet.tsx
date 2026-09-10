import { Text } from 'react-native-css/components';

const SENTINELS = /[\u0002\u0003]/;

export interface SearchSnippetProps {
  text: string;
  className?: string;
}

/**
 * `ts_headline` wraps matches in STX/ETX control characters (\u0002 … \u0003).
 * Splitting on sentinels keeps text safe and produces pure React text nodes without HTML.
 * Odd indices are matched search terms highlighted with token colors.
 */
export function SearchSnippet({ text, className }: SearchSnippetProps) {
  if (!text) return null;
  const parts = text.split(SENTINELS);

  return (
    <Text className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} className="bg-primary/10 font-sans-medium text-foreground">
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}
