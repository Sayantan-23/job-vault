import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'JobVault' }

export default function LandingPage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>JobVault</h1>
      <p>Landing page placeholder. Public pages live under /about, /faq, /contact, /privacy, /terms.</p>
    </main>
  )
}
