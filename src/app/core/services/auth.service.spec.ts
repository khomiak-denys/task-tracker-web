import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  // Helper to create a valid base64url encoded JWT payload
  function createMockJwt(sub: string, email: string, expInSecondsFromNow: number): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const nowSec = Math.floor(Date.now() / 1000);
    const payloadObj = {
      sub,
      email,
      unique_name: 'test_user',
      role: 'User',
      iat: nowSec,
      exp: nowSec + expInSecondsFromNow,
    };
    const payload = btoa(JSON.stringify(payloadObj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    return `${header}.${payload}.signature`;
  }

  beforeEach(() => {
    localStorage.clear();
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('login_Should_StoreTokenAndEmit_When_RequestSucceeds', () => {
    const mockToken = createMockJwt('user-1', 'test@example.com', 3600);
    let emittedToken: string | null = null;
    service.token$.subscribe((t) => (emittedToken = t));

    service.login({ email: 'test@example.com', password: 'password123' }).subscribe((token) => {
      expect(token).toBe(mockToken);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ token: mockToken });

    expect(service.getStoredToken()).toBe(mockToken);
    expect<string | null>(emittedToken).toBe(mockToken);
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()?.email).toBe('test@example.com');
  });

  it('register_Should_StoreTokenAndEmit_When_RequestSucceeds', () => {
    const mockToken = createMockJwt('user-2', 'new@example.com', 3600);

    service.register({ email: 'new@example.com', userName: 'newuser', password: 'password123' }).subscribe((token) => {
      expect(token).toBe(mockToken);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush({ token: mockToken });

    expect(service.getStoredToken()).toBe(mockToken);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('refresh_Should_UpdateToken_When_RefreshSucceeds', () => {
    const refreshedToken = createMockJwt('user-3', 'refresh@example.com', 3600);

    service.refresh().subscribe((token) => {
      expect(token).toBe(refreshedToken);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/auth/refresh`);
    expect(req.request.method).toBe('POST');
    req.flush({ token: refreshedToken });

    expect(service.getStoredToken()).toBe(refreshedToken);
  });

  it('refresh_Should_ClearTokenAndReturnNull_When_RefreshFails', () => {
    service.refresh().subscribe((token) => {
      expect(token).toBeNull();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/auth/refresh`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(service.getStoredToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('revoke_Should_ClearStoredToken_When_RequestSucceeds', () => {
    localStorage.setItem('access_token', 'sample-token');

    service.revoke().subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/auth/revoke`);
    req.flush(null);

    expect(service.getStoredToken()).toBeNull();
  });

  it('logout_Should_RevokeTokenAndNavigateToAuth_When_Invoked', () => {
    service.logout();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/auth/revoke`);
    req.flush(null);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth']);
  });

  it('isAuthenticated_Should_ReturnFalse_When_NoTokenOrTokenExpired', () => {
    expect(service.isAuthenticated()).toBeFalse();

    const expiredToken = createMockJwt('user-expired', 'expired@example.com', -100);
    localStorage.setItem('access_token', expiredToken);
    expect(service.isAuthenticated()).toBeFalse();
  });
});
