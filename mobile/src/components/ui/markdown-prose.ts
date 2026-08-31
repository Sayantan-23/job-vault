/**
 * INCOMPLETE — the renderer half of this primitive is not here.
 *
 * The web's MarkdownProse styles `react-markdown` output element by element.
 * The native counterpart named by the spec (§2) is
 * `react-native-markdown-display`, which is not installed, and adding a
 * dependency is outside this lane's file ownership. What ports cleanly without
 * it is the pure repair below, which is also the only part of the web file that
 * carries logic rather than styling.
 *
 * To finish: `npx expo install react-native-markdown-display`, then render it
 * with a rules/style map mirroring the web `components` table (h1–h3, p, ul/ol,
 * li, a, strong, em, code, blockquote, hr, and img dropped entirely).
 */

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
