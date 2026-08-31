import { fireEvent, render, screen } from '@testing-library/react-native';

import { Select } from './select';
import { withSafeArea } from './test-safe-area';

const OPTIONS = [
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
] as const;

describe('Select', () => {
  it('shows the label of the current value, not its raw value', async () => {
    await render(
      withSafeArea(
        <Select value="interview" onValueChange={() => {}} options={OPTIONS} aria-label="Status" />
      )
    );

    expect(screen.getByText('Interview')).toBeTruthy();
    expect(screen.queryByText('interview')).toBeNull();
  });

  it('shows the placeholder when nothing is selected', async () => {
    await render(
      withSafeArea(
        <Select
          value={undefined}
          onValueChange={() => {}}
          options={OPTIONS}
          placeholder="Pick one"
          aria-label="Status"
        />
      )
    );

    expect(screen.getByText('Pick one')).toBeTruthy();
  });

  it('opens on press and reports the chosen value', async () => {
    const onValueChange = jest.fn();
    await render(
      withSafeArea(
        <Select
          value="applied"
          onValueChange={onValueChange}
          options={OPTIONS}
          aria-label="Status"
        />
      )
    );

    await fireEvent.press(screen.getByLabelText('Status'));
    await fireEvent.press(screen.getByText('Interview'));

    expect(onValueChange).toHaveBeenCalledWith('interview');
  });
});
