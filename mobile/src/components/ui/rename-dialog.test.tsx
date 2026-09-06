import { render, screen, fireEvent } from '@testing-library/react-native';
import { RenameDialog } from './rename-dialog';

describe('RenameDialog', () => {
  const mockConfirm = jest.fn();
  const mockOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and input pre-filled with initialValue', async () => {
    await render(
      <RenameDialog
        open={true}
        onOpenChange={mockOpenChange}
        title="Rename Document"
        initialValue="My Resume"
        onConfirm={mockConfirm}
      />
    );

    expect(screen.getByText('Rename Document')).toBeTruthy();
    expect(screen.getByDisplayValue('My Resume')).toBeTruthy();
  });

  it('submits updated name when Save is clicked', async () => {
    await render(
      <RenameDialog
        open={true}
        onOpenChange={mockOpenChange}
        initialValue="Old Title"
        onConfirm={mockConfirm}
      />
    );

    const input = screen.getByDisplayValue('Old Title');
    await fireEvent.changeText(input, 'New Title');

    const saveBtn = screen.getByText('Save');
    await fireEvent.press(saveBtn);

    expect(mockConfirm).toHaveBeenCalledWith('New Title');
    expect(mockOpenChange).toHaveBeenCalledWith(false);
  });

  it('cancels without confirming when Cancel is clicked', async () => {
    await render(
      <RenameDialog
        open={true}
        onOpenChange={mockOpenChange}
        initialValue="Old Title"
        onConfirm={mockConfirm}
      />
    );

    const cancelBtn = screen.getByText('Cancel');
    await fireEvent.press(cancelBtn);

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockOpenChange).toHaveBeenCalledWith(false);
  });
});
