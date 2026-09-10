import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SearchResult } from '@/types/search';
import { SearchResultRow } from './search-result-row';

const mockResult: SearchResult = {
  type: 'job',
  id: 'j-1',
  title: 'Lead Software Architect',
  subtitle: 'Stripe',
  snippet: 'Build payment \u0002infrastructure\u0003 at scale',
};

describe('SearchResultRow', () => {
  it('renders title, subtitle, type badge, and snippet', async () => {
    await render(<SearchResultRow result={mockResult} onPress={jest.fn()} />);

    expect(screen.getByText('Lead Software Architect')).toBeTruthy();
    expect(screen.getByText('Stripe')).toBeTruthy();
    expect(screen.getByText('Job')).toBeTruthy();
    expect(screen.getByText('infrastructure')).toBeTruthy();
  });

  it('calls onPress with result when clicked', async () => {
    const onPress = jest.fn();
    await render(<SearchResultRow result={mockResult} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(mockResult);
  });
});
