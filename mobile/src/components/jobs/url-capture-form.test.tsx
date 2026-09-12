import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import { UrlCaptureForm } from './url-capture-form';

const mockScrapeMutate = jest.fn();
const mockCreateMutate = jest.fn();

let mockIsScraping = false;
let mockScrapeError: Error | null = null;
let mockIsSaving = false;

jest.mock('@/hooks/use-jobs', () => ({
  __esModule: true,
  useScrapeJob: () => ({
    mutate: mockScrapeMutate,
    isPending: mockIsScraping,
    isError: Boolean(mockScrapeError),
    error: mockScrapeError,
  }),
  useCreateJob: () => ({
    mutate: mockCreateMutate,
    isPending: mockIsSaving,
    error: null,
  }),
}));

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn().mockResolvedValue('https://example.com/jobs/clipboard-job'),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{withSafeArea(children)}</QueryClientProvider>;
}

describe('UrlCaptureForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsScraping = false;
    mockScrapeError = null;
    mockIsSaving = false;
  });

  it('renders input, paste button, and disabled capture button when empty', async () => {
    await render(
      <UrlCaptureForm onCreated={jest.fn()} onSwitchToManual={jest.fn()} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('JOB POSTING URL')).toBeTruthy();
    expect(screen.getByLabelText('Paste URL from clipboard')).toBeTruthy();
    expect(screen.getByLabelText('Job posting URL')).toBeTruthy();
    expect(screen.getByText('Capture')).toBeTruthy();
  });

  it('pastes URL from clipboard when paste button is pressed', async () => {
    await render(
      <UrlCaptureForm onCreated={jest.fn()} onSwitchToManual={jest.fn()} />,
      { wrapper: Wrapper }
    );

    const pasteButton = screen.getByLabelText('Paste URL from clipboard');
    await fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com/jobs/clipboard-job')).toBeTruthy();
    });
  });

  it('triggers scrape when capture button is pressed', async () => {
    await render(
      <UrlCaptureForm onCreated={jest.fn()} onSwitchToManual={jest.fn()} />,
      { wrapper: Wrapper }
    );

    const input = screen.getByLabelText('Job posting URL');
    await fireEvent.changeText(input, 'https://stripe.com/jobs/456');

    const captureButton = screen.getByLabelText('Fetch job posting');
    await fireEvent.press(captureButton);

    expect(mockScrapeMutate).toHaveBeenCalledWith(
      'https://stripe.com/jobs/456',
      expect.any(Object)
    );
  });

  it('displays preview card and saves job on primary action press', async () => {
    const onCreated = jest.fn();
    mockScrapeMutate.mockImplementation((url, options) => {
      options?.onSuccess?.({
        title: 'Staff Platform Engineer',
        company: 'Stripe',
        location: 'San Francisco, CA',
        salaryRange: '$220,000 - $260,000',
        snapshotMarkdown: '# Description\nBuilding resilient infra.',
        status: 'ok',
      });
    });

    mockCreateMutate.mockImplementation((payload, options) => {
      options?.onSuccess?.();
    });

    await render(
      <UrlCaptureForm onCreated={onCreated} onSwitchToManual={jest.fn()} />,
      { wrapper: Wrapper }
    );

    const input = screen.getByLabelText('Job posting URL');
    await fireEvent.changeText(input, 'https://stripe.com/jobs/789');

    const captureButton = screen.getByLabelText('Fetch job posting');
    await fireEvent.press(captureButton);

    expect(screen.getByText('Staff Platform Engineer')).toBeTruthy();
    expect(screen.getByText('Stripe')).toBeTruthy();
    expect(screen.getByText('San Francisco, CA')).toBeTruthy();
    expect(screen.getByText('$220,000 - $260,000')).toBeTruthy();
    expect(screen.getByText('Captured from link')).toBeTruthy();

    const saveButton = screen.getByLabelText('Save captured job');
    await fireEvent.press(saveButton);

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Staff Platform Engineer',
        company: 'Stripe',
        location: 'San Francisco, CA',
        salaryRange: '$220,000 - $260,000',
        sourceUrl: 'https://stripe.com/jobs/789',
      }),
      expect.any(Object)
    );
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('switches to manual entry with prefilled fields on Edit details press', async () => {
    const onSwitchToManual = jest.fn();
    mockScrapeMutate.mockImplementation((url, options) => {
      options?.onSuccess?.({
        title: 'Security Engineer',
        company: 'Figma',
        location: 'Remote',
        salaryRange: '$180,000 - $210,000',
        snapshotMarkdown: 'Security audits',
        status: 'ok',
      });
    });

    await render(
      <UrlCaptureForm onCreated={jest.fn()} onSwitchToManual={onSwitchToManual} />,
      { wrapper: Wrapper }
    );

    const input = screen.getByLabelText('Job posting URL');
    await fireEvent.changeText(input, 'https://figma.com/jobs/sec');

    const captureButton = screen.getByLabelText('Fetch job posting');
    await fireEvent.press(captureButton);

    const editDetailsButton = screen.getByLabelText('Edit details in manual form');
    await fireEvent.press(editDetailsButton);

    expect(onSwitchToManual).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Security Engineer',
        company: 'Figma',
        location: 'Remote',
        salaryRange: '$180,000 - $210,000',
        sourceUrl: 'https://figma.com/jobs/sec',
      })
    );
  });

  it('shows error state when scraping fails and allows manual fallback', async () => {
    const onSwitchToManual = jest.fn();
    mockScrapeError = new Error('Scrape failed');

    await render(
      <UrlCaptureForm
        initialUrl="https://linkedin.com/jobs/blocked"
        onCreated={jest.fn()}
        onSwitchToManual={onSwitchToManual}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Could not capture posting automatically')).toBeTruthy();

    const manualFallbackButton = screen.getByLabelText('Enter details manually');
    await fireEvent.press(manualFallbackButton);

    expect(onSwitchToManual).toHaveBeenCalledWith({
      sourceUrl: 'https://linkedin.com/jobs/blocked',
    });
  });

  it('auto-fetches when autoFetch is true and initialUrl is supplied', async () => {
    await render(
      <UrlCaptureForm
        initialUrl="https://github.com/careers/1"
        autoFetch={true}
        onCreated={jest.fn()}
        onSwitchToManual={jest.fn()}
      />,
      { wrapper: Wrapper }
    );

    expect(mockScrapeMutate).toHaveBeenCalledWith(
      'https://github.com/careers/1',
      expect.any(Object)
    );
  });
});
