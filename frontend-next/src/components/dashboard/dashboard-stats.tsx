import { StatCard } from './stat-card'
import type { DashboardStats as Stats } from '@/types/dashboard'

export function DashboardStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Total" value={stats.totalJobs} />
      <StatCard label="Applied" value={stats.byStatus.APPLIED} />
      <StatCard label="Interviewing" value={stats.byStatus.INTERVIEWING} />
      <StatCard label="Offers" value={stats.byStatus.OFFER} />
      <StatCard label="Ghost alerts" value={stats.ghostAlerts} accent />
    </div>
  )
}
