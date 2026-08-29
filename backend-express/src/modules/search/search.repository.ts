import { sql, type SQL } from 'drizzle-orm'
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core'
import { getDb } from '@/db/client.js'
import { jobs } from '@/db/schema/jobs.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'
import { coverLetters } from '@/db/schema/cover-letters.js'
import { personas } from '@/db/schema/personas.js'
import { questionAnswers } from '@/db/schema/question-answers.js'
import type { SearchResult, SearchResultType } from './search.schema.js'

type Source = {
  type: SearchResultType
  table: PgTable
  id: AnyPgColumn
  userId: AnyPgColumn
  title: AnyPgColumn
  subtitle: AnyPgColumn | null
  /** Columns concatenated into the tsvector — the recall surface. */
  fts: AnyPgColumn[]
  /** The short columns typos are measured against — best match across them wins. */
  trgm: AnyPgColumn[]
  /** The column ts_headline excerpts in the outer query. */
  snippet: AnyPgColumn
}

const SOURCES: Source[] = [
  {
    type: 'job',
    table: jobs,
    id: jobs.id,
    userId: jobs.userId,
    title: jobs.title,
    subtitle: jobs.company,
    fts: [jobs.title, jobs.company, jobs.snapshotMarkdown],
    trgm: [jobs.title, jobs.company],
    snippet: jobs.snapshotMarkdown,
  },
  {
    type: 'resume',
    table: generatedResumes,
    id: generatedResumes.id,
    userId: generatedResumes.userId,
    title: generatedResumes.title,
    subtitle: null,
    fts: [generatedResumes.title, generatedResumes.instructions],
    trgm: [generatedResumes.title],
    snippet: generatedResumes.instructions,
  },
  {
    type: 'coverLetter',
    table: coverLetters,
    id: coverLetters.id,
    userId: coverLetters.userId,
    title: coverLetters.title,
    subtitle: null,
    fts: [coverLetters.title, coverLetters.instructions, coverLetters.bodyMarkdown],
    trgm: [coverLetters.title],
    snippet: coverLetters.bodyMarkdown,
  },
  {
    type: 'persona',
    table: personas,
    id: personas.id,
    userId: personas.userId,
    title: personas.name,
    subtitle: null,
    fts: [personas.name, personas.rawInput],
    trgm: [personas.name],
    snippet: personas.rawInput,
  },
  {
    type: 'answer',
    table: questionAnswers,
    id: questionAnswers.id,
    userId: questionAnswers.userId,
    title: questionAnswers.question,
    subtitle: null,
    fts: [questionAnswers.question, questionAnswers.answerShort, questionAnswers.answerLong],
    trgm: [questionAnswers.question],
    snippet: questionAnswers.answerLong,
  },
]

/** Anything below this trigram score is a coincidence, not a typo. */
const TRIGRAM_FLOOR = 0.3
const PER_TYPE_LIMIT = 5
const TOTAL_LIMIT = 20

// StartSel/StopSel are the STX/ETX control characters, NOT ts_headline's default
// <b>/</b>. jobs.snapshot_markdown is scraped from third-party pages, so an HTML
// delimiter would make every snippet a stored-XSS carrier the moment a client
// rendered it as markup. The client splits on these sentinels into React nodes.
const HEADLINE_OPTIONS = 'StartSel=\u0002,StopSel=\u0003,MaxWords=18,MinWords=5,MaxFragments=1'
const START_SEL = '\u0002'
const SENTINELS = '\u0002\u0003'

// Two snippet sources are markdown (jobs.snapshot_markdown, cover_letters.body_markdown),
// so an untouched excerpt showed literal '**' and '###' in the results list. Only
// the markers that are always decoration are dropped — NOT '-' ("Full-Stack") and
// NOT '_' (it appears inside identifiers). A snippet is not a rendered document,
// so a regexp_replace is the whole job; there is no markdown parser here.
const MARKDOWN_MARKERS = '[*#`~]'

// Sentinels are stripped from the source BEFORE ts_headline puts its own back in.
// sanitizeSnapshotMarkdown removes images and data: URIs, not control characters,
// so a scraped page containing a literal STX would otherwise reach the client and
// invert every highlight after it (the client splitter is pure parity).
const SNIPPET_SOURCE = sql`regexp_replace(translate(hits.snippet_source, ${SENTINELS}, ''), ${MARKDOWN_MARKERS}, '', 'g')`

