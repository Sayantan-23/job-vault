'use client'

import { Document, Page, View, Text, Link, StyleSheet } from '@react-pdf/renderer'
import { parseCoverLetterMarkdown, type Line } from '@/lib/cover-letter-markdown'

const s = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 56, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5, color: '#111' },
  para: { marginBottom: 10 },
  bold: { fontFamily: 'Helvetica-Bold' },
  link: { color: '#3b3f9c', textDecoration: 'underline' },
})

// Render one line's inline runs, preserving order. react-pdf flows nested <Text>
// inline, so bold/link runs sit within the surrounding sentence.
function InlineRuns({ runs }: { runs: Line }) {
  return (
    <>
      {runs.map((run, i) => {
        if (run.type === 'bold') return <Text key={i} style={s.bold}>{run.text}</Text>
        if (run.type === 'link')
          return (
            <Link key={i} src={run.href} style={s.link}>
              {run.text}
            </Link>
          )
        return <Text key={i}>{run.text}</Text>
      })}
    </>
  )
}

// Derives the PDF from the same Markdown model as the on-screen preview, so the
// download matches what the user sees: real paragraph gaps, bold rendered, links
// clickable, and soft line breaks (the contact header) preserved.
export function CoverLetterDocument({ body }: { body: string }) {
  const blocks = parseCoverLetterMarkdown(body)
  return (
    <Document title="Cover letter">
      <Page size="A4" style={s.page}>
        <View>
          {blocks.map((block, bi) => (
            <Text key={bi} style={s.para}>
              {block.lines.map((line, li) => (
                // A leading "\n" reproduces the soft line break inside a paragraph.
                <Text key={li}>
                  {li > 0 ? '\n' : ''}
                  <InlineRuns runs={line} />
                </Text>
              ))}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  )
}
