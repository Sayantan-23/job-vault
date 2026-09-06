import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import * as pdfModule from '@/lib/document-pdf';
import * as apiClientModule from '@/lib/api-client';
import type { CoverLetter } from '@/types/cover-letter';
import { CoverLetterSheet } from './cover-letter-sheet';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/document-pdf', () => ({
  coverLetterToHtml: jest.fn().mockReturnValue('<html>Cover Letter</html>'),
  shareDocumentPdf: jest.fn().mockResolvedValue(undefined),
}));

const mockCoverLetter: CoverLetter = {
  id: 'cl-1',
  userId: 'u1',
  jobId: 'j1',
  title: 'Cover Letter for Acme',
  bodyMarkdown: '# Dear Hiring Team\n\nI am excited to apply for this role.',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  adhocJob: {
    title: 'Senior Engineer',
    company: 'Acme Corp',
  },
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

describe('CoverLetterSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cover letter title, job metadata, and body in edit mode', async () => {
    const onOpenChange = jest.fn();

    await render(
      withSafeArea(
        <CoverLetterSheet
          open={true}
          onOpenChange={onOpenChange}
          coverLetter={mockCoverLetter}
        />
      ),
      { wrapper: createWrapper() }
    );

    expect(screen.getByLabelText('Cover letter title')).toBeTruthy();
    expect(screen.getByText('Acme Corp — Senior Engineer')).toBeTruthy();
    expect(screen.getByDisplayValue(mockCoverLetter.bodyMarkdown)).toBeTruthy();
  });

  it('copies plain text to clipboard when Copy is clicked', async () => {
    await render(
      withSafeArea(
        <CoverLetterSheet
          open={true}
          onOpenChange={jest.fn()}
          coverLetter={mockCoverLetter}
        />
      ),
      { wrapper: createWrapper() }
    );

    const copyBtn = screen.getByLabelText('Copy plain text to clipboard');
    await fireEvent.press(copyBtn);

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalled();
    });
  });

  it('triggers PDF sharing when PDF is clicked', async () => {
    await render(
      withSafeArea(
        <CoverLetterSheet
          open={true}
          onOpenChange={jest.fn()}
          coverLetter={mockCoverLetter}
        />
      ),
      { wrapper: createWrapper() }
    );

    const pdfBtn = screen.getByLabelText('Share or download PDF');
    await fireEvent.press(pdfBtn);

    await waitFor(() => {
      expect(pdfModule.shareDocumentPdf).toHaveBeenCalledWith({
        title: mockCoverLetter.title,
        html: '<html>Cover Letter</html>',
      });
    });
  });

  it('saves edits when body is modified', async () => {
    const patchSpy = jest.spyOn(apiClientModule.apiClient, 'patch').mockResolvedValue({
      ...mockCoverLetter,
      bodyMarkdown: 'Updated markdown body',
    });

    await render(
      withSafeArea(
        <CoverLetterSheet
          open={true}
          onOpenChange={jest.fn()}
          coverLetter={mockCoverLetter}
        />
      ),
      { wrapper: createWrapper() }
    );

    const bodyInput = screen.getByLabelText('Cover letter body markdown');
    await fireEvent.changeText(bodyInput, 'Updated markdown body');

    const saveBtn = screen.getByLabelText('Save cover letter changes');
    expect(saveBtn).toBeTruthy();

    await fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/api/cover-letters/cl-1', {
        title: mockCoverLetter.title,
        bodyMarkdown: 'Updated markdown body',
      });
    });
  });

  it('allows switching to preview mode', async () => {
    await render(
      withSafeArea(
        <CoverLetterSheet
          open={true}
          onOpenChange={jest.fn()}
          coverLetter={mockCoverLetter}
        />
      ),
      { wrapper: createWrapper() }
    );

    const previewTab = screen.getByLabelText('Preview');
    await fireEvent.press(previewTab);

    await waitFor(() => {
      expect(screen.getByText(/Dear Hiring Team/)).toBeTruthy();
    });
  });
});
