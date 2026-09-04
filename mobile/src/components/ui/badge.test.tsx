import { render, screen } from '@testing-library/react-native';

import { Badge } from './badge';

describe('Badge', () => {
  it('renders its label', async () => {
    await render(<Badge>Applied</Badge>);

    expect(screen.getByText('Applied')).toBeTruthy();
  });

  it.each([
    ['default'],
    ['secondary'],
    ['outline'],
    ['ghost-active'],
    ['ghost-stale'],
    ['ghost-ghosted'],
  ] as const)('renders the %s variant label', async (variant) => {
    await render(<Badge variant={variant}>{variant}</Badge>);

    expect(screen.getByText(variant)).toBeTruthy();
  });

  it('defaults to the primary variant when none is given', async () => {
    await render(<Badge>Applied</Badge>);

    expect(screen.getByText('Applied')).toBeTruthy();
  });
});
