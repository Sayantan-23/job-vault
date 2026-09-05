import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import type { Job } from '@/types/job';

import { JobDetailScreen } from './job-detail-screen';

// Mock the socket — the screen wires a realtime listener; the mock keeps it inert.
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
};
jest.mock('@/lib/socket', () => ({
  __esModule: true,
  connectSocket: jest.fn(() => mockSocket),
  disconnectSocket: jest.fn(),
}));

const mockUseJob = jest.fn();
const mockDeleteMutate = jest.fn();
const mockUpdateMutate = jest.fn();

jest.mock('@/hooks/use-jobs', () => ({
  __esModule: true,
  useJob: (id: string) => mockUseJob(id),
  useUpdateJob: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useDeleteJob: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useCreateJob: () => ({ mutate: jest.fn(), isPending: false }),
}));

const job: Job = {
  id: 'j1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  title: 'Senior Engineer',
  company: 'Acme',
  location: 'Remote',
  salaryRange: '$180k–$220k',
  sourceUrl: 'https://example.com/posting',
  snapshotMarkdown: '## About the role\n\nWe build things.',
  status: 'APPLIED',
  kanbanOrder: 0,
  lastActivityAt: null,
  ghostDays: 0,
  notes: 'Some notes.',
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseJob.mockReturnValue({ data: undefined, isLoading: true });
});

describe('JobDetailScreen', () => {
  it('renders the skeleton while the job loads', async () => {
    mockUseJob.mockReturnValue({ data: undefined, isLoading: true });
    await render(<JobDetailScreen id="j1" />, {
      wrapper: ({ children }) => <Wrapper>{withSafeArea(children)}</Wrapper>,
    });
    expect(screen.queryByText('Outreach')).toBeNull();
  });

  it('renders sections and SpeedDial FAB once the job loads', async () => {
    mockUseJob.mockReturnValue({ data: job, isLoading: false });
    await render(<JobDetailScreen id="j1" />, {
      wrapper: ({ children }) => <Wrapper>{withSafeArea(children)}</Wrapper>,
    });

    await waitFor(() =>
      expect(screen.getByText('Senior Engineer')).toBeTruthy(),
    );

    const headings = screen.getAllByText(
      /(Outreach|Snapshot|Reminders|Résumé|Cover letter|Timeline)/,
    );
    expect(headings).toHaveLength(6);

    expect(screen.getByText('Some notes.')).toBeTruthy();

    // SpeedDial FAB is present
    expect(screen.getByLabelText('Job actions')).toBeTruthy();

    // Realtime listener
    expect(mockSocket.on).toHaveBeenCalledWith(
      'job:updated',
      expect.any(Function),
    );
  });

  it('reveals Edit and Delete options when clicking SpeedDial FAB', async () => {
    mockUseJob.mockReturnValue({ data: job, isLoading: false });
    await render(<JobDetailScreen id="j1" />, {
      wrapper: ({ children }) => <Wrapper>{withSafeArea(children)}</Wrapper>,
    });

    await waitFor(() =>
      expect(screen.getByText('Senior Engineer')).toBeTruthy(),
    );

    // Click SpeedDial FAB
    await fireEvent.press(screen.getByLabelText('Job actions'));

    // Both action icons appear
    expect(screen.getByLabelText('Edit job')).toBeTruthy();
    expect(screen.getByLabelText('Delete job')).toBeTruthy();

    // Clicking Edit opens the EditJobSheet
    await fireEvent.press(screen.getByLabelText('Edit job'));
    expect(screen.getByText('Edit job')).toBeTruthy();
  });

  it('renders the empty state when the snapshot is missing', async () => {
    mockUseJob.mockReturnValue({ data: { ...job, snapshotMarkdown: null }, isLoading: false });
    await render(<JobDetailScreen id="j1" />, {
      wrapper: ({ children }) => <Wrapper>{withSafeArea(children)}</Wrapper>,
    });
    await waitFor(() =>
      expect(
        screen.getByText('No snapshot was captured for this job.'),
      ).toBeTruthy(),
    );
  });
});
