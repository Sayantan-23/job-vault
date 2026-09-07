import { fireEvent, render, screen } from '@testing-library/react-native';
import { Plus, Check } from 'lucide-react-native';

import { withSafeArea } from '@/components/ui/test-safe-area';
import { Fab } from './fab';

describe('Fab', () => {
  it('renders and calls onPress on single tap', async () => {
    const onPress = jest.fn();
    await render(
      withSafeArea(
        <Fab
          icon={Plus}
          accessibilityLabel="Add item"
          onPress={onPress}
        />
      )
    );

    const button = screen.getByLabelText('Add item');
    expect(button).toBeTruthy();

    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(
      withSafeArea(
        <Fab
          icon={Check}
          accessibilityLabel="Save item"
          onPress={onPress}
          disabled
        />
      )
    );

    const button = screen.getByLabelText('Save item');
    expect(button.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not trigger onPress when loading', async () => {
    const onPress = jest.fn();
    await render(
      withSafeArea(
        <Fab
          icon={Check}
          accessibilityLabel="Save item"
          onPress={onPress}
          loading
        />
      )
    );

    const button = screen.getByLabelText('Save item');
    expect(button.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
