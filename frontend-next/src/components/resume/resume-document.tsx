'use client'

import { Document, Page, View, Text, Link, StyleSheet } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import type { ResumeContent } from '@/types/resume'
import { splitBold } from '@/lib/resume-markup'

const RULE = '#2B6CB0'
const s = StyleSheet.create({
  page: { paddingVertical: 29, paddingHorizontal: 36, fontFamily: 'Helvetica', fontSize: 9.5, color: '#000', lineHeight: 1.3 },
  // Explicit lineHeight so the 22pt name reserves its own line box (without it,
  // react-pdf sizes the line to the 9.5pt page default and the contact row
  // overlaps the name). marginBottom adds the gap before the contact line.
  name: { fontFamily: 'Helvetica-Bold', fontSize: 22, lineHeight: 1.25, textAlign: 'center', marginBottom: 6 },
  contact: { textAlign: 'center', fontSize: 8.5, lineHeight: 1.3, marginBottom: 10, color: '#222' },
  link: { color: '#0645AD', textDecoration: 'none' },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginTop: 8, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: RULE },
  para: { marginTop: 3 },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  title: { marginTop: 1 },
  bullet: { flexDirection: 'row', marginTop: 1, paddingLeft: 4 },
  bulletDot: { width: 8 },
  bulletText: { flex: 1 },
  skillLine: { marginTop: 2 },
})

function Rich({ text, base }: { text: string; base?: Style }) {
  return (
    <Text {...(base ? { style: base } : {})}>
      {splitBold(text).map((run, i) => (
        <Text key={i} {...(run.bold ? { style: s.bold } : {})}>
          {run.text}
        </Text>
      ))}
    </Text>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((b, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.bulletDot}>•</Text>
          <View style={s.bulletText}>
            <Rich text={b} />
          </View>
        </View>
      ))}
    </View>
  )
}

export function ResumeDocument({ content }: { content: ResumeContent }) {
  const { basics } = content
  const contact: React.ReactNode[] = []
  const push = (node: React.ReactNode) => {
    if (contact.length) contact.push(<Text key={`sep${contact.length}`}>{'  |  '}</Text>)
    contact.push(node)
  }
  if (basics.phone) push(<Text key="phone">{basics.phone}</Text>)
  if (basics.email) push(<Link key="email" style={s.link} src={`mailto:${basics.email}`}>{basics.email}</Link>)
  if (basics.location) push(<Text key="loc">{basics.location}</Text>)
  basics.links.forEach((l, i) =>
    push(<Link key={`l${i}`} style={s.link} src={/^https?:\/\//i.test(l.url) ? l.url : `https://${l.url}`}>{l.url}</Link>),
  )

  return (
    <Document title="Resume">
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{basics.name}</Text>
        {contact.length > 0 && <Text style={s.contact}>{contact}</Text>}

        {content.summary.trim() !== '' && (
          <View>
            <Text style={s.sectionTitle}>Professional Summary</Text>
            <Rich text={content.summary} base={s.para} />
          </View>
        )}

        {content.experience.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Experience</Text>
            {content.experience.map((e, i) => (
              <View key={i}>
                <View style={s.entryHead}>
                  <Text style={s.bold}>{e.company}</Text>
                  <Text>{e.date}</Text>
                </View>
                <Text style={s.title}>{e.title}</Text>
                <Bullets items={e.bullets} />
              </View>
            ))}
          </View>
        )}

        {content.projects.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Projects</Text>
            {content.projects.map((p, i) => (
              <View key={i}>
                <View style={s.entryHead}>
                  <Text style={s.bold}>{p.name}</Text>
                  {p.tagline ? <Text style={s.italic}>{p.tagline}</Text> : <Text />}
                </View>
                <Bullets items={p.bullets} />
                {p.url ? (
                  <Link style={s.link} src={/^https?:\/\//i.test(p.url) ? p.url : `https://${p.url}`}>
                    {p.url}
                  </Link>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {content.skills.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Skills</Text>
            {content.skills.map((g, i) => (
              <Text key={i} style={s.skillLine}>
                <Text style={s.bold}>{g.category}: </Text>
                {g.items.join(', ')}
              </Text>
            ))}
          </View>
        )}

        {content.education.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Education</Text>
            {content.education.map((e, i) => (
              <Text key={i} style={s.skillLine}>
                <Text style={s.bold}>{e.degree}, </Text>
                {e.institution}
                {e.period ? ` (${e.period})` : ''}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
