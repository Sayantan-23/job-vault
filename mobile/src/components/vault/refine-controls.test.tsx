import { fireEvent, render, screen } from '@testing-library/react-native';

import { RefineControls } from './refine-controls';

describe('RefineControls', () => {
  it('triggers preset refine action on chip press', async () => {
    const onRun = jest.fn();

    await render(<RefineControls busy={false} onRun={onRun} />);

    await fireEvent.press(screen.getByLabelText('Refine: Humanize'));
    expect(onRun).toHaveBeenCalledWith('humanize', undefined);

    await fireEvent.press(screen.getByLabelText('Refine: Shorten'));
    expect(onRun).toHaveBeenCalledWith('shorten', undefined);
  });

  it('triggers custom refine action when text is entered and submit is pressed', async () => {
    const onRun = jest.fn();

    await render(<RefineControls busy={false} onRun={onRun} />);

    await fireEvent.changeText(
      screen.getByLabelText('Custom AI instructions'),
      'Emphasize leadership experience'
    );
    await fireEvent.press(screen.getByLabelText('Run custom instruction'));

    expect(onRun).toHaveBeenCalledWith('custom', 'Emphasize leadership experience');
  });
});
