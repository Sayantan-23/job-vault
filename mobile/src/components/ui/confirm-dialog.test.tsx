import { fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  it('shows the title, description and both labels', async () => {
    await render(
      <ConfirmDialog
        open
        onOpenChange={jest.fn()}
        onConfirm={jest.fn()}
        title="Delete résumé?"
        description="This cannot be undone."
        confirmLabel="Delete"
      />
    );

    expect(screen.getByText('Delete résumé?')).toBeTruthy();
    expect(screen.getByText('This cannot be undone.')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('cancels by closing, without confirming', async () => {
    const onOpenChange = jest.fn();
    const onConfirm = jest.fn();
    await render(
      <ConfirmDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} title="Delete?" />
    );

    await fireEvent.press(screen.getByText('Cancel'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('leaves closing to the parent when confirmed', async () => {
    const onOpenChange = jest.fn();
    const onConfirm = jest.fn();
    await render(
      <ConfirmDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} title="Delete?" />
    );

    await fireEvent.press(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
