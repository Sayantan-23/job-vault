import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from './empty-state';
import { Button } from './button';

describe('EmptyState', () => {
  it('renders the title (serif, per spec) and description', async () => {
    await render(
      <EmptyState title="No jobs yet" description="Add your first application to start tracking it." />
    );

    expect(screen.getByText('No jobs yet')).toBeTruthy();
    expect(
      screen.getByText('Add your first application to start tracking it.')
    ).toBeTruthy();
  });

  it('omits the action slot when no action is given', async () => {
    await render(<EmptyState title="No jobs yet" />);

    expect(screen.queryByText('Reset filters')).toBeNull();
  });

  it('renders the filtered variant with a Reset action and fires onReset', async () => {
    const onReset = jest.fn();
    await render(
      <EmptyState
        title="No jobs match your filters"
        description="Try widening or clearing them."
        action={
          <Button variant="outline" size="sm" onPress={onReset}>
            Reset filters
          </Button>
        }
      />
    );

    await fireEvent.press(screen.getByText('Reset filters'));

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
