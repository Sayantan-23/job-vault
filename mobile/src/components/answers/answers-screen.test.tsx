import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as answersHook from '@/hooks/use-answers';
import * as personasHook from '@/hooks/use-personas';
import * as aiStatusHook from '@/hooks/use-ai-status';
import * as jobsHook from '@/hooks/use-jobs';
import type { Answer } from '@/types/answer';
import { withSafeArea } from '@/components/ui/test-safe-area';
import { AnswersScreen } from './answers-screen';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

const mockAnswers: Answer[] = [
  {
    id: 'a-1',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    userId: 'u1',
    question: 'Why do you want to join our engineering team?',
    answerShort: 'I love your product vision.',
    answerLong: 'Your platform tackles real-time sync with high elegance.',
    lastUsedAt: null,
  },
  {
    id: 'a-2',
    createdAt: '2026-09-02T00:00:00Z',
    updatedAt: '2026-09-02T00:00:00Z',
    userId: 'u1',
    question: 'Describe a challenging bug you fixed.',
    answerShort: 'Race condition in payment webhook handler.',
    answerLong: 'Resolved idempotent state transitions during high concurrency.',
    lastUsedAt: null,
  },
];

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return withSafeArea(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  };
}

describe('AnswersScreen', () => {
  beforeEach(() => {
    jest.spyOn(answersHook, 'useAnswers').mockReturnValue({
      data: mockAnswers,
      isLoading: false,
    } as any);

    jest.spyOn(answersHook, 'useDeleteAnswer').mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as any);

    jest.spyOn(answersHook, 'useMarkAnswerUsed').mockReturnValue({
      mutate: jest.fn(),
    } as any);

    jest.spyOn(personasHook, 'usePersonas').mockReturnValue({
      data: [{ id: 'p-1', name: 'Software Engineer' }],
    } as any);

    jest.spyOn(aiStatusHook, 'useAiStatus').mockReturnValue({
      data: { enabled: true, maxPersonas: 3 },
    } as any);

    jest.spyOn(jobsHook, 'useInfiniteJobs').mockReturnValue({
      data: [],
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders title, search bar, and answer rows', async () => {
    await render(<AnswersScreen />, { wrapper: makeWrapper() });

    expect(screen.getByText('Answers')).toBeTruthy();
    expect(
      screen.getByText('Why do you want to join our engineering team?')
    ).toBeTruthy();
    expect(screen.getByText('Describe a challenging bug you fixed.')).toBeTruthy();
  });

  it('filters answer rows based on search input', async () => {
    await render(<AnswersScreen />, { wrapper: makeWrapper() });

    const searchInput = screen.getByLabelText('Search answers');
    await fireEvent.changeText(searchInput, 'challenging bug');

    expect(
      screen.queryByText('Why do you want to join our engineering team?')
    ).toBeNull();
    expect(screen.getByText('Describe a challenging bug you fixed.')).toBeTruthy();
  });

  it('shows empty state when search finds no match', async () => {
    await render(<AnswersScreen />, { wrapper: makeWrapper() });

    const searchInput = screen.getByLabelText('Search answers');
    await fireEvent.changeText(searchInput, 'nonexistent query 12345');

    expect(screen.getByText('No matching answers')).toBeTruthy();
  });

  it('renders SpeedDial FAB and opens New Answer sheet from dial action', async () => {
    await render(<AnswersScreen />, { wrapper: makeWrapper() });

    // SpeedDial FAB is rendered with Answer actions label
    const fab = screen.getByLabelText('Answer actions');
    expect(fab).toBeTruthy();

    // Header has no leading action button
    expect(screen.queryByLabelText('New answer')).toBeNull();

    // Press FAB to open SpeedDial
    await fireEvent.press(fab);

    // Speed dial shows New answer action option
    const newAnswerAction = screen.getByLabelText('New answer');
    expect(newAnswerAction).toBeTruthy();

    // Press New answer action
    await fireEvent.press(newAnswerAction);

    // New answer sheet opens
    expect(screen.getByText('New answer')).toBeTruthy();
    expect(screen.getByLabelText('Question')).toBeTruthy();
  });
});
