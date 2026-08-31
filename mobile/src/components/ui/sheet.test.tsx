import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native-css/components';

import { Sheet, SheetContent, SheetTitle } from './sheet';
import { withSafeArea } from './test-safe-area';

describe('Sheet', () => {
  it('renders nothing while closed', async () => {
    await render(
      withSafeArea(
        <Sheet open={false} onOpenChange={jest.fn()}>
          <SheetContent>
            <SheetTitle>Outreach</SheetTitle>
          </SheetContent>
        </Sheet>
      )
    );

    expect(screen.queryByText('Outreach')).toBeNull();
  });

  it('renders its content while open and closes from the close control', async () => {
    const onOpenChange = jest.fn();
    await render(
      withSafeArea(
        <Sheet open onOpenChange={onOpenChange}>
          <SheetContent>
            <SheetTitle>Outreach</SheetTitle>
            <Text>Body</Text>
          </SheetContent>
        </Sheet>
      )
    );

    expect(screen.getByText('Body')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Close'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('hides the close control when asked', async () => {
    await render(
      withSafeArea(
        <Sheet open onOpenChange={jest.fn()}>
          <SheetContent hideClose>
            <SheetTitle>Outreach</SheetTitle>
          </SheetContent>
        </Sheet>
      )
    );

    expect(screen.queryByLabelText('Close')).toBeNull();
  });
});
