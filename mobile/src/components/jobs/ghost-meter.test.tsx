import { render, screen } from '@testing-library/react-native';

import { GhostMeter } from './ghost-meter';

describe('GhostMeter', () => {
  it('renders active level days', async () => {
    await render(<GhostMeter days={3} />);
    expect(screen.getByText('3d')).toBeTruthy();
    expect(screen.getByLabelText('Last activity: 3 days ago')).toBeTruthy();
  });

  it('renders stale level days', async () => {
    await render(<GhostMeter days={10} />);
    expect(screen.getByText('10d')).toBeTruthy();
    expect(screen.getByLabelText('Last activity: 10 days ago')).toBeTruthy();
  });

  it('renders ghosted level days', async () => {
    await render(<GhostMeter days={20} />);
    expect(screen.getByText('20d')).toBeTruthy();
    expect(screen.getByLabelText('Last activity: 20 days ago')).toBeTruthy();
  });
});
