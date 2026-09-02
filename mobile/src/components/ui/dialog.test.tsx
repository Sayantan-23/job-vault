import { fireEvent, render, screen } from '@testing-library/react-native';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';

function Fixture({ open, onOpenChange }: { open: boolean; onOpenChange: jest.Mock }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Rename</DialogTitle>
        <DialogDescription>Give this a new name.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('renders nothing while closed', async () => {
    await render(<Fixture open={false} onOpenChange={jest.fn()} />);

    expect(screen.queryByText('Rename')).toBeNull();
  });

  it('renders its title and description while open', async () => {
    await render(<Fixture open onOpenChange={jest.fn()} />);

    expect(screen.getByText('Rename')).toBeTruthy();
    expect(screen.getByText('Give this a new name.')).toBeTruthy();
  });

  it('closes from the built-in close control', async () => {
    const onOpenChange = jest.fn();
    await render(<Fixture open onOpenChange={onOpenChange} />);

    await fireEvent.press(screen.getByLabelText('Close'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when the scrim is pressed', async () => {
    const onOpenChange = jest.fn();
    await render(<Fixture open onOpenChange={onOpenChange} />);

    await fireEvent.press(screen.getByLabelText('Close dialog'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
