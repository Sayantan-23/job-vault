// A deliberately small Markdown model shared by the cover-letter preview,
// plain text conversion, and the PDF document, so all renderings stay identical.
// Cover letters use a constrained grammar: paragraphs (blank-line separated),
// soft line breaks (single newline — the contact header), `**bold**`, and `[text](url)` links.

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'link'; text: string; href: string };

export type Line = Inline[];

export interface Block {
  lines: Line[];
}

// Matches a link `[text](href)` (groups 1,2) OR a bold run `**text**` (group 3).
const INLINE_RE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

function tokenizeLine(raw: string): Line {
  // Drop a leading Markdown heading marker (e.g. "## ") — keep the text.
  const line = raw.replace(/^#{1,6}\s+/, '');
  const runs: Line = [];
  let lastIndex = 0;
  for (const match of line.matchAll(INLINE_RE)) {
    const start = match.index;
    if (start > lastIndex) runs.push({ type: 'text', text: line.slice(lastIndex, start) });
    if (match[1] !== undefined && match[2] !== undefined) {
      runs.push({ type: 'link', text: match[1], href: match[2] });
    } else if (match[3] !== undefined) {
      runs.push({ type: 'bold', text: match[3] });
    }
    lastIndex = start + match[0].length;
  }
  if (lastIndex < line.length) runs.push({ type: 'text', text: line.slice(lastIndex) });
  return runs.length > 0 ? runs : [{ type: 'text', text: line }];
}

export function parseCoverLetterMarkdown(markdown: string): Block[] {
  const normalized = markdown.replace(/\r\n/g, '\n');
  return normalized
    .split(/\n\s*\n/) // blank line(s) separate paragraphs
    .map((chunk) => chunk.replace(/^\n+|\n+$/g, '')) // trim leading/trailing newlines
    .filter((chunk) => chunk.trim().length > 0)
    .map((chunk) => ({ lines: chunk.split('\n').map(tokenizeLine) }));
}

function lineToPlainText(line: Line): string {
  // Bold keeps its words (markers dropped); a link expands to "text (url)" so the
  // URL survives a paste into an email or application form.
  return line
    .map((run) => (run.type === 'link' ? `${run.text} (${run.href})` : run.text))
    .join('');
}

// Clean prose for the clipboard: no Markdown syntax, paragraph and soft-break
// structure preserved.
export function coverLetterToPlainText(markdown: string): string {
  return parseCoverLetterMarkdown(markdown)
    .map((block) => block.lines.map(lineToPlainText).join('\n'))
    .join('\n\n');
}
