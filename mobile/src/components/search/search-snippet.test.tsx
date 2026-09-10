import { render, screen } from '@testing-library/react-native';
import { SearchSnippet } from './search-snippet';

describe('SearchSnippet', () => {
  it('returns null when text is empty string', async () => {
    const { toJSON } = await render(<SearchSnippet text="" />);
    expect(toJSON()).toBeNull();
  });

  it('renders unhighlighted text without sentinels', async () => {
    await render(<SearchSnippet text="Simple search snippet" />);
    expect(screen.getByText('Simple search snippet')).toBeTruthy();
  });

  it('highlights terms wrapped in STX and ETX control characters', async () => {
    const raw = 'Found a \u0002matching\u0003 job opportunity in engineering';
    await render(<SearchSnippet text={raw} />);

    expect(screen.getByText('matching')).toBeTruthy();
    expect(screen.getByText('Found a ')).toBeTruthy();
    expect(screen.getByText(' job opportunity in engineering')).toBeTruthy();
  });
});
