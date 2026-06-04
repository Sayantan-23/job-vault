'use client'

import { useEffect, useState } from 'react'

// Returns `value` delayed by `delayMs`; rapid changes within the window collapse
// to the final value (the timer resets on each change).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}
