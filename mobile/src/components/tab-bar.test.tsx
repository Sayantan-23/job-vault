import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/tabs';

import { TabBar } from './tab-bar';

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const ROUTE_NAMES = ['index', 'answers', 'vault', 'activity'];

function makeProps(index: number) {
  return {
    state: {
      index,
      routes: ROUTE_NAMES.map((name) => ({ key: `${name}-0`, name, params: undefined })),
    },
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    },
    descriptors: {},
    insets: METRICS.insets,
  } as unknown as BottomTabBarProps;
}

function renderBar(props: BottomTabBarProps) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TabBar {...props} />
    </SafeAreaProvider>
  );
}

describe('TabBar', () => {
  it('renders the four tabs of d-0cd3wr', async () => {
    await renderBar(makeProps(0));

    for (const label of ['Jobs', 'Answers', 'Vault', 'Activity']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('navigates to a tab that is not focused', async () => {
    const props = makeProps(0);
    await renderBar(props);

    await fireEvent.press(screen.getByText('Answers'));

    expect(props.navigation.navigate).toHaveBeenCalledWith('answers', undefined);
  });

  it('does not navigate when the focused tab is pressed', async () => {
    const props = makeProps(0);
    await renderBar(props);

    await fireEvent.press(screen.getByText('Jobs'));

    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });
});
