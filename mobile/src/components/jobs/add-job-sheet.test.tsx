import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import { AddJobSheet } from './add-job-sheet';

const mockScrapeMutate = jest.fn();
const mockCreateMutate = jest.fn();

jest.mock('@/hooks/use-jobs', () => ({
  __esModule: true,
  useScrapeJob: () => ({
    mutate: mockScrapeMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
  useCreateJob: () => ({
    mutate: mockCreateMutate,
    isPending: false,
    error: null,
  }),
  useUpdateJob: () => ({
    mutate: jest.fn(),
    isPending: false,
    error: null,
  }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{withSafeArea(children)}</QueryClientProvider>;
}

describe('AddJobSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with From URL tab active by default', async () => {
    await render(<AddJobSheet open={true} onOpenChange={jest.fn()} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('Add a job')).toBeTruthy();
    expect(screen.getByText('From URL')).toBeTruthy();
    expect(screen.getByText('Manual')).toBeTruthy();
    expect(screen.getByText('JOB POSTING URL')).toBeTruthy();
  });

  it('switches to Manual tab when pressing Manual option', async () => {
    await render(<AddJobSheet open={true} onOpenChange={jest.fn()} />, {
      wrapper: Wrapper,
    });

    const manualTab = screen.getByText('Manual');
    await fireEvent.press(manualTab);

    expect(screen.getByLabelText('Job title')).toBeTruthy();
    expect(screen.getByLabelText('Company')).toBeTruthy();
    expect(screen.getByText('Add job')).toBeTruthy();
  });

  it('calls onOpenChange(false) when close button is pressed', async () => {
    const onOpenChange = jest.fn();
    await render(<AddJobSheet open={true} onOpenChange={onOpenChange} />, {
      wrapper: Wrapper,
    });

    const closeButton = screen.getByLabelText('Close add job sheet');
    await fireEvent.press(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('transitions to Manual tab with prefilled values when scrape triggers manual switch', async () => {
    mockScrapeMutate.mockImplementation((url, options) => {
      options?.onSuccess?.({
        title: 'Senior Site Reliability Engineer',
        company: 'Vercel',
        location: 'Remote',
        salaryRange: '$190k - $220k',
        snapshotMarkdown: 'Edge infrastructure',
        status: 'ok',
      });
    });

    await render(<AddJobSheet open={true} onOpenChange={jest.fn()} />, {
      wrapper: Wrapper,
    });

    const input = screen.getByLabelText('Job posting URL');
    await fireEvent.changeText(input, 'https://vercel.com/careers/sre');

    const captureButton = screen.getByLabelText('Fetch job posting');
    await fireEvent.press(captureButton);

    const editDetailsButton = screen.getByLabelText('Edit details in manual form');
    await fireEvent.press(editDetailsButton);

    expect(screen.getByDisplayValue('Senior Site Reliability Engineer')).toBeTruthy();
    expect(screen.getByDisplayValue('Vercel')).toBeTruthy();
    expect(screen.getByDisplayValue('Remote')).toBeTruthy();
    expect(screen.getByDisplayValue('$190k - $220k')).toBeTruthy();
    expect(screen.getByDisplayValue('https://vercel.com/careers/sre')).toBeTruthy();
  });
});
