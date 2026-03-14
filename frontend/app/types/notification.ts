export type NotificationType = 'GHOST_ALERT' | 'REMINDER' | 'STATUS_CHANGE' | 'GENERAL';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedJobId?: string;
  createdAt: string;
}
