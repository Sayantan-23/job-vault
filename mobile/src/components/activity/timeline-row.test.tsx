import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { GlobalTimelineEvent } from '@/types/timeline';
import { TimelineRow } from './timeline-row';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

const mockEvent: GlobalTimelineEvent = {
  id: 'e1',
  userId: 'u1',
  jobId: 'j1',
  jobTitle: 'Senior Frontend Engineer',
  jobCompany: 'Linear',
  title: 'Advanced to Technical Interview',
  description: 'Scheduled with hiring manager for next Tuesday.',
  type: 'AUTO',
  createdAt: '2026-09-06T10:00:00Z',
};

describe('TimelineRow', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders title, description, and job button', async () => {
    await render(<TimelineRow event={mockEvent} isLast={false} />);

    expect(screen.getByText('Advanced to Technical Interview')).toBeTruthy();
    expect(screen.getByText('Scheduled with hiring manager for next Tuesday.')).toBeTruthy();
    expect(screen.getByText('Linear — Senior Frontend Engineer')).toBeTruthy();
  });

  it('navigates to job screen when job button is tapped', async () => {
    await render(<TimelineRow event={mockEvent} isLast={false} />);

    await fireEvent.press(screen.getByText('Linear — Senior Frontend Engineer'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/jobs/[id]',
      params: { id: 'j1' },
    });
  });

  it('invokes custom onJobPress callback when provided', async () => {
    const handleJobPress = jest.fn();
    await render(<TimelineRow event={mockEvent} isLast={false} onJobPress={handleJobPress} />);

    await fireEvent.press(screen.getByText('Linear — Senior Frontend Engineer'));

    expect(handleJobPress).toHaveBeenCalledWith('j1');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders manual event type without error', async () => {
    await render(
      <TimelineRow
        event={{ ...mockEvent, type: 'MANUAL', description: null }}
        isLast={true}
      />
    );

    expect(screen.getByText('Advanced to Technical Interview')).toBeTruthy();
    expect(screen.queryByText('Scheduled with hiring manager for next Tuesday.')).toBeNull();
  });
});
