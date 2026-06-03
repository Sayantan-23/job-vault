'use client'

import { useStats } from '@/hooks/use-dashboard'
import { PageHeader } from '@/components/layout/app/page-header'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { DashboardStats } from './dashboard-stats'
import type { DashboardStats as Stats } from '@/types/dashboard'

export function DashboardOverview({ initialStats }: { initialStats: Stats }) {
  const { data } = useStats(initialStats)
  const stats = data ?? initialStats

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Dashboard" description="Your job search at a glance." actions={<NotificationBell />} />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <DashboardStats stats={stats} />
      </div>
    </div>
  )
}
