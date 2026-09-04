import { render, screen } from '@testing-library/react-native';

import { OutreachBadge } from './outreach-badge';

describe('OutreachBadge', () => {
  it('renders nothing when count is 0', async () => {
    const { toJSON } = await render(<OutreachBadge count={0} />);
    expect(toJSON()).toBeNull();
  });

  it('renders list variant with count and replies', async () => {
    await render(<OutreachBadge variant="list" count={3} replies={1} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('· 1 replied')).toBeTruthy();
    expect(screen.getByLabelText('3 contacted · 1 replied')).toBeTruthy();
  });

  it('renders card variant with count', async () => {
    await render(<OutreachBadge variant="card" count={2} replies={0} />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByLabelText('2 contacted · 0 replied')).toBeTruthy();
  });
});
