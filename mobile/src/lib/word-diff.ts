// Word-level diff for the "Fix grammar" and AI refine proposal review.
// Whitespace (including newlines) is tokenized too, so the diff reconstructs the
// originals exactly and renders with paragraph breaks intact.

export type DiffOp = 'equal' | 'insert' | 'delete';
export interface DiffSegment {
  op: DiffOp;
  text: string;
}

function tokenize(s: string): string[] {
  return s.split(/(\s+)/).filter((t) => t.length > 0);
}

export function diffWords(before: string, after: string): DiffSegment[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;

  // Longest common subsequence lengths (suffix DP).
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const lcs = (i: number, j: number): number => dp[i]?.[j] ?? 0;
  for (let i = n - 1; i >= 0; i--) {
    const row = dp[i];
    if (!row) continue;
    for (let j = m - 1; j >= 0; j--) {
      row[j] = a[i] === b[j] ? lcs(i + 1, j + 1) + 1 : Math.max(lcs(i + 1, j), lcs(i, j + 1));
    }
  }

  const segments: DiffSegment[] = [];
  const push = (op: DiffOp, text: string) => {
    const last = segments[segments.length - 1];
    if (last && last.op === op) last.text += text;
    else segments.push({ op, text });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const ai = a[i] ?? '';
    const bj = b[j] ?? '';
    if (ai === bj) {
      push('equal', ai);
      i++;
      j++;
    } else if (lcs(i + 1, j) >= lcs(i, j + 1)) {
      push('delete', ai);
      i++;
    } else {
      push('insert', bj);
      j++;
    }
  }
  while (i < n) push('delete', a[i++] ?? '');
  while (j < m) push('insert', b[j++] ?? '');
  return segments;
}
