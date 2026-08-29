import {
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** Ignore jitter below this many points so the FAB does not flicker. */
const THRESHOLD = 8;

/**
 * Drives the FAB's hide-on-scroll-down / show-on-scroll-up behaviour (d-0cd3wr).
 * Returns a 0..1 shared value (0 = shown) and the scroll handler to attach to an
 * Animated scrollable.
 */
export function useHideOnScroll(): {
  hidden: SharedValue<number>;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
} {
  const hidden = useSharedValue(0);
  const lastY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y;
    const delta = y - lastY.value;
    if (Math.abs(delta) < THRESHOLD) return;
    lastY.value = y;
    hidden.value = withTiming(delta > 0 && y > 0 ? 1 : 0, { duration: 180 });
  });

  return { hidden, onScroll };
}
