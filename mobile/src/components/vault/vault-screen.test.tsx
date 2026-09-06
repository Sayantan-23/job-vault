import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import * as apiClientModule from '@/lib/api-client';
import type { CoverLetter } from '@/types/cover-letter';
import type { GeneratedResume } from '@/types/resume';
import { VaultScreen } from './vault-screen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
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
    summary: 'Experienced developer.',
    experience: [],
    projects: [],
    skills: [],
    education: [],
  },
  createdAt: '2026-09-02T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
};

const mockCoverLetter: CoverLetter = {
  id: 'cl-1',
  userId: 'u1',
  jobId: 'j1',
  title: 'Cover Letter for Acme',
  bodyMarkdown: '# Dear Hiring Team\n\nI am excited to apply.',
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

describe('VaultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders unified feed with filter pills and navigates on row press', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockImplementation(async (path: string) => {
      if (path.includes('/api/resumes')) return [mockResume];
      if (path.includes('/api/cover-letters')) return [mockCoverLetter];
      if (path.includes('/api/jobs')) return [{ id: 'j1', title: 'Senior Engineer', company: 'Acme Corp' }];
      if (path.includes('/api/personas')) return [{ id: 'p1', name: 'Software Engineer' }];
      if (path.includes('/api/ai/status')) return { enabled: true };
      return [];
    });

    await render(withSafeArea(<VaultScreen />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Vault')).toBeTruthy();
      expect(screen.getByText('All (2)')).toBeTruthy();
      expect(screen.getByText('Résumés (1)')).toBeTruthy();
      expect(screen.getByText('Cover Letters (1)')).toBeTruthy();
      expect(screen.getByText('Fullstack Résumé')).toBeTruthy();
      expect(screen.getByText('Cover Letter for Acme')).toBeTruthy();
    });

    // Pressing résumé row pushes to dedicated résumé screen
    const resumeRow = screen.getByLabelText('Résumé: Fullstack Résumé');
    await fireEvent.press(resumeRow);
    expect(mockPush).toHaveBeenCalledWith('/vault/resume/res-1');

    // Pressing cover letter row pushes to dedicated cover letter screen
    const letterRow = screen.getByLabelText('Cover letter: Cover Letter for Acme');
    await fireEvent.press(letterRow);
    expect(mockPush).toHaveBeenCalledWith('/vault/cover-letter/cl-1');
  });

  it('filters rows when native filter pills are pressed', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockImplementation(async (path: string) => {
      if (path.includes('/api/resumes')) return [mockResume];
      if (path.includes('/api/cover-letters')) return [mockCoverLetter];
      if (path.includes('/api/jobs')) return [{ id: 'j1', title: 'Senior Engineer', company: 'Acme Corp' }];
      if (path.includes('/api/personas')) return [{ id: 'p1', name: 'Software Engineer' }];
      if (path.includes('/api/ai/status')) return { enabled: true };
      return [];
    });

    await render(withSafeArea(<VaultScreen />), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Fullstack Résumé')).toBeTruthy();
      expect(screen.getByText('Cover Letter for Acme')).toBeTruthy();
    });

    // Filter to Résumés only
    const resumesPill = screen.getByLabelText('Filter résumés');
    await fireEvent.press(resumesPill);

    await waitFor(() => {
      expect(screen.getByText('Fullstack Résumé')).toBeTruthy();
      expect(screen.queryByText('Cover Letter for Acme')).toBeNull();
    });

    // Filter to Cover Letters only
    const lettersPill = screen.getByLabelText('Filter cover letters');
    await fireEvent.press(lettersPill);

    await waitFor(() => {
      expect(screen.getByText('Cover Letter for Acme')).toBeTruthy();
      expect(screen.queryByText('Fullstack Résumé')).toBeNull();
    });
  });
});
