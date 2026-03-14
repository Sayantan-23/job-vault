import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default defineNuxtPlugin((nuxtApp) => {
  gsap.registerPlugin(ScrollTrigger)

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 2,
  })

  // Sync Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time: number) => lenis.raf(time * 1000))

  // Intentionally global — ensures Lenis-GSAP sync is smooth across all pages
  gsap.ticker.lagSmoothing(0)

  // Reset scroll position on route change
  nuxtApp.hook('page:finish', () => {
    lenis.scrollTo(0, { immediate: true })
  })

  return {
    provide: { lenis },
  }
})
