import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['currentUser', 'logout'], {
      currentUser: signal({
        sub: 'user-123',
        email: 'test@example.com',
        unique_name: 'test_user',
        role: 'User',
        exp: 9999999999,
        iat: 1000000000,
      }),
    });

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['info']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and compute userInitial', () => {
    expect(component).toBeTruthy();
    expect(component['userInitial']()).toBe('T');
  });

  it('should toggle dropdown open and close', () => {
    expect(component['dropdownOpen']()).toBeFalse();

    component['toggleDropdown']();
    expect(component['dropdownOpen']()).toBeTrue();

    component['closeDropdown']();
    expect(component['dropdownOpen']()).toBeFalse();
  });

  it('should navigate to /profile on onProfile', () => {
    component['toggleDropdown']();
    component['onProfile']();

    expect(component['dropdownOpen']()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('should notify and logout on onLogout', () => {
    component['onLogout']();

    expect(notificationServiceSpy.info).toHaveBeenCalledWith('You have been signed out.');
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
