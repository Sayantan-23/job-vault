import { fireEvent, render, screen } from '@testing-library/react-native';

import { Input } from './input';
import { Label } from './label';

describe('Input + Label', () => {
  it('renders its label and placeholder', async () => {
    await render(
      <>
        <Label>Email</Label>
        <Input placeholder="you@example.com" />
      </>
    );

    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
  });

  it('forwards typing to onChangeText', async () => {
    const onChangeText = jest.fn();
    await render(<Input placeholder="you@example.com" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'ada@example.com');

    expect(onChangeText).toHaveBeenCalledWith('ada@example.com');
  });
});
