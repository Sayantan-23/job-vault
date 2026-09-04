import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native-css/components';

import { Card } from './card';

describe('Card', () => {
  it('renders its children inside the surface', async () => {
    await render(
      <Card>
        <Text>card-body</Text>
      </Card>
    );

    expect(screen.getByText('card-body')).toBeTruthy();
  });
});
