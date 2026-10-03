import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly rolesUrl = `${environment.apiBaseUrl}/api/v1/roles`;
  private readonly usersUrl = `${environment.apiBaseUrl}/api/v1/users`;

  constructor(private readonly http: HttpClient) {}

  /** GET /api/v1/roles (Admin only) */
  getAll(): Observable<string[]> {
    return this.http.get<string[]>(this.rolesUrl, {
      withCredentials: true,
    });
  }

  /** GET /api/v1/users/{userId}/roles */
  getForUser(userId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.usersUrl}/${userId}/roles`, {
      withCredentials: true,
    });
  }

  /** POST /api/v1/users/{userId}/roles/{role} (Admin only) */
  assignRole(userId: string, role: string): Observable<void> {
    return this.http.post<void>(`${this.usersUrl}/${userId}/roles/${role}`, null, {
      withCredentials: true,
    });
  }

  /** DELETE /api/v1/users/{userId}/roles/{role} (Admin only) */
  removeRole(userId: string, role: string): Observable<void> {
    return this.http.delete<void>(`${this.usersUrl}/${userId}/roles/${role}`, {
      withCredentials: true,
    });
  }
}
