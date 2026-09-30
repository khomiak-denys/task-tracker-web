export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  durationMs: number;
  timestamp: Date;
  action?: NotificationAction;
}

export interface NotificationOptions {
  title?: string;
  durationMs?: number;
  action?: NotificationAction;
}