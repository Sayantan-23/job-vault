export interface TextRun {
  text: string
  bold: boolean
}

/** Split text into runs on **bold** markup (assumes balanced **). */
export function splitBold(s: string): TextRun[] {
  return s
    .split('**')
    .map((text, i) => ({ text, bold: i % 2 === 1 }))
    .filter((r) => r.text.length > 0)
}
