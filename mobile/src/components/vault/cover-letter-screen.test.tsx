import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import * as pdfModule from '@/lib/document-pdf';
import * as apiClientModule from '@/lib/api-client';
import type { CoverLetter } from '@/types/cover-letter';
import { CoverLetterScreen } from './cover-letter-screen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
  }),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/document-pdf', () => ({
  coverLetterToHtml: jest.fn().mockReturnValue('<html>Cover Letter</html>'),
  shareDocumentPdf: jest.fn().mockResolvedValue(undefined),
  downloadDocumentPdf: jest.fn().mockResolvedValue({ uri: 'file:///letter.pdf' }),
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

describe('CoverLetterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, adhoc job badge, and body markdown', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockCoverLetter);

    await render(withSafeArea(<CoverLetterScreen id="cl-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText(`Rename cover letter: ${mockCoverLetter.title}`)).toBeTruthy();
      expect(screen.getByText('Acme Corp — Senior Engineer')).toBeTruthy();
      expect(screen.getByDisplayValue(mockCoverLetter.bodyMarkdown)).toBeTruthy();
    });
  });

  it('renames cover letter using RenameDialog', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockCoverLetter);
    const patchSpy = jest.spyOn(apiClientModule.apiClient, 'patch').mockResolvedValue({
      ...mockCoverLetter,
      title: 'Renamed Letter',
    });

    await render(withSafeArea(<CoverLetterScreen id="cl-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText(`Rename cover letter: ${mockCoverLetter.title}`)).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText(`Rename cover letter: ${mockCoverLetter.title}`));

    expect(screen.getByText('Rename Cover Letter')).toBeTruthy();
    const renameInput = screen.getByLabelText('Document name input');
    await fireEvent.changeText(renameInput, 'Renamed Letter');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/api/cover-letters/cl-1', {
        title: 'Renamed Letter',
        bodyMarkdown: mockCoverLetter.bodyMarkdown,
      });
    });
  });

  it('copies plain text to clipboard via FAB', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockCoverLetter);

    await render(withSafeArea(<CoverLetterScreen id="cl-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Document actions')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Document actions'));
    const copyBtn = screen.getByLabelText('Copy plain text to clipboard');
    await fireEvent.press(copyBtn);

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalled();
    });
  });

  it('shares PDF via FAB', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockCoverLetter);

    await render(withSafeArea(<CoverLetterScreen id="cl-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Document actions')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Document actions'));
    const shareBtn = screen.getByLabelText('Share PDF');
    await fireEvent.press(shareBtn);

    await waitFor(() => {
      expect(pdfModule.shareDocumentPdf).toHaveBeenCalledWith({
        title: mockCoverLetter.title,
        html: '<html>Cover Letter</html>',
      });
    });
  });

  it('downloads PDF via FAB', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockCoverLetter);

    await render(withSafeArea(<CoverLetterScreen id="cl-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Document actions')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Document actions'));
    const downloadBtn = screen.getByLabelText('Download PDF');
    await fireEvent.press(downloadBtn);

    await waitFor(() => {
      expect(pdfModule.downloadDocumentPdf).toHaveBeenCalledWith({
        title: mockCoverLetter.title,
        html: '<html>Cover Letter</html>',
      });
    });
  });

  it('saves modifications on Save click', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockCoverLetter);
    const patchSpy = jest.spyOn(apiClientModule.apiClient, 'patch').mockResolvedValue({
      ...mockCoverLetter,
      bodyMarkdown: 'Updated cover letter text',
    });

    await render(withSafeArea(<CoverLetterScreen id="cl-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Cover letter body markdown')).toBeTruthy();
    });

    const bodyInput = screen.getByLabelText('Cover letter body markdown');
    await fireEvent.changeText(bodyInput, 'Updated cover letter text');

    const saveBtn = screen.getByLabelText('Save cover letter changes');
    expect(saveBtn).toBeTruthy();

    await fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/api/cover-letters/cl-1', {
        title: mockCoverLetter.title,
        bodyMarkdown: 'Updated cover letter text',
      });
    });
  });

  it('navigates back when Back button is pressed', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockCoverLetter);

    await render(withSafeArea(<CoverLetterScreen id="cl-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Back to Vault')).toBeTruthy();
    });

    const backBtn = screen.getByLabelText('Back to Vault');
    await fireEvent.press(backBtn);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
