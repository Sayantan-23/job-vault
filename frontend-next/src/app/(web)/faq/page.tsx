import type { Metadata } from 'next'
import { ComingSoon } from '@/components/shared/coming-soon'

export const metadata: Metadata = { title: 'FAQ' }

export default function FaqPage() {
  return <ComingSoon title="FAQ" />
}
