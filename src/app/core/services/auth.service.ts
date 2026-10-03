import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  distinctUntilChanged,
  map,
  tap,
  catchError,
  of,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  JwtPayload,
} from '../models/auth.models';

const TOKEN_KEY = 'access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/auth`;
  private readonly tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());

  /** Reactive stream of the current access token. */
  readonly token$: Observable<string | null> = this.tokenSubject.asObservable();

  /** Reactive stream of whether the user holds a non-expired token. */
  readonly isAuthenticated$: Observable<boolean> = this.token$.pipe(
    map((t) => {
      if (!t) return false;
      const payload = this.decodeToken(t);
      return payload !== null && payload.exp * 1000 > Date.now();
    }),
    distinctUntilChanged(),
  );

  /** Reactive stream of the decoded user payload. */
  readonly currentUser$: Observable<JwtPayload | null> = this.token$.pipe(
    map((t) => (t ? this.decodeToken(t) : null)),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );

  /** Reactive stream of normalized user ID from current token. */
  readonly currentUserId$: Observable<string | null> = this.currentUser$.pipe(
    map((user) => user?.sub || null),
    distinctUntilChanged(),
  );

  /** Reactive stream of whether the current user has the Admin role. */
  readonly isAdmin$: Observable<boolean> = this.currentUser$.pipe(
    map((user) => {
      if (!user || !user.role) return false;
      if (Array.isArray(user.role)) return user.role.includes('Admin');
      return user.role === 'Admin';
    }),
    distinctUntilChanged(),
  );


  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  /** Synchronous check whether current token is valid and unexpired. */
  isAuthenticated(): boolean {
    const t = this.tokenSubject.value;
    if (!t) return false;
    const payload = this.decodeToken(t);
    return payload !== null && payload.exp * 1000 > Date.now();
  }

  /** Synchronous check whether current user holds the Admin role. */
  isAdmin(): boolean {
    const user = this.currentUser();
    if (!user || !user.role) return false;
    if (Array.isArray(user.role)) return user.role.includes('Admin');
    return user.role === 'Admin';
  }


  /** Synchronous getter for currently decoded user. */
  currentUser(): JwtPayload | null {
    const t = this.tokenSubject.value;
    return t ? this.decodeToken(t) : null;
  }

  /** Synchronous getter for current user ID. */
  currentUserId(): string | null {
    return this.currentUser()?.sub || null;
  }

  /** Synchronous getter for current raw token. */
  token(): string | null {
    return this.tokenSubject.value;
  }

  /** POST /api/v1/auth/login */
  login(request: LoginRequest): Observable<string> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, request, {
        withCredentials: true,
      })
      .pipe(
        map((res) => this.extractToken(res)),
        tap((token) => this.storeToken(token)),
      );
  }

  /** POST /api/v1/auth/register */
  register(request: RegisterRequest): Observable<string> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, request, {
        withCredentials: true,
      })
      .pipe(
        map((res) => this.extractToken(res)),
        tap((token) => this.storeToken(token)),
      );
  }

  /**
   * POST /api/v1/auth/refresh
   * Sends the expired access token in the Authorization header;
   * the httpOnly refresh-token cookie is sent automatically by the browser.
   */
  refresh(): Observable<string | null> {
    return this.http
      .post<AuthResponse>(
        `${this.apiUrl}/refresh`,
        null,
        { withCredentials: true },
      )
      .pipe(
        map((res) => this.extractToken(res)),
        tap((token) => this.storeToken(token)),
        catchError(() => {
          this.clearToken();
          return of(null);
        }),
      );
  }

  /** POST /api/v1/auth/revoke -- clears refresh cookie server-side. */
  revoke(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/revoke`, null, { withCredentials: true })
      .pipe(tap(() => this.clearToken()));
  }

  /** Remove local token and navigate to auth page. */
  logout(): void {
    this.revoke().subscribe({
      complete: () => this.router.navigate(['/auth']),
      error: () => {
        this.clearToken();
        this.router.navigate(['/auth']);
      },
    });
  }

  /** Read raw token from localStorage. */
  getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private storeToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.tokenSubject.next(token);
  }

  private clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenSubject.next(null);
  }

  /** Normalize backend response -- the JWT may arrive as `token` or `accessToken`. */
  private extractToken(response: AuthResponse): string {
    const token = response.token ?? response.accessToken;
    if (!token) {
      throw new Error('No token found in authentication response');
    }
    return token;
  }

  /** Decode a JWT without external libraries (base64url) and normalize claims. */
  private decodeToken(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const raw = JSON.parse(atob(payload)) as Record<string, unknown>;

      const sub =
        (raw['sub'] as string) ||
        (raw['nameid'] as string) ||
        (raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] as string) ||
        '';

      const email =
        (raw['email'] as string) ||
        (raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as string) ||
        '';

      const unique_name =
        (raw['unique_name'] as string) ||
        (raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] as string) ||
        (raw['name'] as string) ||
        '';

      const role =
        (raw['role'] as string | string[]) ||
        (raw['roles'] as string | string[]) ||
        (raw['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string | string[]) ||
        'User';

      return {
        ...raw,
        sub,
        email,
        unique_name,
        name: (raw['name'] as string) || unique_name,
        role,
        exp: typeof raw['exp'] === 'number' ? raw['exp'] : 0,
        iat: typeof raw['iat'] === 'number' ? raw['iat'] : 0,
      } as JwtPayload;
    } catch {
      return null;
    }
  }
}
