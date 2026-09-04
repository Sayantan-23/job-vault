import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as apiClientModule from '@/lib/api-client';
import type { Job } from '@/types/job';

import { JobDetailFooter } from './job-detail-footer';

jest.mock('expo-router', () => {
  const navigate = jest.fn();
  return { useRouter: () => ({ navigate }) };
});

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  apiClient: { delete: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

const apiClient = apiClientModule.apiClient as jest.Mocked<
  typeof apiClientModule.apiClient
>;

const job: Job = {
  id: 'j1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  title: 'Engineer',
  company: 'Acme',
  location: null,
  salaryRange: null,
  sourceUrl: null,
  snapshotMarkdown: null,
  status: 'APPLIED',
  kanbanOrder: 0,
  lastActivityAt: null,
  ghostDays: 0,
  notes: null,
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('JobDetailFooter', () => {
  it('opens the confirm dialog and deletes on confirm', async () => {
    apiClient.delete.mockResolvedValue({ message: 'deleted' });
    const { useRouter } = require('expo-router');
    const router = useRouter();

    await render(<JobDetailFooter job={job} />, { wrapper: Wrapper });

    await fireEvent.press(screen.getByLabelText('Delete job'));
    expect(screen.getByText('Delete job?')).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByText('Delete'));
    });

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/api/jobs/j1'));
    expect(router.navigate).toHaveBeenCalledWith('/');
  });

  it('cancels without deleting', async () => {
    apiClient.delete.mockResolvedValue({ message: 'deleted' });
    const { useRouter } = require('expo-router');
    const router = useRouter();

    await render(<JobDetailFooter job={job} />, { wrapper: Wrapper });

    await fireEvent.press(screen.getByLabelText('Delete job'));
    await act(async () => {
      await fireEvent.press(screen.getByText('Cancel'));
    });

    expect(apiClient.delete).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
