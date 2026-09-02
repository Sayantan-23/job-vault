import { fireEvent, render, screen } from '@testing-library/react-native';
import { LayoutGrid, List } from 'lucide-react-native';

import { SegmentedControl } from './segmented-control';

const OPTIONS = [
  { value: 'board', label: 'Board', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: List },
] as const;

describe('SegmentedControl', () => {
  it('marks the active option as selected', async () => {
    await render(
      <SegmentedControl value="list" onValueChange={() => {}} options={OPTIONS} aria-label="View" />
    );

    expect(screen.getByLabelText('List').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Board').props.accessibilityState.selected).toBe(false);
  });

  it('calls onValueChange with the pressed option value', async () => {
    const onValueChange = jest.fn();
    await render(
      <SegmentedControl
        value="list"
        onValueChange={onValueChange}
        options={OPTIONS}
        aria-label="View"
      />
    );

    await fireEvent.press(screen.getByLabelText('Board'));

    expect(onValueChange).toHaveBeenCalledWith('board');
  });
});
