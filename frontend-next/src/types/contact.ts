export const CONTACT_CHANNELS = ['EMAIL', 'LINKEDIN', 'OTHER'] as const
export type ContactChannel = (typeof CONTACT_CHANNELS)[number]

export const CONTACT_STATUSES = ['NO_RESPONSE', 'HEARD_BACK', 'REFERRED', 'DECLINED'] as const
export type ContactStatus = (typeof CONTACT_STATUSES)[number]

export interface JobContact {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  jobId: string
  contact: string
  channel: ContactChannel | null
  status: ContactStatus
  reachedOutAt: string
  notes: string | null
}
