'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * True when the user has requested reduced motion. SSR-safe (returns false on
 * the server); call inside effects/handlers, not during render, for the live
 * value. Animated sections branch on this to resolve straight to the final
 * lit/filled/stamped state with no pulse, fill, or typewriter.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface UseRevealOptions {
  /** IntersectionObserver threshold. Default 0.2 (the prototype's value). */
  threshold?: number
  /** Skip observation and reveal on mount (e.g. for always-visible content). */
  immediate?: boolean
}

export interface UseRevealResult<T extends HTMLElement> {
  /** Attach to the element that should reveal (and carry `data-shown`). */
  ref: RefObject<T | null>
  /** Flips true the first time the element crosses the threshold, then stays. */
  shown: boolean
}

/**
 * Play-once reveal. Observes the ref'd element and, the first time it crosses
 * `threshold`, stamps `data-shown=""` on the node, flips `shown` to true, and
 * unobserves (fires once). `data-shown` drives the CSS reveal/energize rules
 * (`.reveal[data-shown]`, `[data-shown] .rail`, `.band-dark[data-shown] ...`);
 * `shown` lets a section kick off its imperative SVG draw via its own effect.
 */
export function useReveal<T extends HTMLElement = HTMLElement>(
  options: UseRevealOptions = {},
): UseRevealResult<T> {
  const { threshold = 0.2, immediate = false } = options
  const ref = useRef<T | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return

    const fire = () => {
      el.setAttribute('data-shown', '')
      setShown(true)
    }

    if (immediate || typeof IntersectionObserver === 'undefined') {
      fire()
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          fire()
          io.unobserve(entry.target)
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, immediate, shown])

  return { ref, shown }
}
