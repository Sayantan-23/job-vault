import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { coverLetterToHtml, resumeToHtml, shareDocumentPdf } from './document-pdf';
import type { GeneratedResume } from '@/types/resume';

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///tmp/generated.pdf' }),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('coverLetterToHtml', () => {
  it('generates HTML containing formatted paragraphs and links', () => {
    const html = coverLetterToHtml({
      title: 'Acme Software Engineer Cover Letter',
      bodyMarkdown:
        'Dear **Hiring Team**,\n\nI am thrilled to apply for this role at [Acme Corp](https://acme.corp).\n\nBest regards,\nJane',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Acme Software Engineer Cover Letter');
    expect(html).toContain('<strong>Hiring Team</strong>');
    expect(html).toContain('<a href="https://acme.corp"');
    expect(html).toContain('Best regards,<br />Jane');
  });
});

describe('resumeToHtml', () => {
  const sampleResume: GeneratedResume = {
    id: 'res-1',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    userId: 'user-1',
    personaId: 'pers-1',
    jobId: null,
    title: 'Senior Developer Resume',
    instructions: null,
    content: {
      basics: {
        name: 'Jordan Avery',
        email: 'jordan@example.com',
        phone: '+1 555-0199',
        location: 'Seattle, WA',
        links: [{ label: 'GitHub', url: 'https://github.com/jordanavery' }],
      },
      summary: 'Staff-level engineer with expertise in **distributed systems**.',
      experience: [
        {
          company: 'Cloud Corp',
          title: 'Lead Architect',
          date: '2021 - Present',
          bullets: ['Architected low-latency caching tier', 'Mentored **12 engineers**'],
        },
      ],
      projects: [
        {
          name: 'VaultFS',
          tagline: 'Encrypted storage engine',
          url: 'https://vaultfs.dev',
          bullets: ['Zero-knowledge client encryption'],
        },
      ],
      skills: [
        {
          category: 'Core',
          items: ['Go', 'TypeScript', 'PostgreSQL'],
        },
      ],
      education: [
        {
          institution: 'University of Washington',
          degree: 'B.S. in Computer Science',
          period: '2015 - 2019',
        },
      ],
    },
  };

  it('generates structured HTML with all sections', () => {
    const html = resumeToHtml(sampleResume);

    expect(html).toContain('Jordan Avery');
    expect(html).toContain('jordan@example.com');
    expect(html).toContain('Professional Summary');
    expect(html).toContain('<strong>distributed systems</strong>');
    expect(html).toContain('Experience');
    expect(html).toContain('Cloud Corp');
    expect(html).toContain('Lead Architect');
    expect(html).toContain('Projects');
    expect(html).toContain('VaultFS');
    expect(html).toContain('Skills');
    expect(html).toContain('Go, TypeScript, PostgreSQL');
    expect(html).toContain('Education');
    expect(html).toContain('University of Washington');
  });
});

describe('shareDocumentPdf', () => {
  it('calls printToFileAsync and shareAsync with generated PDF uri', async () => {
    await shareDocumentPdf({
      title: 'My Resume',
      html: '<h1>My Resume</h1>',
    });

    expect(Print.printToFileAsync).toHaveBeenCalledWith({
      html: '<h1>My Resume</h1>',
    });
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/generated.pdf', {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'My Resume',
    });
  });
});
