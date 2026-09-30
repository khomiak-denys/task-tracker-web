import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ToastContainerComponent } from './toast-container.component';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastNotification } from '../../../core/models/notification.models';

describe('ToastContainerComponent', () => {
  let component: ToastContainerComponent;
  let fixture: ComponentFixture<ToastContainerComponent>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  const mockNotificationsSignal = signal<ToastNotification[]>([]);

  beforeEach(async () => {
    notificationServiceMock = jasmine.createSpyObj('NotificationService', ['dismiss'], {
      notifications: mockNotificationsSignal.asReadonly(),
    });

    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [{ provide: NotificationService, useValue: notificationServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create successfully', () => {
    expect(component).toBeTruthy();
  });

  it('should dismiss notification when onDismiss is called', () => {
    component['onDismiss']('toast-123');
    expect(notificationServiceMock.dismiss).toHaveBeenCalledWith('toast-123');
  });

  it('should trigger action and dismiss toast on onAction', () => {
    const actionSpy = jasmine.createSpy('onClick');
    const toast: ToastNotification = {
      id: 'toast-1',
      type: 'info',
      message: 'Test message',
      durationMs: 3000,
      timestamp: new Date(),
      action: {
        label: 'Retry',
        onClick: actionSpy,
      },
    };

    component['onAction'](toast);

    expect(actionSpy).toHaveBeenCalledTimes(1);
    expect(notificationServiceMock.dismiss).toHaveBeenCalledWith('toast-1');
  });
});
