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

function tsQuery(q: string): SQL {
  return sql`plainto_tsquery('english', ${q})`
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

// The rank is banded, because ts_rank (~0.06 for a good hit) and similarity
// (0..1) are incompatible scales: a plain greatest() of the two ranked every
// fuzzy title match above every exact match found in a body field. Both scores
// are 0..1, so the +1.0 puts all FTS hits strictly above all trigram-only hits,
// and within each band rows still sort by their own score.
function branch(source: Source, userId: string, q: string): SQL {
  const vector = tsVector(source.fts)
  const query = tsQuery(q)
  const trgmSim = trgmSimilarity(source.trgm, q)
  return sql`(select ${source.type}::text as type,
                     ${source.id}::text as id,
                     coalesce(${source.title}, 'Untitled') as title,
                     ${source.subtitle ?? sql`null::text`} as subtitle,
                     ${source.snippet} as snippet_source,
                     case when ${vector} @@ ${query}
                          then 1.0 + ts_rank(${vector}, ${query})
                          else ${trgmSim}
                     end as rank
                from ${source.table}
               where ${source.userId} = ${userId}
                 and (${vector} @@ ${query} or ${trgmSim} > ${TRIGRAM_FLOOR})
               order by rank desc
               limit ${PER_TYPE_LIMIT})`
}

async function search(userId: string, q: string): Promise<SearchResult[]> {
  const branches = SOURCES.map((source) => branch(source, userId, q))
  // ts_headline runs in the OUTER query, on the ~20 surviving rows — not on
  // every job description in the table.
  const statement = sql`select type, id, title, subtitle,
                               ts_headline('english', snippet_source, ${tsQuery(q)}, ${HEADLINE_OPTIONS}) as snippet
                          from (${sql.join(branches, sql` union all `)}) hits
                         order by rank desc
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
