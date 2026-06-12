'use client'

import { useCallback, useRef } from 'react'

// Below lg the workspace editor pane stacks underneath the library list, so
// selecting a row (or finishing a generation) changes nothing in the
// viewport. `reveal()` scrolls the ref target into view — only below lg;
// on lg+ the pane already sits beside the list (sticky), so it no-ops.
export function useRevealBelowLg<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const reveal = useCallback(() => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])
  return { ref, reveal }
}
