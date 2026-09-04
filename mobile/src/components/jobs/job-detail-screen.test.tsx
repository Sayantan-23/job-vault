import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import type { Job } from '@/types/job';

import { JobDetailScreen } from './job-detail-screen';

// Mock the socket — the screen wires a realtime listener; the mock keeps it inert.
// jest.mock factories may only reference variables prefixed with `mock`.
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

// Mock useJob so we can drive loading and loaded states without the network.
// jest.mock factories may only reference variables prefixed with `mock`.
const mockUseJob = jest.fn();
jest.mock('@/hooks/use-jobs', () => ({
  __esModule: true,
  useJob: (id: string) => mockUseJob(id),
  // The header calls useUpdateJob; a no-op mutation stub is enough for render.
  useUpdateJob: () => ({ mutate: jest.fn(), isPending: false }),
  // The footer calls useDeleteJob; same — a render stub.
  useDeleteJob: () => ({ mutate: jest.fn(), isPending: false }),
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
    // RouteProgress + Skeletons render — no section text yet.
    expect(screen.queryByText('Outreach')).toBeNull();
  });

  it('renders all eight sections in order once the job loads', async () => {
    mockUseJob.mockReturnValue({ data: job, isLoading: false });
    await render(<JobDetailScreen id="j1" />, {
      wrapper: ({ children }) => <Wrapper>{withSafeArea(children)}</Wrapper>,
    });

    // Wait for the header title to appear (the job has loaded).
    await waitFor(() =>
      expect(screen.getByText('Senior Engineer')).toBeTruthy(),
    );

    // Each section's heading text, in the corrected drawer order:
    // Header → Details → Outreach → Snapshot → Reminders → Résumé →
    // Cover letter → Timeline → Delete footer.
    const headings = screen.getAllByText(
      /(Outreach|Snapshot|Reminders|Résumé|Cover letter|Timeline)/,
    );
    expect(headings).toHaveLength(6);

    // The notes (Details section) and the Delete button (footer) are present.
    expect(screen.getByText('Some notes.')).toBeTruthy();
    expect(screen.getByLabelText('Delete job')).toBeTruthy();

    // And the realtime listener was wired against job:updated.
    expect(mockSocket.on).toHaveBeenCalledWith(
      'job:updated',
      expect.any(Function),
    );
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
