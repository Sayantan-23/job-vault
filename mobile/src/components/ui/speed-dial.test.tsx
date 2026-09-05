import { render, screen, fireEvent } from '@testing-library/react-native';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react-native';

import { SpeedDial, type SpeedDialAction } from './speed-dial';

describe('SpeedDial', () => {
  const mockAdd = jest.fn();
  const mockFilter = jest.fn();
  const mockDelete = jest.fn();

  const actions: SpeedDialAction[] = [
    {
      key: 'add',
      label: 'Add job',
      icon: Plus,
      accessibilityLabel: 'Add job',
      onPress: mockAdd,
    },
    {
      key: 'filter',
      label: 'Filter jobs',
      icon: SlidersHorizontal,
      accessibilityLabel: 'Filter jobs',
      onPress: mockFilter,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders closed FAB by default', async () => {
    await render(<SpeedDial actions={actions} accessibilityLabel="Open menu" />);

    expect(screen.getByLabelText('Open menu')).toBeTruthy();
    expect(screen.queryByText('Add job')).toBeNull();
    expect(screen.queryByText('Filter jobs')).toBeNull();
  });

  it('reveals icon options and label pills on clicking the FAB', async () => {
    await render(<SpeedDial actions={actions} accessibilityLabel="Open menu" />);

    await fireEvent.press(screen.getByLabelText('Open menu'));

    expect(screen.getByText('Add job')).toBeTruthy();
    expect(screen.getByText('Filter jobs')).toBeTruthy();
    expect(screen.getByLabelText('Add job')).toBeTruthy();
    expect(screen.getByLabelText('Filter jobs')).toBeTruthy();
  });

  it('triggers action onPress and closes when an option is selected', async () => {
    await render(<SpeedDial actions={actions} accessibilityLabel="Open menu" />);

    await fireEvent.press(screen.getByLabelText('Open menu'));
    await fireEvent.press(screen.getByLabelText('Add job'));

    expect(mockAdd).toHaveBeenCalledTimes(1);
    // Closed now
    expect(screen.queryByText('Add job')).toBeNull();
  });

  it('closes when backdrop is pressed', async () => {
    await render(<SpeedDial actions={actions} accessibilityLabel="Open menu" />);

    await fireEvent.press(screen.getByLabelText('Open menu'));
    expect(screen.getByText('Add job')).toBeTruthy();

    const closeButtons = screen.getAllByLabelText('Close actions');
    await fireEvent.press(closeButtons[0]);

    expect(screen.queryByText('Add job')).toBeNull();
  });

  it('renders destructive option style correctly', async () => {
    const actionsWithDestructive: SpeedDialAction[] = [
      {
        key: 'delete',
        label: 'Delete item',
        icon: Trash2,
        accessibilityLabel: 'Delete item',
        onPress: mockDelete,
        variant: 'destructive',
      },
    ];

    await render(
      <SpeedDial actions={actionsWithDestructive} accessibilityLabel="Open menu" />
    );

    await fireEvent.press(screen.getByLabelText('Open menu'));
    const deleteBtn = screen.getByLabelText('Delete item');
    expect(deleteBtn).toBeTruthy();

    await fireEvent.press(deleteBtn);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
