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
  TaskFilterParams,
} from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/tasks`;

  constructor(private readonly http: HttpClient) {}

  /** GET /api/v1/tasks?page={page}&pageSize={pageSize}&... */
  getAll(
    pageOrParams: number | TaskFilterParams = 1,
    pageSize: number = 10,
    search?: string | null,
    status?: string | null,
    priority?: string | null,
    workspaceId?: string | null,
  ): Observable<PaginationResult<TaskResult>> {
    let params = new HttpParams();

    if (typeof pageOrParams === 'object' && pageOrParams !== null) {
      params = params
        .set('page', (pageOrParams.page ?? 1).toString())
        .set('pageSize', (pageOrParams.pageSize ?? 10).toString());

      if (pageOrParams.workspaceId) params = params.set('workspaceId', pageOrParams.workspaceId);
      if (pageOrParams.search) params = params.set('search', pageOrParams.search);
      if (pageOrParams.status) params = params.set('status', pageOrParams.status);
      if (pageOrParams.priority) params = params.set('priority', pageOrParams.priority);
      if (pageOrParams.assigneeId) params = params.set('assigneeId', pageOrParams.assigneeId);
      if (pageOrParams.createdById) params = params.set('createdById', pageOrParams.createdById);
      if (pageOrParams.tag) params = params.set('tag', pageOrParams.tag);
      if (pageOrParams.type) params = params.set('type', pageOrParams.type);
    } else {
      params = params
        .set('page', pageOrParams.toString())
        .set('pageSize', pageSize.toString());

      if (workspaceId) params = params.set('workspaceId', workspaceId);
      if (search) params = params.set('search', search);
      if (status) params = params.set('status', status);
      if (priority) params = params.set('priority', priority);
    }

    return this.http.get<PaginationResult<TaskResult>>(this.apiUrl, {
      params,
      withCredentials: true,
    });
  }

  /** GET /api/v1/tasks/my?type={type}&page={page}&pageSize={pageSize}&... */
  getMy(
    typeOrParams?: string | TaskFilterParams | null,
    page: number = 1,
    pageSize: number = 10,
    search?: string | null,
    status?: string | null,
    priority?: string | null,
  ): Observable<PaginationResult<TaskResult>> {
    let params = new HttpParams();

    if (typeof typeOrParams === 'object' && typeOrParams !== null) {
      params = params
        .set('page', (typeOrParams.page ?? 1).toString())
        .set('pageSize', (typeOrParams.pageSize ?? 10).toString());

      if (typeOrParams.workspaceId) params = params.set('workspaceId', typeOrParams.workspaceId);
      if (typeOrParams.type) params = params.set('type', typeOrParams.type);
      if (typeOrParams.search) params = params.set('search', typeOrParams.search);
      if (typeOrParams.status) params = params.set('status', typeOrParams.status);
      if (typeOrParams.priority) params = params.set('priority', typeOrParams.priority);
      if (typeOrParams.tag) params = params.set('tag', typeOrParams.tag);
    } else {
      params = params
        .set('page', page.toString())
        .set('pageSize', pageSize.toString());

      if (typeOrParams) {
        params = params.set('type', typeOrParams);
      }
      if (search) params = params.set('search', search);
      if (status) params = params.set('status', status);
      if (priority) params = params.set('priority', priority);
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
