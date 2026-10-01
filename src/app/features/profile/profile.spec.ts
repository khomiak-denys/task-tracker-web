import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { ProfileComponent } from './profile';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserProfile } from '../../core/models/user.models';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  const mockProfile: UserProfile = {
    id: 'user-123',
    userName: 'john_doe',
    email: 'john@example.com',
    fullName: 'John Doe',
    roles: ['User'],
    emailConfirmed: true,
    twoFactorEnabled: false,
    lockoutEnd: null,
    lockoutEnabled: false,
    accessFailedCount: 0,
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['currentUserId', 'currentUser'], {
      currentUserId: signal('user-123'),
      currentUser: signal({
        sub: 'user-123',
        email: 'john@example.com',
        unique_name: 'john_doe',
        role: 'User',
        exp: 9999999999,
        iat: 1000000000,
      }),
    });

    userServiceSpy = jasmine.createSpyObj('UserService', [
      'getProfile',
      'updateProfile',
      'changePassword',
    ]);
    userServiceSpy.getProfile.and.returnValue(of(mockProfile));

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['success', 'error', 'info']);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } },
            paramMap: of({ get: () => null }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load profile on init', () => {
    expect(component).toBeTruthy();
    expect(userServiceSpy.getProfile).toHaveBeenCalledWith('user-123');
    expect(component['profile']()).toEqual(mockProfile);
  });

  it('should update profile when onSaveProfile is called with valid form', () => {
    userServiceSpy.updateProfile.and.returnValue(of(void 0));

    component['profileForm'].patchValue({
      fullName: 'Johnathan Doe',
      userName: 'john_doe',
    });

    component['onSaveProfile']();

    expect(userServiceSpy.updateProfile).toHaveBeenCalledWith('user-123', {
      fullName: 'Johnathan Doe',
      userName: 'john_doe',
    });
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('should change password when onChangePassword is called with valid form', () => {
    userServiceSpy.changePassword.and.returnValue(of(void 0));

    component['passwordForm'].setValue({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      confirmNewPassword: 'NewPassword123!',
    });

    component['onChangePassword']();

    expect(userServiceSpy.changePassword).toHaveBeenCalledWith('user-123', {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    });
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });
});
