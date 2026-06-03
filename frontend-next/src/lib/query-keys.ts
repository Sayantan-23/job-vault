export const JOBS_KEY = ['jobs'] as const
export const jobKey = (id: string) => ['jobs', id] as const
export const DASHBOARD_KANBAN_KEY = ['dashboard', 'kanban'] as const
export const DASHBOARD_STATS_KEY = ['dashboard', 'stats'] as const
export const TIMELINE_KEY = ['timeline'] as const
export const timelineKey = (jobId: string) => ['timeline', jobId] as const
export const NOTIFICATIONS_KEY = ['notifications'] as const
export const remindersKey = (jobId: string) => ['reminders', jobId] as const
