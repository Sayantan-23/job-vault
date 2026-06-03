'use client'

import { useStats } from '@/hooks/use-dashboard'
import { DashboardStats } from './dashboard-stats'
import type { DashboardStats as Stats } from '@/types/dashboard'

export function DashboardOverview({ initialStats }: { initialStats: Stats }) {
  const { data } = useStats(initialStats)
  const stats = data ?? initialStats

  return (
    <section className="space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your job search at a glance.</p>
      </div>
      <DashboardStats stats={stats} />
    </section>
  )
}
