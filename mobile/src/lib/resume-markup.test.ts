import { splitBold, stripBold, resumeToPlainText } from './resume-markup';
import type { ResumeContent } from '@/types/resume';

describe('splitBold', () => {
  it('splits plain text with bold runs', () => {
    expect(splitBold('Hello **world**!')).toEqual([
      { text: 'Hello ', bold: false },
      { text: 'world', bold: true },
      { text: '!', bold: false },
    ]);
  });

  it('handles text starting with bold', () => {
    expect(splitBold('**Important**: note')).toEqual([
      { text: 'Important', bold: true },
      { text: ': note', bold: false },
    ]);
  });
});

describe('stripBold', () => {
  it('strips all asterisks', () => {
    expect(stripBold('**Hello** **world**')).toBe('Hello world');
  });
});

describe('resumeToPlainText', () => {
  const content: ResumeContent = {
    basics: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1 555-0100',
      location: 'New York, NY',
      links: [{ label: 'GitHub', url: 'https://github.com/janedoe' }],
    },
    summary: 'Experienced **software engineer** building scalable systems.',
    experience: [
      {
        company: 'Acme Corp',
        title: 'Senior Engineer',
        date: '2022 - Present',
        bullets: ['Led migration of **database**', 'Improved performance by 40%'],
      },
    ],
    projects: [
      {
        name: 'JobVault',
        tagline: 'Career companion',
        url: 'https://jobvault.app',
        bullets: ['Built with React Native'],
      },
    ],
    skills: [
      {
        category: 'Languages',
        items: ['TypeScript', 'Python', 'Go'],
      },
    ],
    education: [
      {
        institution: 'State University',
        degree: 'B.S. Computer Science',
        period: '2016 - 2020',
      },
    ],
  };

  it('generates well-formatted plain text representation', () => {
    const text = resumeToPlainText(content);
    expect(text).toContain('JANE DOE');
    expect(text).toContain('jane@example.com | +1 555-0100 | New York, NY | GitHub: https://github.com/janedoe');
    expect(text).toContain('PROFESSIONAL SUMMARY');
    expect(text).toContain('Experienced software engineer building scalable systems.');
    expect(text).toContain('EXPERIENCE');
    expect(text).toContain('Senior Engineer | Acme Corp (2022 - Present)');
    expect(text).toContain('  • Led migration of database');
    expect(text).toContain('PROJECTS');
    expect(text).toContain('JobVault — Career companion (https://jobvault.app)');
    expect(text).toContain('SKILLS');
    expect(text).toContain('Languages: TypeScript, Python, Go');
    expect(text).toContain('EDUCATION');
    expect(text).toContain('B.S. Computer Science — State University (2016 - 2020)');
  });
});
