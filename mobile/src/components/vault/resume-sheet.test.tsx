import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';

import { withSafeArea } from '@/components/ui/test-safe-area';
import { shareDocumentPdf } from '@/lib/document-pdf';
import { useDeleteResume } from '@/hooks/use-resumes';
import type { GeneratedResume } from '@/types/resume';
import { ResumeSheet } from './resume-sheet';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/lib/document-pdf', () => ({
  resumeToHtml: jest.fn().mockReturnValue('<html>Resume</html>'),
  shareDocumentPdf: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/hooks/use-resumes', () => ({
  useDeleteResume: jest.fn(),
}));

const mockResume: GeneratedResume = {
  id: 'res-101',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  personaId: 'p1',
  jobId: 'job-1',
  title: 'Lead Architect Résumé',
  instructions: null,
  content: {
    basics: {
      name: 'Jordan Avery',
      phone: '+1 555-0199',
      email: 'jordan@example.com',
      location: 'San Francisco, CA',
      links: [{ label: 'Portfolio', url: 'https://jordanavery.dev' }],
    },
    summary: 'Senior systems architect with deep distributed databases expertise.',
    experience: [
      {
        company: 'CloudScale',
        title: 'Principal Engineer',
        date: '2021 – Present',
        bullets: ['Architected low-latency caching engine', 'Scaled queries across 50 nodes'],
      },
    ],
    projects: [
      {
        name: 'CacheLayer',
        tagline: 'High throughput memory store',
        url: 'https://github.com/jordanavery/cachelayer',
        bullets: ['Open-source Go library'],
      },
    ],
    skills: [
      {
        category: 'Backend',
        items: ['Go', 'TypeScript', 'Distributed Systems'],
      },
    ],
    education: [
      {
        institution: 'Stanford University',
        degree: 'M.S. Computer Science',
        period: '2015 – 2017',
      },
    ],
  },
};

describe('ResumeSheet', () => {
  let mockMutateAsync: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync = jest.fn().mockResolvedValue(undefined);
    (useDeleteResume as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  it('renders structured resume content and coming soon indicator', async () => {
    const onOpenChange = jest.fn();
    await render(
      withSafeArea(
        <ResumeSheet open={true} onOpenChange={onOpenChange} resume={mockResume} />
      )
    );

    expect(screen.getByText('Lead Architect Résumé')).toBeTruthy();
    expect(screen.getByText('Jordan Avery')).toBeTruthy();
    expect(screen.getByText('+1 555-0199')).toBeTruthy();
    expect(screen.getByText('jordan@example.com')).toBeTruthy();
    expect(screen.getByText('San Francisco, CA')).toBeTruthy();
    expect(screen.getByText('Portfolio')).toBeTruthy();
    expect(screen.getByText(/Principal Engineer/)).toBeTruthy();
    expect(screen.getByText(/CloudScale/)).toBeTruthy();
    expect(screen.getByText(/CacheLayer/)).toBeTruthy();
    expect(screen.getByText('Distributed Systems')).toBeTruthy();
    expect(screen.getByText('Stanford University')).toBeTruthy();
    expect(screen.getByText('Editing & Generation coming soon to mobile')).toBeTruthy();
  });

  it('copies plain text to clipboard when Copy text is pressed', async () => {
    const onOpenChange = jest.fn();
    await render(
      withSafeArea(
        <ResumeSheet open={true} onOpenChange={onOpenChange} resume={mockResume} />
      )
    );

    const copyBtn = screen.getByText('Copy text');
    fireEvent.press(copyBtn);

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalled();
      expect(screen.getByText('Copied')).toBeTruthy();
    });
  });

  it('generates on-device PDF and triggers share when Share PDF is pressed', async () => {
    const onOpenChange = jest.fn();
    await render(
      withSafeArea(
        <ResumeSheet open={true} onOpenChange={onOpenChange} resume={mockResume} />
      )
    );

    const shareBtn = screen.getByText('Share PDF');
    fireEvent.press(shareBtn);

    await waitFor(() => {
      expect(shareDocumentPdf).toHaveBeenCalledWith({
        title: 'Lead Architect Résumé',
        html: '<html>Resume</html>',
      });
    });
  });

  it('triggers delete flow when delete button and confirm dialog are pressed', async () => {
    const onOpenChange = jest.fn();
    const onDeleted = jest.fn();
    await render(
      withSafeArea(
        <ResumeSheet
          open={true}
          onOpenChange={onOpenChange}
          resume={mockResume}
          onDeleted={onDeleted}
        />
      )
    );

    // Press delete button
    fireEvent.press(screen.getByLabelText('Delete résumé'));

    // Confirm dialog should become visible
    await waitFor(() => {
      expect(screen.getByText('Delete résumé?')).toBeTruthy();
    });

    // Confirm delete
    fireEvent.press(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('res-101');
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onDeleted).toHaveBeenCalled();
    });
  });
});
