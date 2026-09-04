export interface Reminder {
  id: string
  jobId: string
  userId: string
  message: string
  remindAt: string
  isCompleted: boolean
  createdAt: string
}
