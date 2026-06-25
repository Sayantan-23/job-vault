import type { Metadata } from 'next'
import { Geist, Geist_Mono, Newsreader } from 'next/font/google'
import { Providers } from '@/components/shared/providers'
import { ThemeScript } from '@/components/theme/theme-script'
import { SidebarScript } from '@/components/layout/app/sidebar-script'
import '@/styles/globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
// Editorial serif (headings + empty states). Variable font — no fixed weight.
const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-newsreader' })

export const metadata: Metadata = {
  title: { default: 'JobVault', template: '%s — JobVault' },
  description: 'Ghost-proof job application tracker.',
  metadataBase: new URL('http://localhost:8080'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Must run before paint, ahead of the React tree, to avoid a theme flash. */}
        <ThemeScript />
        <SidebarScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
