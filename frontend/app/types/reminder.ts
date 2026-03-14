export interface Reminder {
  id: string;
  jobId: string;
  userId: string;
  message: string;
  remindAt: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderRequest {
  message: string;
  remindAt: string; // ISO date string
}

export interface UpdateReminderRequest {
  message?: string;
  remindAt?: string;
  isCompleted?: boolean;
}