// plainto_tsquery matches whole lexemes, so `reac` never finds React. OR in a
// prefix query over the same words: `reac:*` does — in bodies too, which is
// where the substring band below deliberately cannot look. The words are
// rebuilt from the raw input rather than interpolated, because to_tsquery
// parses its argument as tsquery syntax and a stray `&` or `!` is a 500.
// A term of only punctuation yields no words; fall back to plainto alone
// rather than emitting to_tsquery(''), which is a syntax error.
function tsQuery(q: string): SQL {
  const words = q.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean)
  if (words.length === 0) return sql`plainto_tsquery('english', ${q})`
  const prefix = words.map((w) => `${w}:*`).join(' & ')
  return sql`(plainto_tsquery('english', ${q}) || to_tsquery('english', ${prefix}))`
}

// concat_ws, not a `||` chain: it skips NULLs, where a single NULL in a plain
// concatenation would null the whole document.
function tsVector(cols: AnyPgColumn[]): SQL {
  return sql`to_tsvector('english', concat_ws(' ', ${sql.join(cols, sql`, `)}))`
}

// greatest() over one argument is just that argument, so single-column sources
// need no special case.
function trgmSimilarity(cols: AnyPgColumn[], q: string): SQL {
  const scores = cols.map((col) => sql`similarity(${col}, ${q})`)
  return sql`greatest(${sql.join(scores, sql`, `)})`
}

// Infix, which FTS structurally cannot do (`gine` in Engineer). Runs on
// source.trgm — already exactly the short identifying columns — because
// '%in%' against a job description matches every job in the account.
// LIKE metacharacters are escaped: an unescaped '%' typed by the user would
// match every row.
function substringMatch(cols: AnyPgColumn[], q: string): SQL {
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`
  const tests = cols.map((col) => sql`${col} ilike ${like}`)
  return sql`(${sql.join(tests, sql` or `)})`
}

// The rank is banded, because ts_rank (~0.06 for a good hit) and similarity
// (0..1) are incompatible scales: a plain greatest() of the two ranked every
// fuzzy title match above every exact match found in a body field. Both scores
// are 0..1, so the offsets carve out three non-overlapping bands — FTS hits
// (+2.0) above substring hits (+1.0) above trigram-only hits — and within each
// band rows still sort by their own score.
function branch(source: Source, userId: string, q: string): SQL {
  const vector = tsVector(source.fts)
  const query = tsQuery(q)
  const trgmSim = trgmSimilarity(source.trgm, q)
  const substr = substringMatch(source.trgm, q)
  return sql`(select ${source.type}::text as type,
                     ${source.id}::text as id,
                     coalesce(${source.title}, 'Untitled') as title,
                     ${source.subtitle ?? sql`null::text`} as subtitle,
                     ${source.snippet} as snippet_source,
                     case when ${vector} @@ ${query} then 2.0 + ts_rank(${vector}, ${query})
                          -- ponytail: similarity() as the within-band tiebreak is ~0 for
                          -- two-character terms, so their order inside the substring band
                          -- is effectively arbitrary. Upgrade to a coverage score
                          -- (matched length / field length) if that shows in real use.
                          when ${substr} then 1.0 + ${trgmSim}
                          else ${trgmSim}
                     end as rank
                from ${source.table}
               where ${source.userId} = ${userId}
                 and (${vector} @@ ${query} or ${substr} or ${trgmSim} > ${TRIGRAM_FLOOR})
               order by rank desc
               limit ${PER_TYPE_LIMIT})`
}

async function search(userId: string, q: string): Promise<SearchResult[]> {
  const branches = SOURCES.map((source) => branch(source, userId, q))
  // ts_headline runs in the OUTER query, on the ~20 surviving rows — not on
  // every job description in the table.
  // The lateral exists so the headline can be tested for a start sentinel without
  // computing it twice: with no match in the body ts_headline returns the head of
  // the document, which rendered as an unrelated, unhighlighted excerpt under a
  // row that matched on its title alone. No highlight, no snippet.
  const statement = sql`select hits.type, hits.id, hits.title, hits.subtitle,
                               case when strpos(h.snippet, ${START_SEL}) > 0 then h.snippet end as snippet
                          from (${sql.join(branches, sql` union all `)}) hits
                          cross join lateral (select ts_headline('english', ${SNIPPET_SOURCE}, ${tsQuery(q)}, ${HEADLINE_OPTIONS}) as snippet) h
                         order by hits.rank desc
                         limit ${TOTAL_LIMIT}`
  const { rows } = await getDb().execute(statement)
  return rows.map((row) => ({
    type: row['type'] as SearchResultType,
    id: String(row['id']),
    title: String(row['title']),
    subtitle: (row['subtitle'] as string | null) ?? null,
    snippet: (row['snippet'] as string | null) ?? null,
  }))
}

export const searchRepository = { search }
