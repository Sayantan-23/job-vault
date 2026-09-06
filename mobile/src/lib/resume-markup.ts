import type { ResumeContent } from '@/types/resume';

export interface TextRun {
  text: string;
  bold: boolean;
}

/** Split text into runs on **bold** markup (assumes balanced **). */
export function splitBold(s: string): TextRun[] {
  return s
    .split('**')
    .map((text, i) => ({ text, bold: i % 2 === 1 }))
    .filter((r) => r.text.length > 0);
}

/** Strips bold markers from text */
export function stripBold(s: string): string {
  return s.replace(/\*\*/g, '');
}

/** Convert structured resume content into clean plain text for clipboard copying */
export function resumeToPlainText(content: ResumeContent): string {
  const parts: string[] = [];

  // Basics
  const { basics } = content;
  parts.push(basics.name.toUpperCase());
  const contact: string[] = [];
  if (basics.email) contact.push(basics.email);
  if (basics.phone) contact.push(basics.phone);
  if (basics.location) contact.push(basics.location);
  basics.links.forEach((l) => contact.push(`${l.label ? `${l.label}: ` : ''}${l.url}`));
  if (contact.length > 0) {
    parts.push(contact.join(' | '));
  }

  // Summary
  if (content.summary.trim()) {
    parts.push('\nPROFESSIONAL SUMMARY\n' + stripBold(content.summary.trim()));
  }

  // Experience
  if (content.experience.length > 0) {
    const expLines: string[] = ['\nEXPERIENCE'];
    content.experience.forEach((exp) => {
      expLines.push(`\n${exp.title} | ${exp.company} (${exp.date})`);
      exp.bullets.forEach((b) => expLines.push(`  • ${stripBold(b)}`));
    });
    parts.push(expLines.join('\n'));
  }

  // Projects
  if (content.projects.length > 0) {
    const projLines: string[] = ['\nPROJECTS'];
    content.projects.forEach((proj) => {
      const header = proj.tagline ? `${proj.name} — ${proj.tagline}` : proj.name;
      const urlPart = proj.url ? ` (${proj.url})` : '';
      projLines.push(`\n${header}${urlPart}`);
      proj.bullets.forEach((b) => projLines.push(`  • ${stripBold(b)}`));
    });
    parts.push(projLines.join('\n'));
  }

  // Skills
  if (content.skills.length > 0) {
    const skillLines: string[] = ['\nSKILLS'];
    content.skills.forEach((g) => {
      skillLines.push(`${g.category}: ${g.items.join(', ')}`);
    });
    parts.push(skillLines.join('\n'));
  }

  // Education
  if (content.education.length > 0) {
    const eduLines: string[] = ['\nEDUCATION'];
    content.education.forEach((edu) => {
      const period = edu.period ? ` (${edu.period})` : '';
      eduLines.push(`${edu.degree} — ${edu.institution}${period}`);
    });
    parts.push(eduLines.join('\n'));
  }

  return parts.join('\n\n');
}
