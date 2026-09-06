import { fireEvent, render, screen } from '@testing-library/react-native';

import { CoverLetterProposal } from './cover-letter-proposal';

describe('CoverLetterProposal', () => {
  it('renders proposal for general action with keep, try again, and discard', async () => {
    const onKeep = jest.fn();
    const onDiscard = jest.fn();
    const onTryAgain = jest.fn();

    await render(
      <CoverLetterProposal
        action="humanize"
        candidate="Here is the warmer rewritten letter."
        currentBody="Original stiff letter."
        busy={false}
        onKeep={onKeep}
        onDiscard={onDiscard}
        onTryAgain={onTryAgain}
      />
    );

    expect(screen.getByText('Proposed rewrite')).toBeTruthy();
    expect(screen.getByText('Humanize')).toBeTruthy();
    expect(screen.getByText('Here is the warmer rewritten letter.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Keep'));
    expect(onKeep).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('Try again'));
    expect(onTryAgain).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('Discard'));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('handles grammar fix action with diff toggle', async () => {
    const onKeep = jest.fn();
    const onDiscard = jest.fn();
    const onTryAgain = jest.fn();

    await render(
      <CoverLetterProposal
        action="fix-grammar"
        candidate="I am happy to apply."
        currentBody="I is happy to apply."
        busy={false}
        onKeep={onKeep}
        onDiscard={onDiscard}
        onTryAgain={onTryAgain}
      />
    );

    expect(screen.getByText('Fix grammar')).toBeTruthy();
    // In grammar mode, toggle defaults to "Show clean"
    const toggleBtn = screen.getByText('Show clean');
    expect(toggleBtn).toBeTruthy();

    await fireEvent.press(toggleBtn);
    expect(screen.getByText('Show diff')).toBeTruthy();
  });
});
