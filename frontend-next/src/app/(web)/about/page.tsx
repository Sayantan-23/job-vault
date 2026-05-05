import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'About' }
export default function AboutPage() {
  return <section className="mx-auto max-w-5xl px-6 py-12"><h1>About</h1></section>
}
