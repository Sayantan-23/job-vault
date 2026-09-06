import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import * as apiClientModule from '@/lib/api-client';
import type { CoverLetter } from '@/types/cover-letter';
import { CoverLetterLauncher } from './cover-letter-launcher';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

const mockLetter: CoverLetter = {
  id: 'cl-j1',
  userId: 'u1',
  jobId: 'j1',
  title: 'Cover Letter for Acme',
  bodyMarkdown: 'Letter content',
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

describe('CoverLetterLauncher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders generate prompt when no cover letters exist for this job', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue([]);

    await render(withSafeArea(<CoverLetterLauncher jobId="j1" />), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Generate tailored cover letter')).toBeTruthy();
    });
  });

  it('renders existing letters when available and navigates to screen on press', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockImplementation(async (path: string) => {
      if (path.includes('/api/cover-letters')) return [mockLetter];
      return [];
    });

    await render(withSafeArea(<CoverLetterLauncher jobId="j1" />), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText('Cover Letter for Acme')).toBeTruthy();
    });

    const openBtn = screen.getByLabelText('Open cover letter: Cover Letter for Acme');
    await fireEvent.press(openBtn);

    expect(mockPush).toHaveBeenCalledWith('/vault/cover-letter/cl-j1');
  });
});
