import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ToastContainerComponent } from './toast-container.component';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastNotification } from '../../../core/models/notification.models';

describe('ToastContainerComponent', () => {
  let component: ToastContainerComponent;
  let fixture: ComponentFixture<ToastContainerComponent>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  const mockNotificationsSubject = new BehaviorSubject<ToastNotification[]>([]);

  beforeEach(async () => {
    notificationServiceMock = jasmine.createSpyObj('NotificationService', ['dismiss'], {
      notifications$: mockNotificationsSubject.asObservable(),
      notifications: () => mockNotificationsSubject.value,
    });

    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [{ provide: NotificationService, useValue: notificationServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Init_Should_CreateComponentSuccessfully_When_Instantiated', () => {
    expect(component).toBeTruthy();
  });

  it('onDismiss_Should_CallNotificationServiceDismiss_When_Invoked', () => {
    component['onDismiss']('toast-123');
    expect(notificationServiceMock.dismiss).toHaveBeenCalledWith('toast-123');
  });

  it('onAction_Should_ExecuteActionCallbackAndDismiss_When_Invoked', () => {
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
