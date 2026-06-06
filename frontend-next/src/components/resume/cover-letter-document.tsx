'use client'

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 56, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5, color: '#111' },
  para: { marginBottom: 10 },
})

// Strip light markdown so the PDF reads as clean prose.
function toParagraphs(body: string): string[] {
  return body
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean)
}

export function CoverLetterDocument({ body }: { body: string }) {
  return (
    <Document title="Cover letter">
      <Page size="A4" style={s.page}>
        <View>
          {toParagraphs(body).map((p, i) => (
            <Text key={i} style={s.para}>
              {p}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  )
}
