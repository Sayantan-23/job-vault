export const JOBS_KEY = ['jobs'] as const
export const jobKey = (id: string) => ['jobs', id] as const
export const DASHBOARD_KANBAN_KEY = ['dashboard', 'kanban'] as const
export const DASHBOARD_STATS_KEY = ['dashboard', 'stats'] as const
