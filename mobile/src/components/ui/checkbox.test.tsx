import { fireEvent, render, screen } from '@testing-library/react-native';

import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('exposes its checked state to assistive tech', async () => {
    await render(<Checkbox aria-label="Agree" checked />);

    expect(screen.getByLabelText('Agree').props.accessibilityState.checked).toBe(true);
  });

  it('reports the next value when toggled', async () => {
    const onCheckedChange = jest.fn();
    await render(<Checkbox aria-label="Agree" checked={false} onCheckedChange={onCheckedChange} />);

    await fireEvent.press(screen.getByLabelText('Agree'));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('does not toggle while disabled', async () => {
    const onCheckedChange = jest.fn();
    await render(<Checkbox aria-label="Agree" disabled onCheckedChange={onCheckedChange} />);

    await fireEvent.press(screen.getByLabelText('Agree'));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
