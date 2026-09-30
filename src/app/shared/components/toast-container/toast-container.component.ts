import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastNotification } from '../../../core/models/notification.models';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  protected readonly notificationService = inject(NotificationService);

  protected onDismiss(id: string, event?: Event): void {
    event?.stopPropagation();
    this.notificationService.dismiss(id);
  }

  protected onAction(toast: ToastNotification): void {
    if (toast.action) {
      toast.action.onClick();
      this.notificationService.dismiss(toast.id);
    }
  }
}
