import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { Text, View } from 'react-native-css/components';
import { marked, type Token } from 'marked';

import { cn } from './cn';

/**
 * `marked`'s `Token` is a discriminated union — `token.text` and `token.tokens`
 * exist on some variants but not all. The runtime switch on `token.type` is the
 * real type guard; this loose type lets the renderer read the fields it needs
 * without a cast at every access site.
 */
type LooseToken = Token & { text?: string; tokens?: Token[] };

// Repairs a bold marker that got split across a blank line, e.g.
// `**Responsibilities\n\n**` (from source HTML like
// `<strong>Heading<br><br></strong>` → Turndown). CommonMark only treats `**…**`
// as bold within a single block, so the split renders as literal asterisks — we
// pull the orphaned closing `**` back onto the text line. Conservative: only
// matches a single line of non-asterisk text followed by blank line(s) then `**`,
// so well-formed inline bold is never touched.
export function repairSplitBold(markdown: string): string {
  return markdown.replace(/\*\*([^\n*]+?)[ \t]*(?:\n[ \t]*)+\*\*/g, '**$1**');
}

/**
 * Inline tokens → React Native Text children. RN Text supports nesting for
 * inherited styling, so `<Text className="font-sans-semibold"><Text>bold</Text></Text>`
 * bolds its child — the same mechanism the web sibling uses with `<strong>`.
 */
function renderInline(tokens: Token[] | undefined): ReactNode[] {
  if (!tokens) return [];
  return tokens.map((rawToken, i) => {
    const token = rawToken as LooseToken;
    switch (token.type) {
      case 'text':
        return <Text key={i}>{token.text}</Text>;
      case 'strong':
        return (
          <Text key={i} className="font-sans-semibold">
            {renderInline(token.tokens)}
          </Text>
        );
      case 'em':
        return (
          <Text key={i} className="italic">
            {renderInline(token.tokens)}
          </Text>
        );
      case 'codespan':
        return (
          <Text key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            {token.text}
          </Text>
        );
      case 'link':
        return (
          <Text
            key={i}
            className="text-primary underline underline-offset-2"
            onPress={() => token.href && Linking.openURL(token.href)}>
            {renderInline(token.tokens)}
          </Text>
        );
      case 'br':
        return <Text key={i}>{'\n'}</Text>;
      case 'escape':
        return <Text key={i}>{token.text}</Text>;
      // Images are never meaningful in a scraped job description — company logos,
      // tracking pixels, anti-scrape decoys. Drop them, same as the web sibling.
      case 'image':
        return null;
      default:
        return token.text ? <Text key={i}>{token.text}</Text> : null;
    }
  });
}

/**
 * Block-level tokens → View/Text. Each block carries its own bottom margin
 * (matching the web sibling's `mb-3`), except the last — ScrollView pads its
 * own bottom, so trailing space would double up.
 */
function renderBlock(rawToken: Token, index: number, total: number): ReactNode {
  const token = rawToken as LooseToken;
  const last = index === total - 1;
  const mb = last ? '' : 'mb-3';

  switch (token.type) {
      case 'heading': {
        // h1/h2 and h3 use slightly different margins, mirroring the web.
        const headingMb =
          token.depth <= 2 ? 'mb-2 mt-4' : 'mb-1.5 mt-3';
        return (
          <Text
            key={index}
            className={cn('text-sm font-sans-semibold text-foreground', headingMb, index === 0 && 'mt-0')}>
            {renderInline(token.tokens)}
          </Text>
        );
      }
      case 'paragraph':
        return (
          <Text key={index} className={cn('text-sm leading-relaxed text-foreground', mb)}>
            {renderInline(token.tokens)}
          </Text>
        );
      case 'list': {
        const ordered = (token as { ordered?: boolean }).ordered;
        return (
          <View key={index} className={cn('gap-1 pl-2', mb)}>
            {(token as { items?: Token[] }).items?.map((item, i) => (
              <View key={i} className="flex-row gap-2">
                <Text className="text-sm leading-relaxed text-foreground">
                  {ordered ? `${i + 1}.` : '•'}
                </Text>
                <Text className="flex-1 text-sm leading-relaxed text-foreground">
                  {renderInline((item as LooseToken).tokens)}
                </Text>
              </View>
            ))}
          </View>
        );
      }
      case 'blockquote':
        return (
          <View key={index} className={cn('border-l-2 border-border pl-3', mb)}>
            {(token as { tokens?: Token[] }).tokens?.map((t, i) =>
              renderBlock(t, i, (token as { tokens?: Token[] }).tokens?.length ?? 0)
            )}
          </View>
        );
      case 'code':
        return (
          <View key={index} className={cn('rounded bg-muted p-3', mb)}>
            <Text className="font-mono text-xs text-foreground">{token.text}</Text>
          </View>
        );
      case 'hr':
        return <View key={index} className={cn('border-t border-hairline', last ? '' : 'my-4')} />;
      case 'space':
        return null;
      default:
        return null;
  }
}

/**
 * Styled Markdown renderer, the native counterpart of the web's
 * `components/ui/markdown-prose.tsx`. Uses `marked` (pure JS, no React
 * dependency) to lex the markdown into tokens, then maps each to our own
 * Text/View primitives on our tokens — the same element-by-element styling the
 * web applies with react-markdown's `components` map, just with a parser that
 * has no React-version coupling.
 *
 * Used wherever arbitrary Markdown (scraped job descriptions, etc.) is shown.
 */
export function MarkdownProse({ children }: { children: string }) {
  const tokens = marked.lexer(repairSplitBold(children));
  return (
    <View className="text-sm text-foreground">
      {tokens.map((token, i) => renderBlock(token, i, tokens.length))}
    </View>
  );
}
