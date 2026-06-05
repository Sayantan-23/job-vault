import type { ResumeContent } from '@/shared/resume-content.schema.js'

const LATEX_ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
}

/** Escape LaTeX special characters in plain user text. Single pass — braces
 *  inserted by \textbackslash{} etc. are NOT re-scanned (avoids double-escape). */
export function escapeLatex(s: string): string {
  return s.replace(/[\\&%$#_{}~^]/g, (c) => LATEX_ESCAPES[c] ?? c)
}

/** Escape only the chars that break a \href URL argument (keeps / : ? = ~ etc.). */
export function escapeLatexUrl(url: string): string {
  return url.replace(/[\\%#&_{}$]/g, (c) => (c === '\\' ? '\\textbackslash{}' : `\\${c}`))
}

/** Escape, then expand **bold** markup into \textbf{...}. Assumes balanced **. */
export function richText(s: string): string {
  return s
    .split('**')
    .map((seg, i) => (i % 2 === 1 ? `\\textbf{${escapeLatex(seg)}}` : escapeLatex(seg)))
    .join('')
}

function ensureHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const PREAMBLE = `\\documentclass[a4paper,10pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[scaled=0.92]{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[top=0.4in, bottom=0.4in, left=0.5in, right=0.5in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\definecolor{ruleblue}{HTML}{2B6CB0}
\\definecolor{linkblue}{HTML}{0645AD}
\\hypersetup{colorlinks=true, linkcolor=linkblue, urlcolor=linkblue, pdftitle={Resume}}
\\titleformat{\\section}{\\vspace{-10pt}\\raggedright\\large\\bfseries\\color{black}}{}{0em}{}[\\color{ruleblue}\\titlerule\\vspace{-4pt}]
\\newcommand{\\resumeName}[1]{\\noindent{\\centering \\huge\\bfseries #1 \\par}}
`

const ITEMIZE_OPEN = '\\begin{itemize}[leftmargin=1em, label={\\textbullet}, itemsep=1pt, parsep=0pt, topsep=2pt]'

function bullets(items: string[]): string {
  if (items.length === 0) return ''
  return [ITEMIZE_OPEN, ...items.map((b) => `    \\item ${richText(b)}`), '\\end{itemize}'].join('\n')
}

export function renderResumeTex(content: ResumeContent): string {
  const { basics } = content
  const out: string[] = [PREAMBLE, '\\begin{document}', '\\pagestyle{empty}', '']

  out.push(`\\resumeName{${escapeLatex(basics.name)}}`, '\\vspace{2pt}', '')

  // Contact line: phone | mailto-email | location | links…
  const contact: string[] = []
  if (basics.phone) contact.push(escapeLatex(basics.phone))
  if (basics.email) contact.push(`\\href{mailto:${escapeLatexUrl(basics.email)}}{${escapeLatex(basics.email)}}`)
  if (basics.location) contact.push(escapeLatex(basics.location))
  for (const l of basics.links) contact.push(`\\href{${escapeLatexUrl(ensureHttp(l.url))}}{${escapeLatex(l.url)}}`)
  if (contact.length) {
    out.push(`{\\centering \\small ${contact.join(' \\hspace{6pt}|\\hspace{6pt} ')} \\par}`, '\\vspace{8pt}', '')
  }

  if (content.summary.trim()) {
    out.push('\\section{Professional Summary}', richText(content.summary), '')
  }

  if (content.experience.length) {
    out.push('\\section{Experience}', '')
    for (const e of content.experience) {
      out.push(`\\noindent\\textbf{${escapeLatex(e.company)}} \\hfill ${escapeLatex(e.date)} \\\\`)
      out.push(escapeLatex(e.title))
      const b = bullets(e.bullets)
      if (b) out.push(b)
      out.push('')
    }
  }

  if (content.projects.length) {
    out.push('\\section{Projects}', '')
    for (const p of content.projects) {
      const right = p.tagline ? ` \\hfill \\textit{${escapeLatex(p.tagline)}}` : ''
      out.push(`\\noindent\\textbf{${escapeLatex(p.name)}}${right} \\\\`)
      if (p.url) out.push(`\\href{${escapeLatexUrl(ensureHttp(p.url))}}{${escapeLatex(p.url)}}`)
      const b = bullets(p.bullets)
      if (b) out.push(b)
      out.push('')
    }
  }

  if (content.skills.length) {
    out.push('\\section{Skills}', '\\vspace{2pt}')
    for (const s of content.skills) {
      out.push(`\\noindent\\textbf{${escapeLatex(s.category)}:} ${s.items.map(escapeLatex).join(', ')} \\\\`)
    }
    out.push('')
  }

  if (content.education.length) {
    out.push('\\section{Education}', '')
    for (const e of content.education) {
      const period = e.period ? ` (${escapeLatex(e.period)})` : ''
      out.push(`\\noindent\\textbf{${escapeLatex(e.degree)},} ${escapeLatex(e.institution)}${period} \\\\`)
    }
    out.push('')
  }

  out.push('\\end{document}', '')
  return out.join('\n')
}
