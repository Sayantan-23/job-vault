import { fireEvent, render, screen } from '@testing-library/react-native';

import { withSafeArea } from '@/components/ui/test-safe-area';
import { PersonaItemPicker } from './persona-item-picker';

type SampleItem = {
  id: string;
  name: string;
  desc?: string;
};

const items: SampleItem[] = [
  { id: '1', name: 'Item One', desc: 'Description 1' },
  { id: '2', name: 'Item Two', desc: 'Description 2' },
];

describe('PersonaItemPicker', () => {
  it('renders empty hint when profile items are empty', async () => {
    await render(
      withSafeArea(
        <PersonaItemPicker<SampleItem>
          label="Test picker"
          profileItems={[]}
          selectedIds={new Set()}
          getTitle={(i) => i.name}
          onAdd={jest.fn()}
          onRemove={jest.fn()}
          emptyHint="Nothing here"
        />
      )
    );

    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('renders items and handles toggling item selection', async () => {
    const onAdd = jest.fn();
    const onRemove = jest.fn();

    await render(
      withSafeArea(
        <PersonaItemPicker
          label="Test picker"
          profileItems={items}
          selectedIds={new Set(['1'])}
          getTitle={(i) => i.name}
          getSubtitle={(i) => i.desc}
          onAdd={onAdd}
          onRemove={onRemove}
          emptyHint="Nothing here"
        />
      )
    );

    expect(screen.getByText('Item One')).toBeTruthy();
    expect(screen.getByText('Item Two')).toBeTruthy();

    // Toggle selected item -> calls onRemove
    await fireEvent.press(screen.getByLabelText('Remove Item One'));
    expect(onRemove).toHaveBeenCalledWith(['1']);

    // Toggle unselected item -> calls onAdd
    await fireEvent.press(screen.getByLabelText('Add Item Two'));
    expect(onAdd).toHaveBeenCalledWith([expect.objectContaining({ id: '2', name: 'Item Two' })]);
  });

  it('calls onAdd with all unselected items when Add all is pressed', async () => {
    const onAdd = jest.fn();

    await render(
      withSafeArea(
        <PersonaItemPicker
          label="Test picker"
          profileItems={items}
          selectedIds={new Set(['1'])}
          getTitle={(i) => i.name}
          onAdd={onAdd}
          onRemove={jest.fn()}
          emptyHint="Nothing here"
        />
      )
    );

    await fireEvent.press(screen.getByLabelText('Add all Test picker'));
    expect(onAdd).toHaveBeenCalledWith([expect.objectContaining({ id: '2', name: 'Item Two' })]);
  });
});
