import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, of } from 'rxjs';
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
  private readonly tokenSignal = signal<string | null>(this.getStoredToken());

  /** Reactive read-only token value. */
  readonly token = this.tokenSignal.asReadonly();

  /** Whether the user currently holds a non-expired token. */
  readonly isAuthenticated = computed(() => {
    const t = this.tokenSignal();
    if (!t) return false;
    const payload = this.decodeToken(t);
    return payload !== null && payload.exp * 1000 > Date.now();
  });

  /** Decoded user information from the token. */
  readonly currentUser = computed(() => {
    const t = this.tokenSignal();
    return t ? this.decodeToken(t) : null;
  });

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

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
    this.tokenSignal.set(token);
  }

  private clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenSignal.set(null);
  }

  /** Normalize backend response -- the JWT may arrive as `token` or `accessToken`. */
  private extractToken(response: AuthResponse): string {
    const token = response.token ?? response.accessToken;
    if (!token) {
      throw new Error('No token found in authentication response');
    }
    return token;
  }

  /** Decode a JWT without external libraries (base64url). */
  private decodeToken(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      return JSON.parse(atob(payload)) as JwtPayload;
    } catch {
      return null;
    }
  }
}
