import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/users`;

  constructor(private readonly http: HttpClient) {}

  /** GET /api/v1/users/{id} */
  getProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${userId}`, {
      withCredentials: true,
    });
  }

  /** PUT /api/v1/users/{id}/profile */
  updateProfile(userId: string, request: UpdateProfileRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${userId}/profile`, request, {
      withCredentials: true,
    });
  }

  /** PUT /api/v1/users/{id}/password */
  changePassword(userId: string, request: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${userId}/password`, request, {
      withCredentials: true,
    });
  }
}
