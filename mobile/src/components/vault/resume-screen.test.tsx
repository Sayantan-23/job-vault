import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import * as pdfModule from '@/lib/document-pdf';
import * as apiClientModule from '@/lib/api-client';
import type { GeneratedResume } from '@/types/resume';
import { ResumeScreen } from './resume-screen';

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

jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    WebView: (props: any) => <View testID="mock-webview" {...props} />,
  };
});

jest.mock('@/lib/document-pdf', () => ({
  resumeToHtml: jest.fn().mockReturnValue('<html>Resume</html>'),
  shareDocumentPdf: jest.fn().mockResolvedValue(undefined),
  downloadDocumentPdf: jest.fn().mockResolvedValue({ uri: 'file:///res.pdf' }),
}));

const mockResume: GeneratedResume = {
  id: 'res-1',
  userId: 'u1',
  personaId: 'p1',
  jobId: 'j1',
  title: 'Fullstack Résumé',
  instructions: null,
  content: {
    basics: {
      name: 'Alex Developer',
      email: 'alex@example.com',
      phone: undefined,
      location: undefined,
      links: [],
    },
    summary: 'Experienced fullstack developer.',
    experience: [
      {
        title: 'Staff Engineer',
        company: 'Acme Corp',
        date: '2022 - Present',
        bullets: ['Architected cloud platform.'],
      },
    ],
    projects: [],
    skills: [
      {
        category: 'Languages',
        items: ['TypeScript', 'Go'],
      },
    ],
    education: [
      {
        degree: 'B.S. Computer Science',
        institution: 'University',
      },
    ],
  },
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('ResumeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders resume title, candidate name, and document webview with generated HTML', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResume);

    await render(withSafeArea(<ResumeScreen id="res-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText(`Rename résumé: ${mockResume.title}`)).toBeTruthy();
      expect(screen.getAllByText('Alex Developer').length).toBeGreaterThan(0);
      expect(screen.getByTestId('mock-webview')).toBeTruthy();
      expect(pdfModule.resumeToHtml).toHaveBeenCalledWith(mockResume);
    });
  });

  it('renames resume using RenameDialog', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResume);
    const patchSpy = jest.spyOn(apiClientModule.apiClient, 'patch').mockResolvedValue({
      ...mockResume,
      title: 'Renamed Résumé',
    });

    await render(withSafeArea(<ResumeScreen id="res-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText(`Rename résumé: ${mockResume.title}`)).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText(`Rename résumé: ${mockResume.title}`));

    expect(screen.getByText('Rename Résumé')).toBeTruthy();
    const renameInput = screen.getByLabelText('Document name input');
    await fireEvent.changeText(renameInput, 'Renamed Résumé');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/api/resumes/res-1', {
        title: 'Renamed Résumé',
      });
    });
  });

  it('copies plain text to clipboard via FAB', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResume);

    await render(withSafeArea(<ResumeScreen id="res-1" />), { wrapper: createWrapper() });

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
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResume);

    await render(withSafeArea(<ResumeScreen id="res-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Document actions')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Document actions'));
    const shareBtn = screen.getByLabelText('Share PDF');
    await fireEvent.press(shareBtn);

    await waitFor(() => {
      expect(pdfModule.shareDocumentPdf).toHaveBeenCalledWith({
        title: 'Fullstack Résumé',
        html: '<html>Resume</html>',
      });
    });
  });

  it('downloads PDF via FAB', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResume);

    await render(withSafeArea(<ResumeScreen id="res-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Document actions')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Document actions'));
    const downloadBtn = screen.getByLabelText('Download PDF');
    await fireEvent.press(downloadBtn);

    await waitFor(() => {
      expect(pdfModule.downloadDocumentPdf).toHaveBeenCalledWith({
        title: 'Fullstack Résumé',
        html: '<html>Resume</html>',
      });
    });
  });

  it('navigates back when Back button is pressed', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResume);

    await render(withSafeArea(<ResumeScreen id="res-1" />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Back to Vault')).toBeTruthy();
    });

    const backBtn = screen.getByLabelText('Back to Vault');
    await fireEvent.press(backBtn);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
