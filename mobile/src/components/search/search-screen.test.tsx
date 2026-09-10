import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import * as useSearchModule from '@/hooks/use-search';
import type { SearchResult } from '@/types/search';
import { SearchScreen, groupByType } from './search-screen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockResults: SearchResult[] = [
  {
    type: 'job',
    id: 'j-1',
    title: 'Senior Engineer',
    subtitle: 'Vercel',
    snippet: 'Work on \u0002Next.js\u0003',
  },
  {
    type: 'resume',
    id: 'r-1',
    title: 'Full Stack Resume',
    subtitle: null,
    snippet: null,
  },
  {
    type: 'job',
    id: 'j-2',
    title: 'Frontend Engineer',
    subtitle: 'Linear',
    snippet: null,
  },
  {
    type: 'answer',
    id: 'a-1',
    title: 'Why join us?',
    subtitle: 'Culture',
    snippet: 'Passionate about UX',
  },
];

let qc: QueryClient;

function wrapper() {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return withSafeArea(<QueryClientProvider client={qc}>{children}</QueryClientProvider>);
  };
}

describe('groupByType', () => {
  it('groups items by type and preserves initial group encounter order', () => {
    const grouped = groupByType(mockResults);
    expect(grouped.map((g) => `${g.type}:${g.id}`)).toEqual([
      'job:j-1',
      'job:j-2',
      'resume:r-1',
      'answer:a-1',
    ]);
  });
});

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    qc?.clear();
  });

  it('renders initial state prompt when search input is empty', async () => {
    jest.spyOn(useSearchModule, 'useSearch').mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      settled: true,
    } as any);

    await render(<SearchScreen />, { wrapper: wrapper() });

    expect(screen.getByText('Search JobVault')).toBeTruthy();
    expect(
      screen.getByText('Find applications, saved answers, résumés, cover letters, and personas.')
    ).toBeTruthy();
  });

  it('renders typing prompt when input has 1 character', async () => {
    jest.spyOn(useSearchModule, 'useSearch').mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      settled: true,
    } as any);

    await render(<SearchScreen />, {
      wrapper: wrapper(),
    });

    await fireEvent.changeText(screen.getByTestId('search-input'), 'a');

    expect(screen.getByText('Type at least 2 characters to search')).toBeTruthy();
  });

  it('renders grouped search results and calls onSelect when pressed', async () => {
    jest.spyOn(useSearchModule, 'useSearch').mockReturnValue({
      data: mockResults,
      isLoading: false,
      isFetching: false,
      settled: true,
    } as any);

    const onSelect = jest.fn();
    await render(<SearchScreen onSelect={onSelect} />, {
      wrapper: wrapper(),
    });

    await fireEvent.changeText(screen.getByTestId('search-input'), 'engineer');

    expect(screen.getByText('Senior Engineer')).toBeTruthy();
    expect(screen.getByText('Frontend Engineer')).toBeTruthy();
    expect(screen.getByText('Full Stack Resume')).toBeTruthy();
    expect(screen.getByText('Why join us?')).toBeTruthy();

    await fireEvent.press(screen.getByText('Senior Engineer'));
    expect(onSelect).toHaveBeenCalledWith(mockResults[0]);
  });

  it('filters results by category when filter tab is selected', async () => {
    jest.spyOn(useSearchModule, 'useSearch').mockReturnValue({
      data: mockResults,
      isLoading: false,
      isFetching: false,
      settled: true,
    } as any);

    await render(<SearchScreen />, {
      wrapper: wrapper(),
    });

    await fireEvent.changeText(screen.getByTestId('search-input'), 'engineer');

    // Switch to Answers filter
    await fireEvent.press(screen.getByLabelText('Filter by Answers'));

    expect(screen.getByText('Why join us?')).toBeTruthy();
    expect(screen.queryByText('Senior Engineer')).toBeNull();
    expect(screen.queryByText('Full Stack Resume')).toBeNull();
  });

  it('clears search input when clear button is pressed', async () => {
    jest.spyOn(useSearchModule, 'useSearch').mockReturnValue({
      data: mockResults,
      isLoading: false,
      isFetching: false,
      settled: true,
    } as any);

    await render(<SearchScreen />, {
      wrapper: wrapper(),
    });

    await fireEvent.changeText(screen.getByTestId('search-input'), 'engineer');
    expect(screen.getByTestId('search-input').props.value).toBe('engineer');

    await fireEvent.press(screen.getByLabelText('Clear search'));
    expect(screen.getByTestId('search-input').props.value).toBe('');
  });
});
