import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { EMPTY_STATS } from '@/lib/dashboard-defaults'
import type { DashboardStats } from '@/types/dashboard'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  let stats: DashboardStats = EMPTY_STATS
  try {
    stats = await apiServer.get<DashboardStats>('/api/dashboard/stats')
  } catch {
    // Client `useStats` re-fetches (and silently refreshes the session) on mount.
    stats = EMPTY_STATS
  }

  // The header's NotificationBell calls useSearchParams(), so the client subtree
  // needs a Suspense boundary to prerender (matches the /app/jobs page).
  return (
    <Suspense fallback={null}>
      <DashboardOverview initialStats={stats} />
    </Suspense>
  )
}
