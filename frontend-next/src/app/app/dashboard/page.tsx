import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { DashboardSkeleton } from '@/components/layout/app/route-skeletons'
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
  // needs a Suspense boundary to prerender (matches the /app/jobs page). Its
  // fallback is the page skeleton, not null — on client navigation this boundary
  // (not loading.tsx) is what suspends while the workspace mounts, so a null
  // fallback rendered the whole content area, header included, blank.
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardOverview initialStats={stats} />
    </Suspense>
  )
}
