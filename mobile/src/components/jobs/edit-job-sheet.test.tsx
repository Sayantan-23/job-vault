import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import type { Job } from '@/types/job';
import { EditJobSheet } from './edit-job-sheet';

const mockUpdateMutate = jest.fn();
const mockCreateMutate = jest.fn();

jest.mock('@/hooks/use-jobs', () => ({
  __esModule: true,
  useUpdateJob: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
    error: null,
  }),
  useCreateJob: () => ({
    mutate: mockCreateMutate,
    isPending: false,
    error: null,
  }),
}));

const mockJob: Job = {
  id: 'j1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  title: 'Staff Frontend Engineer',
  company: 'Stripe',
  location: 'Remote (US)',
  salaryRange: '$200k - $250k',
  sourceUrl: 'https://stripe.com/jobs/123',
  snapshotMarkdown: null,
  status: 'WISHLIST',
  kanbanOrder: 0,
  lastActivityAt: null,
  ghostDays: 0,
  notes: 'Referred by Priya',
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{withSafeArea(children)}</QueryClientProvider>;
}

describe('EditJobSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pre-fills fields when editing an existing job', async () => {
    await render(<EditJobSheet open={true} onOpenChange={jest.fn()} job={mockJob} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('Edit job')).toBeTruthy();
    expect(screen.getByDisplayValue('Staff Frontend Engineer')).toBeTruthy();
    expect(screen.getByDisplayValue('Stripe')).toBeTruthy();
    expect(screen.getByDisplayValue('Remote (US)')).toBeTruthy();
    expect(screen.getByDisplayValue('$200k - $250k')).toBeTruthy();
    expect(screen.getByDisplayValue('https://stripe.com/jobs/123')).toBeTruthy();
    expect(screen.getByDisplayValue('Referred by Priya')).toBeTruthy();
  });

  it('submits updated values on save', async () => {
    const onOpenChange = jest.fn();
    mockUpdateMutate.mockImplementation((vals, options) => {
      options?.onSuccess?.();
    });

    await render(<EditJobSheet open={true} onOpenChange={onOpenChange} job={mockJob} />, {
      wrapper: Wrapper,
    });

    const titleInput = screen.getByDisplayValue('Staff Frontend Engineer');
    await fireEvent.changeText(titleInput, 'Principal Frontend Engineer');

    const saveButton = screen.getByText('Save changes');
    await fireEvent.press(saveButton);

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Principal Frontend Engineer',
        company: 'Stripe',
        location: 'Remote (US)',
      }),
      expect.any(Object)
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('creates new job when job is null', async () => {
    const onOpenChange = jest.fn();
    mockCreateMutate.mockImplementation((vals, options) => {
      options?.onSuccess?.();
    });

    await render(<EditJobSheet open={true} onOpenChange={onOpenChange} job={null} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('New job')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Job title'), 'Backend Engineer');
    await fireEvent.changeText(screen.getByLabelText('Company'), 'Linear');

    const addButton = screen.getByText('Add job');
    await fireEvent.press(addButton);

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Backend Engineer',
        company: 'Linear',
      }),
      expect.any(Object)
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
