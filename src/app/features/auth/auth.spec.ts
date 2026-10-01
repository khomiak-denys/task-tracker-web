import { TestBed } from '@angular/core/testing';
import { AuthComponent } from './auth';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'register']);
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clear fields and set serverError on failed login attempt', () => {
    authServiceSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    component['loginForm'].setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    component['onSubmit']();

    // Fields should be cleared
    expect(component['loginForm'].get('email')?.value).toBe('');
    expect(component['loginForm'].get('password')?.value).toBe('');

    // Fields should be marked invalid with serverError
    expect(component['loginForm'].get('email')?.hasError('serverError')).toBeTrue();
    expect(component['loginForm'].get('email')?.touched).toBeTrue();
    expect(component['loginForm'].get('password')?.hasError('serverError')).toBeTrue();
    expect(component['loginForm'].get('password')?.touched).toBeTrue();
  });

  it('should toggle password visibility', () => {
    expect(component['showPassword']()).toBeFalse();
    component['togglePasswordVisibility']();
    expect(component['showPassword']()).toBeTrue();
  });
});
