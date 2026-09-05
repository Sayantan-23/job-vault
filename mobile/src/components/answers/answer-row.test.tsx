import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Answer } from '@/types/answer';
import { AnswerRow } from './answer-row';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

const mockAnswer: Answer = {
  id: 'a-1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  question: 'What are your greatest strengths?',
  answerShort: 'Problem solving and system architecture.',
  answerLong: 'Over the past 8 years I have built large scale systems...',
  lastUsedAt: '2026-09-04T12:00:00Z',
};

describe('AnswerRow', () => {
  it('renders question and copy chips', async () => {
    await render(
      <AnswerRow
        answer={mockAnswer}
        onSelect={jest.fn()}
        onDelete={jest.fn()}
        onCopied={jest.fn()}
      />
    );

    expect(screen.getByText('What are your greatest strengths?')).toBeTruthy();
    expect(screen.getByText('S 40')).toBeTruthy();
    expect(screen.getByText('L 57')).toBeTruthy();
  });

  it('calls onSelect when row is pressed', async () => {
    const onSelect = jest.fn();
    await render(
      <AnswerRow
        answer={mockAnswer}
        onSelect={onSelect}
        onDelete={jest.fn()}
        onCopied={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText('Answer: What are your greatest strengths?'));
    expect(onSelect).toHaveBeenCalledWith('a-1');
  });

  it('calls onDelete when delete button is pressed', async () => {
    const onDelete = jest.fn();
    await render(
      <AnswerRow
        answer={mockAnswer}
        onSelect={jest.fn()}
        onDelete={onDelete}
        onCopied={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText('Delete “What are your greatest strengths?”'));
    expect(onDelete).toHaveBeenCalledWith('a-1');
  });
});
