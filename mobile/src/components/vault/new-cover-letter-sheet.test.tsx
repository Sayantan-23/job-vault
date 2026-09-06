import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import * as apiClientModule from '@/lib/api-client';
import type { CoverLetter } from '@/types/cover-letter';
import type { Persona } from '@/types/persona';
import type { Job } from '@/types/job';
import { NewCoverLetterSheet } from './new-cover-letter-sheet';

const mockPersonas: Partial<Persona>[] = [
  { id: 'p1', name: 'Software Engineer' },
  { id: 'p2', name: 'Tech Lead' },
];

const mockJobs: Partial<Job>[] = [
  { id: 'j1', title: 'Fullstack Dev', company: 'Acme Inc' },
];

const createdLetter: CoverLetter = {
  id: 'cl-new',
  userId: 'u1',
  jobId: 'j1',
  title: 'Cover Letter for Acme Inc',
  bodyMarkdown: 'Generated letter content',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  adhocJob: null,
  personaId: 'p1',
  instructions: null,
};

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('NewCoverLetterSheet', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('generates cover letter with tracked job', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockImplementation(async (path: string) => {
      if (path.includes('/api/personas')) return mockPersonas;
      if (path.includes('/api/jobs')) return mockJobs;
      if (path.includes('/api/ai/status')) return { enabled: true };
      return [];
    });

    const postSpy = jest
      .spyOn(apiClientModule.apiClient, 'post')
      .mockResolvedValue(createdLetter);

    const onGenerated = jest.fn();
    const onOpenChange = jest.fn();

    await render(
      withSafeArea(
        <NewCoverLetterSheet
          open={true}
          onOpenChange={onOpenChange}
          initialJobId="j1"
          onGenerated={onGenerated}
        />
      ),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Select Persona')).toBeTruthy();
    });

    const generateBtn = screen.getByLabelText('Generate cover letter');
    expect(generateBtn).toBeTruthy();

    await fireEvent.press(generateBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/api/cover-letters', {
        personaId: 'p1',
        jobId: 'j1',
      });
      expect(onGenerated).toHaveBeenCalledWith(createdLetter);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('generates cover letter with pasted job description', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockImplementation(async (path: string) => {
      if (path.includes('/api/personas')) return mockPersonas;
      if (path.includes('/api/jobs')) return mockJobs;
      if (path.includes('/api/ai/status')) return { enabled: true };
      return [];
    });

    const postSpy = jest
      .spyOn(apiClientModule.apiClient, 'post')
      .mockResolvedValue(createdLetter);

    const onGenerated = jest.fn();
    const onOpenChange = jest.fn();

    await render(
      withSafeArea(
        <NewCoverLetterSheet
          open={true}
          onOpenChange={onOpenChange}
          onGenerated={onGenerated}
        />
      ),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Select Persona')).toBeTruthy();
    });

    // Switch to Paste JD
    const pasteTab = screen.getByLabelText('Paste JD');
    await fireEvent.press(pasteTab);

    // Enter title & company
    const titleInput = screen.getByLabelText('Job title');
    const companyInput = screen.getByLabelText('Company name');
    const instructionsInput = screen.getByLabelText('Generation instructions');

    await fireEvent.changeText(titleInput, 'Staff Engineer');
    await fireEvent.changeText(companyInput, 'Stripe');
    await fireEvent.changeText(instructionsInput, 'Focus on distributed systems');

    const generateBtn = screen.getByLabelText('Generate cover letter');
    await fireEvent.press(generateBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/api/cover-letters', {
        personaId: 'p1',
        job: {
          title: 'Staff Engineer',
          company: 'Stripe',
        },
        instructions: 'Focus on distributed systems',
      });
    });
  });
});
