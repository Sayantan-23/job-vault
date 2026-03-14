export const API_BASE_URL = '/api';

export const JOB_STATUSES = [
  'WISHLIST',
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'ARCHIVED',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  WISHLIST: 'Wishlist',
  APPLIED: 'Applied',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  WISHLIST: 'neutral',
  APPLIED: 'info',
  INTERVIEWING: 'warning',
  OFFER: 'success',
  REJECTED: 'error',
  ARCHIVED: 'neutral',
};

/** Ghost days thresholds */
export const GHOST_DAYS_ACTIVE_THRESHOLD = 7;
export const GHOST_DAYS_STALE_THRESHOLD = 14;
