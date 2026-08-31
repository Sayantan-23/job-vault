import { render, screen } from '@testing-library/react-native';

import { MonogramAvatar } from './avatar';

describe('MonogramAvatar', () => {
  it('shows the uppercased first letter of the name', async () => {
    await render(<MonogramAvatar name="ada lovelace" />);

    expect(screen.getByText('A')).toBeTruthy();
  });

  it('falls back to “?” for an empty name', async () => {
    await render(<MonogramAvatar name="   " />);

    expect(screen.getByText('?')).toBeTruthy();
  });

  it('is deterministic: the same name always renders the same swatch', async () => {
    const first = await render(<MonogramAvatar name="Grace Hopper" />);
    const second = await render(<MonogramAvatar name="Grace Hopper" />);

    expect(second.toJSON()).toEqual(first.toJSON());
  });
});
