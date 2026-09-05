import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { AnswerCopyChip } from './answer-copy-chip';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

describe('AnswerCopyChip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders variant label and character count', async () => {
    await render(
      <AnswerCopyChip
        variant="short"
        text="Short text here."
        question="Why you?"
        onCopied={jest.fn()}
      />
    );

    expect(screen.getByText('S 16')).toBeTruthy();
  });

  it('copies to clipboard, triggers haptic, and shows Copied on press', async () => {
    const onCopied = jest.fn();
    await render(
      <AnswerCopyChip
        variant="long"
        text="A longer text here."
        question="Why you?"
        onCopied={onCopied}
      />
    );

    const button = screen.getByLabelText('Copy the long answer to “Why you?”');

    await act(async () => {
      fireEvent.press(button);
    });

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('A longer text here.');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    expect(onCopied).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Copied')).toBeTruthy();

    // After 2000ms, reverts back
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText('L 19')).toBeTruthy();
  });
});
