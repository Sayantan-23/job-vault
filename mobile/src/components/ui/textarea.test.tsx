import { render, screen } from '@testing-library/react-native';

import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders with its placeholder and value, and is multiline', async () => {
    await render(<Textarea placeholder="Notes…" value="hi" onChangeText={() => {}} />);

    const field = screen.getByPlaceholderText('Notes…');
    expect(field.props.value).toBe('hi');
    expect(field.props.multiline).toBe(true);
  });
});
