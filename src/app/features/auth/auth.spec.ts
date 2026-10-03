import { TestBed } from '@angular/core/testing';
import { AuthComponent } from './auth';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'register', 'isAdmin']);
    authServiceSpy.isAdmin.and.returnValue(false);
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

  it('Init_Should_CreateComponent_When_Instantiated', () => {
    expect(component).toBeTruthy();
    expect(component.snapshot.mode).toBe('login');
    expect(component.snapshot.loading).toBeFalse();
    expect(component.snapshot.showPassword).toBeFalse();
    expect(component.snapshot.showConfirmPassword).toBeFalse();
  });

  it('togglePasswordVisibility_Should_ToggleShowPasswordState_When_Called', () => {
    expect(component.snapshot.showPassword).toBeFalse();
    component['togglePasswordVisibility']();
    expect(component.snapshot.showPassword).toBeTrue();
    component['togglePasswordVisibility']();
    expect(component.snapshot.showPassword).toBeFalse();
  });

  it('toggleConfirmPasswordVisibility_Should_ToggleShowConfirmPasswordState_When_Called', () => {
    expect(component.snapshot.showConfirmPassword).toBeFalse();
    component['toggleConfirmPasswordVisibility']();
    expect(component.snapshot.showConfirmPassword).toBeTrue();
    component['toggleConfirmPasswordVisibility']();
    expect(component.snapshot.showConfirmPassword).toBeFalse();
  });

  it('switchMode_Should_UpdateAuthModeState_When_NewModeProvided', () => {
    expect(component.snapshot.mode).toBe('login');
    component['switchMode']('register');
    expect(component.snapshot.mode).toBe('register');
    component['switchMode']('login');
    expect(component.snapshot.mode).toBe('login');
  });

  it('onSubmit_Should_MarkFieldsTouched_When_LoginFormIsInvalid', () => {
    component['onSubmit']();

    expect(component['loginForm'].get('email')?.touched).toBeTrue();
    expect(component['loginForm'].get('password')?.touched).toBeTrue();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('onSubmit_Should_NavigateToWorkspacesAndNotify_When_UserLoginSucceeds', () => {
    authServiceSpy.login.and.returnValue(of('mock-token'));
    authServiceSpy.isAdmin.and.returnValue(false);

    component['loginForm'].setValue({
      email: 'user@example.com',
      password: 'password123',
    });

    component['onSubmit']();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(notificationServiceSpy.success).toHaveBeenCalledWith(
      'Welcome back! You have successfully signed in.',
    );
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/workspaces']);
    expect(component.snapshot.loading).toBeFalse();
  });

  it('onSubmit_Should_NavigateToAdmin_When_AdminLoginSucceeds', () => {
    authServiceSpy.login.and.returnValue(of('mock-token'));
    authServiceSpy.isAdmin.and.returnValue(true);

    component['loginForm'].setValue({
      email: 'admin@example.com',
      password: 'password123',
    });

    component['onSubmit']();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('onSubmit_Should_ClearFieldsAndSetServerError_When_LoginFails', () => {
    authServiceSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    component['loginForm'].setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    component['onSubmit']();

    expect(component['loginForm'].get('email')?.value).toBe('');
    expect(component['loginForm'].get('password')?.value).toBe('');
    expect(component['loginForm'].get('email')?.hasError('serverError')).toBeTrue();
    expect(component['loginForm'].get('email')?.touched).toBeTrue();
    expect(component['loginForm'].get('password')?.hasError('serverError')).toBeTrue();
    expect(component['loginForm'].get('password')?.touched).toBeTrue();
    expect(component.snapshot.loading).toBeFalse();
  });

  it('onSubmit_Should_MarkFieldsTouched_When_RegisterFormIsInvalid', () => {
    component['switchMode']('register');

    component['onSubmit']();

    expect(component['registerForm'].get('email')?.touched).toBeTrue();
    expect(component['registerForm'].get('userName')?.touched).toBeTrue();
    expect(component['registerForm'].get('password')?.touched).toBeTrue();
    expect(component['registerForm'].get('confirmPassword')?.touched).toBeTrue();
    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('onSubmit_Should_NavigateAndNotify_When_RegisterSucceeds', () => {
    authServiceSpy.register.and.returnValue(of('mock-token'));
    component['switchMode']('register');

    component['registerForm'].setValue({
      email: 'newuser@example.com',
      userName: 'newuser',
      password: 'password123',
      confirmPassword: 'password123',
    });

    component['onSubmit']();

    expect(authServiceSpy.register).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      userName: 'newuser',
      password: 'password123',
    });
    expect(notificationServiceSpy.success).toHaveBeenCalledWith(
      'Account created successfully! Welcome aboard.',
    );
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/workspaces']);
    expect(component.snapshot.loading).toBeFalse();
  });

  it('onSubmit_Should_MapFieldErrors_When_RegisterFailsWithValidationErrors', () => {
    authServiceSpy.register.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              errors: {
                UserName: ['Username is already taken.'],
                Email: ['Email is invalid.'],
                Password: ['Password is too weak.'],
              },
            },
          }),
      ),
    );
    component['switchMode']('register');

    component['registerForm'].setValue({
      email: 'taken@example.com',
      userName: 'takenuser',
      password: 'password123',
      confirmPassword: 'password123',
    });

    component['onSubmit']();

    expect(component['registerForm'].get('userName')?.hasError('serverError')).toBeTrue();
    expect(component['registerForm'].get('email')?.hasError('serverError')).toBeTrue();
    expect(component['registerForm'].get('password')?.hasError('serverError')).toBeTrue();
    expect(component['registerForm'].get('confirmPassword')?.hasError('serverError')).toBeTrue();
    expect(component.snapshot.loading).toBeFalse();
  });

  it('passwordMatchValidator_Should_SetPasswordMismatchError_When_PasswordsDoNotMatch', () => {
    component['switchMode']('register');
    component['registerForm'].patchValue({
      password: 'password123',
      confirmPassword: 'differentPassword',
    });

    expect(component['registerForm'].hasError('passwordMismatch')).toBeTrue();

    component['registerForm'].patchValue({
      confirmPassword: 'password123',
    });

    expect(component['registerForm'].hasError('passwordMismatch')).toBeFalse();
  });
});

