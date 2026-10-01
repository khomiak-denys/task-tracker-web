import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
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
    authServiceSpy = jasmine.createSpyObj('AuthService', ['currentUser', 'logout']);
    authServiceSpy.currentUser.and.returnValue({
      sub: 'user-123',
      email: 'test@example.com',
      unique_name: 'test_user',
      role: 'User',
      exp: 9999999999,
      iat: 1000000000,
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

  it('Init_Should_ComputeUserInitialAndSetDefaultState_When_Created', () => {
    expect(component).toBeTruthy();
    expect(component.snapshot.userInitial).toBe('T');
    expect(component.snapshot.dropdownOpen).toBeFalse();
  });

  it('toggleDropdown_Should_ToggleDropdownState_When_Invoked', () => {
    expect(component.snapshot.dropdownOpen).toBeFalse();

    component['toggleDropdown']();
    expect(component.snapshot.dropdownOpen).toBeTrue();

    component['toggleDropdown']();
    expect(component.snapshot.dropdownOpen).toBeFalse();
  });

  it('closeDropdown_Should_SetDropdownOpenToFalse_When_Invoked', () => {
    component['toggleDropdown']();
    expect(component.snapshot.dropdownOpen).toBeTrue();

    component['closeDropdown']();
    expect(component.snapshot.dropdownOpen).toBeFalse();
  });

  it('onProfile_Should_CloseDropdownAndNavigateToProfile_When_Invoked', () => {
    component['toggleDropdown']();
    component['onProfile']();

    expect(component.snapshot.dropdownOpen).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('onLogout_Should_NotifyAndCallAuthLogout_When_Invoked', () => {
    component['onLogout']();

    expect(notificationServiceSpy.info).toHaveBeenCalledWith('You have been signed out.');
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('onDocumentClick_Should_CloseDropdown_When_ClickedOutside', () => {
    component['toggleDropdown']();
    expect(component.snapshot.dropdownOpen).toBeTrue();

    const outsideElement = document.createElement('div');
    const mouseEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(mouseEvent, 'target', { value: outsideElement });

    component['onDocumentClick'](mouseEvent);
    expect(component.snapshot.dropdownOpen).toBeFalse();
  });

  it('onEscape_Should_CloseDropdown_When_EscapePressed', () => {
    component['toggleDropdown']();
    expect(component.snapshot.dropdownOpen).toBeTrue();

    component['onEscape']();
    expect(component.snapshot.dropdownOpen).toBeFalse();
  });
});

