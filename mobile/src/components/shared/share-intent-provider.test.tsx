import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native-css/components';

import { withSafeArea } from '@/components/ui/test-safe-area';
import { ShareIntentProvider } from './share-intent-provider';

const mockResetShareIntent = jest.fn();
let mockShareIntentState = {
  hasShareIntent: false,
  shareIntent: null as any,
  resetShareIntent: mockResetShareIntent,
};

jest.mock('expo-share-intent', () => ({
  __esModule: true,
  useShareIntent: () => mockShareIntentState,
}));

const mockScrapeMutate = jest.fn();

jest.mock('@/hooks/use-jobs', () => ({
  __esModule: true,
  useScrapeJob: () => ({
    mutate: mockScrapeMutate,
    isPending: false,
    isError: false,
  }),
  useCreateJob: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{withSafeArea(children)}</QueryClientProvider>;
}

describe('ShareIntentProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShareIntentState = {
      hasShareIntent: false,
      shareIntent: null,
      resetShareIntent: mockResetShareIntent,
    };
  });

  it('renders children normally when no share intent is present', async () => {
    await render(
      <ShareIntentProvider>
        <Text>Main App Content</Text>
      </ShareIntentProvider>,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Main App Content')).toBeTruthy();
    expect(screen.queryByText('Add a job')).toBeNull();
  });

  it('detects incoming share intent URL and opens AddJobSheet with auto-fetch', async () => {
    mockShareIntentState = {
      hasShareIntent: true,
      shareIntent: {
        webUrl: 'https://netflix.com/jobs/eng',
        text: 'Netflix Careers',
      },
      resetShareIntent: mockResetShareIntent,
    };

    await render(
      <ShareIntentProvider>
        <Text>Main App Content</Text>
      </ShareIntentProvider>,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Add a job')).toBeTruthy();
    expect(screen.getByDisplayValue('https://netflix.com/jobs/eng')).toBeTruthy();

    expect(mockScrapeMutate).toHaveBeenCalledWith(
      'https://netflix.com/jobs/eng',
      expect.any(Object)
    );
  });

  it('resets share intent when sheet is dismissed', async () => {
    mockShareIntentState = {
      hasShareIntent: true,
      shareIntent: {
        webUrl: 'https://airbnb.com/careers/lead',
        text: 'Check this role',
      },
      resetShareIntent: mockResetShareIntent,
    };

    await render(
      <ShareIntentProvider>
        <Text>Main App Content</Text>
      </ShareIntentProvider>,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Add a job')).toBeTruthy();

    const closeButton = screen.getByLabelText('Close add job sheet');
    await fireEvent.press(closeButton);

    expect(mockResetShareIntent).toHaveBeenCalledTimes(1);
  });
});
