import { fireEvent, render, screen } from '@testing-library/react-native';

import { FilterSheet } from './filter-sheet';
import { withSafeArea } from '@/components/ui/test-safe-area';
import { DEFAULT_FILTERS, type JobFilters } from '@/types/filters';

const baseProps = (overrides: Partial<JobFilters> = {}) => ({
  open: true,
  onOpenChange: () => {},
  filters: { ...DEFAULT_FILTERS, ...overrides },
  onFiltersChange: () => {},
});

describe('FilterSheet', () => {
  it('reflects the current search value', async () => {
    await render(
      withSafeArea(<FilterSheet {...baseProps({ search: 'Acme' })} />)
    );

    expect(screen.getByDisplayValue('Acme')).toBeTruthy();
  });

  it('reflects the current createdFrom value', async () => {
    await render(
      withSafeArea(<FilterSheet {...baseProps({ createdFrom: '2026-09-01' })} />)
    );

    expect(screen.getByDisplayValue('2026-09-01')).toBeTruthy();
  });

  it('reports search changes to the parent', async () => {
    const onFiltersChange = jest.fn();
    await render(
      withSafeArea(
        <FilterSheet {...baseProps()} onFiltersChange={onFiltersChange} />
      )
    );

    await fireEvent.changeText(screen.getByLabelText('Search'), 'Backend');

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Backend' })
    );
  });

  it('reset restores the default filters', async () => {
    const onFiltersChange = jest.fn();
    await render(
      withSafeArea(
        <FilterSheet
          {...baseProps({ search: 'Acme', ghost: 'ghost' })}
          onFiltersChange={onFiltersChange}
        />
      )
    );

    await fireEvent.press(screen.getByText('Reset filters'));

    expect(onFiltersChange).toHaveBeenCalledWith({ ...DEFAULT_FILTERS });
  });
});
