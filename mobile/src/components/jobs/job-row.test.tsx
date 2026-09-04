import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { JobRow } from './job-row';
import type { Job } from '@/types/job';

const mockMutate = jest.fn();
jest.mock('@/hooks/use-jobs', () => ({
  useUpdateJob: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

const sampleJob: Job = {
  id: 'j-123',
  title: 'Staff Frontend Engineer',
  company: 'Linear',
  location: 'Remote',
  salaryRange: '$200k–$250k',
  sourceUrl: 'https://linear.app/careers',
  snapshotMarkdown: null,
  status: 'APPLIED',
  kanbanOrder: 0,
  lastActivityAt: null,
  ghostDays: 4,
  notes: null,
  outreachCount: 2,
  outreachReplies: 1,
  createdAt: '2026-09-01T12:00:00Z',
  updatedAt: '2026-09-01T12:00:00Z',
  userId: 'u-1',
};

describe('JobRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, company, location, ghost days, and status', async () => {
    await render(<JobRow job={sampleJob} />);

    expect(screen.getByText('Staff Frontend Engineer')).toBeTruthy();
    expect(screen.getByText('Linear · Remote')).toBeTruthy();
    expect(screen.getByText('Applied')).toBeTruthy();
    expect(screen.getByText('4d')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('navigates to job detail on press', async () => {
    await render(<JobRow job={sampleJob} />);

    const rowPressable = screen.getByLabelText('Staff Frontend Engineer at Linear');
    fireEvent.press(rowPressable);

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/jobs/[id]',
      params: { id: 'j-123' },
    });
  });

  it('renders advance action when next status is available', async () => {
    await render(<JobRow job={sampleJob} />);

    const advanceBtn = screen.getByLabelText('Advance to INTERVIEWING');
    expect(advanceBtn).toBeTruthy();

    fireEvent.press(advanceBtn);
    expect(mockMutate).toHaveBeenCalledWith({ status: 'INTERVIEWING' });
  });
});
