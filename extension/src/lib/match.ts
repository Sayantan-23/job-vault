// Ranks saved answers against the question read off the page.
//
// ponytail: Dice over character bigrams — no dependency, runs in the popup, and
// it beats the category leader, which matches on the exact string only. It
// catches rewording and typos ("...at Acme?" vs "...at this company?") but NOT
// semantically equivalent phrasings ("Why are you interested in this role?").
// Upgrade path is server-side embeddings behind this same interface, once
// there's evidence users actually hit near-miss phrasings. See d-0c9ovf.

export const MATCH_THRESHOLD = 0.45

export interface RankableAnswer {
  id: string
  question: string
  lastUsedAt: string | null
}

export interface RankedAnswer<T extends RankableAnswer = RankableAnswer> {
  answer: T
  score: number
  isMatch: boolean
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function bigrams(value: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (let i = 0; i < value.length - 1; i += 1) {
    const gram = value.slice(i, i + 2)
    counts.set(gram, (counts.get(gram) ?? 0) + 1)
  }
  return counts
}

export function similarity(left: string, right: string): number {
  const a = normalize(left)
  const b = normalize(right)
  if (!a || !b) return 0
  if (a === b) return 1

  const gramsA = bigrams(a)
  const gramsB = bigrams(b)
  let overlap = 0
  for (const [gram, count] of gramsA) {
    overlap += Math.min(count, gramsB.get(gram) ?? 0)
  }
  const total = a.length - 1 + (b.length - 1)
  return total > 0 ? (2 * overlap) / total : 0
}

function usedAt(answer: RankableAnswer): number {
  return answer.lastUsedAt ? new Date(answer.lastUsedAt).getTime() : 0
}

export function rankAnswers<T extends RankableAnswer>(answers: T[], question: string | null): RankedAnswer<T>[] {
  return answers
    .map((answer) => {
      const score = question ? similarity(question, answer.question) : 0
      return { answer, score, isMatch: score >= MATCH_THRESHOLD }
    })
    .sort((a, b) => b.score - a.score || usedAt(b.answer) - usedAt(a.answer))
}
