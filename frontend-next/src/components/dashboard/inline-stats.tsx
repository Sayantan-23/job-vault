import type { DashboardStats } from '@/types/dashboard'

/**
 * The quiet inline replacement for the KPI stat-card grid. One muted text row of
 * mono numerals — editorial, not boxed widgets — surfacing only the actionable
 * signal ("going quiet") in the ghost accent when there are alerts.
 */
export function InlineStats({ stats }: { stats: DashboardStats }) {
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-1.5 text-sm text-muted-foreground">
      <Stat value={stats.totalJobs} label="tracked" />
      <Stat value={stats.byStatus.INTERVIEWING} label="interviewing" />
      <Stat value={stats.ghostAlerts} label="going quiet" accent={stats.ghostAlerts > 0} />
    </div>
  )
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <span className={accent ? 'text-ghost-ghosted' : 'text-muted-foreground'}>
      <b className={`mr-1.5 font-mono font-medium tabular-nums ${accent ? '' : 'text-foreground'}`}>
        {value}
      </b>
      {label}
    </span>
  )
}
