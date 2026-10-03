import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TaskResult,
  TaskDetailsResult,
  PaginationResult,
  CreateTaskRequest,
  UpdateTaskRequest,
  ChangeStatusRequest,
  LogTimeRequest,
} from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/tasks`;

  constructor(private readonly http: HttpClient) {}

  /** GET /api/v1/tasks?page={page}&pageSize={pageSize} */
  getAll(page: number = 1, pageSize: number = 10): Observable<PaginationResult<TaskResult>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PaginationResult<TaskResult>>(this.apiUrl, {
      params,
      withCredentials: true,
    });
  }

  /** GET /api/v1/tasks/my?type={type}&page={page}&pageSize={pageSize} */
  getMy(
    type?: string | null,
    page: number = 1,
    pageSize: number = 10,
  ): Observable<PaginationResult<TaskResult>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (type) {
      params = params.set('type', type);
    }

    return this.http.get<PaginationResult<TaskResult>>(`${this.apiUrl}/my`, {
      params,
      withCredentials: true,
    });
  }

  /** GET /api/v1/tasks/{id} */
  getById(id: string): Observable<TaskDetailsResult> {
    return this.http.get<TaskDetailsResult>(`${this.apiUrl}/${id}`, {
      withCredentials: true,
    });
  }

  /** POST /api/v1/tasks */
  create(request: CreateTaskRequest): Observable<string> {
    return this.http.post<string>(this.apiUrl, request, {
      withCredentials: true,
    });
  }

  /** PUT /api/v1/tasks/{id} */
  update(id: string, request: UpdateTaskRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, request, {
      withCredentials: true,
    });
  }

  /** PUT /api/v1/tasks/{id}/assign/{userId} */
  assign(id: string, userId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/assign/${userId}`, null, {
      withCredentials: true,
    });
  }

  /** PATCH /api/v1/tasks/{id}/status */
  changeStatus(id: string, request: ChangeStatusRequest): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, request, {
      withCredentials: true,
    });
  }

  /** POST /api/v1/tasks/{id}/time-logs */
  logTime(id: string, request: LogTimeRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/time-logs`, request, {
      withCredentials: true,
    });
  }

  /** POST /api/v1/tasks/{id}/complete */
  complete(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/complete`, null, {
      withCredentials: true,
    });
  }

  /** DELETE /api/v1/tasks/{id} */
  cancel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true,
    });
  }
}
