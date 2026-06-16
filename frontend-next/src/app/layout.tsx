import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { Providers } from '@/components/shared/providers'
import { ThemeScript } from '@/components/theme/theme-script'
import '@/styles/globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
})

export const metadata: Metadata = {
  title: { default: 'JobVault', template: '%s — JobVault' },
  description: 'Ghost-proof job application tracker.',
  metadataBase: new URL('http://localhost:8080'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Must run before paint, ahead of the React tree, to avoid a theme flash. */}
        <ThemeScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
