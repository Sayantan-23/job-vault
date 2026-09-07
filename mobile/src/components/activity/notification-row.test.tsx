import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Notification } from '@/types/notification';
import { NotificationRow } from './notification-row';

const mockNotification: Notification = {
  id: 'n1',
  userId: 'u1',
  type: 'REMINDER',
  message: 'Follow up with Figma recruiter',
  isRead: false,
  relatedJobId: 'j1',
  createdAt: '2026-09-06T12:00:00Z',
};

describe('NotificationRow', () => {
  it('renders notification message and relative time', async () => {
    const handleSelect = jest.fn();
    await render(<NotificationRow notification={mockNotification} onSelect={handleSelect} />);

    expect(screen.getByText('Follow up with Figma recruiter')).toBeTruthy();
    expect(screen.getByTestId('notification-unread-dot')).toBeTruthy();
  });

  it('hides unread dot when notification is read', async () => {
    const handleSelect = jest.fn();
    await render(
      <NotificationRow
        notification={{ ...mockNotification, isRead: true }}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText('Follow up with Figma recruiter')).toBeTruthy();
    expect(screen.queryByTestId('notification-unread-dot')).toBeNull();
  });

  it('calls onSelect when tapped', async () => {
    const handleSelect = jest.fn();
    await render(<NotificationRow notification={mockNotification} onSelect={handleSelect} />);

    await fireEvent.press(screen.getByTestId('notification-item'));

    expect(handleSelect).toHaveBeenCalledWith(mockNotification);
  });

  it('renders ghost alert notification styling without error', async () => {
    const handleSelect = jest.fn();
    await render(
      <NotificationRow
        notification={{ ...mockNotification, type: 'GHOST_ALERT' }}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText('Follow up with Figma recruiter')).toBeTruthy();
  });
});
