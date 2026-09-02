import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './button';

describe('Button', () => {
  it('renders its label', async () => {
    await render(<Button>Save</Button>);

    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Save</Button>);

    await fireEvent.press(screen.getByText('Save'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress while disabled', async () => {
    const onPress = jest.fn();
    await render(
      <Button onPress={onPress} disabled>
        Save
      </Button>
    );

    await fireEvent.press(screen.getByText('Save'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
