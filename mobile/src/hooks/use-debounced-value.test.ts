import { act, renderHook } from '@testing-library/react-native';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', async () => {
    const { result } = await renderHook(() => useDebouncedValue('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('updates debounced value after delay', async () => {
    const { result, rerender } = await renderHook(
      (props: { value: string; delay: number }) =>
        useDebouncedValue(props.value, props.delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    await rerender({ value: 'updated', delay: 300 });
    expect(result.current).toBe('initial');

    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('collapses rapid updates to the final value', async () => {
    const { result, rerender } = await renderHook(
      (props: { value: string; delay: number }) =>
        useDebouncedValue(props.value, props.delay),
      { initialProps: { value: 'first', delay: 300 } }
    );

    await rerender({ value: 'second', delay: 300 });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await rerender({ value: 'third', delay: 300 });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await rerender({ value: 'fourth', delay: 300 });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('fourth');
  });
});
