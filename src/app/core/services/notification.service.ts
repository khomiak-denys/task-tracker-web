import { Injectable, signal } from '@angular/core';
import {
  NotificationOptions,
  NotificationType,
  ToastNotification,
} from '../models/notification.models';

const MAX_VISIBLE_TOASTS = 3;

const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 3000,
  info: 3000,
  warning: 3000,
  error: 3000,
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationsSignal = signal<ToastNotification[]>([]);
  private readonly queue: ToastNotification[] = [];
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Read-only list of active toast notifications (max 3 visible simultaneously). */
  readonly notifications = this.notificationsSignal.asReadonly();

  /**
   * Display a new notification toast, or queue it if 3 are already visible.
   */
  show(
    message: string,
    type: NotificationType = 'info',
    options?: NotificationOptions,
  ): string {
    const id = this.generateId();
    const durationMs = options?.durationMs ?? DEFAULT_DURATIONS[type];

    const notification: ToastNotification = {
      id,
      type,
      title: options?.title,
      message,
      durationMs,
      timestamp: new Date(),
      action: options?.action,
    };

    if (this.notificationsSignal().length < MAX_VISIBLE_TOASTS) {
      this.displayToast(notification);
    } else {
      this.queue.push(notification);
    }

    return id;
  }

  /** Convenience method for success toast. */
  success(message: string, title?: string, durationMs?: number): string {
    return this.show(message, 'success', { title, durationMs });
  }

  /** Convenience method for error toast. */
  error(message: string, title?: string, durationMs?: number): string {
    return this.show(message, 'error', { title, durationMs });
  }

  /** Convenience method for info toast. */
  info(message: string, title?: string, durationMs?: number): string {
    return this.show(message, 'info', { title, durationMs });
  }

  /** Convenience method for warning toast. */
  warning(message: string, title?: string, durationMs?: number): string {
    return this.show(message, 'warning', { title, durationMs });
  }

  /** Dismiss a single notification by id (active or queued). */
  dismiss(id: string): void {
    this.clearTimer(id);

    // If it was waiting in the queue, remove it
    const queueIdx = this.queue.findIndex((n) => n.id === id);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
      return;
    }

    // If visible, remove and promote next waiting toast from the queue
    const wasVisible = this.notificationsSignal().some((n) => n.id === id);
    if (wasVisible) {
      this.notificationsSignal.update((current) =>
        current.filter((n) => n.id !== id),
      );
      this.processQueue();
    }
  }

  /** Dismiss all active and queued notifications. */
  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.queue.length = 0;
    this.notificationsSignal.set([]);
  }

  private displayToast(notification: ToastNotification): void {
    this.notificationsSignal.update((current) => [...current, notification]);
    this.startTimer(notification);
  }

  private processQueue(): void {
    while (
      this.notificationsSignal().length < MAX_VISIBLE_TOASTS &&
      this.queue.length > 0
    ) {
      const nextToast = this.queue.shift();
      if (nextToast) {
        this.displayToast(nextToast);
      }
    }
  }

  private startTimer(notification: ToastNotification): void {
    if (notification.durationMs > 0) {
      this.clearTimer(notification.id);
      const timer = setTimeout(() => {
        this.dismiss(notification.id);
      }, notification.durationMs);
      this.timers.set(notification.id, timer);
    }
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  private generateId(): string {
    return 'toast-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  }
}
