import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native-css/components';

import {
  AnchoredPopover,
  AnchoredPopoverClose,
  AnchoredPopoverContent,
  AnchoredPopoverTrigger,
} from './anchored-popover';

function Fixture() {
  return (
    <AnchoredPopover>
      <AnchoredPopoverTrigger accessibilityLabel="Account">
        <Text>Menu</Text>
      </AnchoredPopoverTrigger>
      <AnchoredPopoverContent>
        <AnchoredPopoverClose accessibilityLabel="Sign out">
          <Text>Sign out</Text>
        </AnchoredPopoverClose>
      </AnchoredPopoverContent>
    </AnchoredPopover>
  );
}

describe('AnchoredPopover', () => {
  it('stays closed until the trigger is pressed', async () => {
    await render(<Fixture />);

    expect(screen.queryByText('Sign out')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Account'));

    expect(screen.getByText('Sign out')).toBeTruthy();
  });

  it('closes when an item inside it is pressed', async () => {
    await render(<Fixture />);
    await fireEvent.press(screen.getByLabelText('Account'));

    await fireEvent.press(screen.getByLabelText('Sign out'));

    expect(screen.queryByText('Sign out')).toBeNull();
  });
});
