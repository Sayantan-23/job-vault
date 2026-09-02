import type { ReactNode } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

/** A 390×844 phone with the usual notch/gesture-bar insets. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Any primitive that paints into the safe area needs a provider under test —
 * useSafeAreaInsets throws without one. Same metrics as tab-bar.test.tsx.
 */
export function withSafeArea(children: ReactNode) {
  return <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>;
}
