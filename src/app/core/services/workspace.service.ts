import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Workspace,
  WorkspaceResult,
  WorkspaceDetailsResult,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  AddWorkspaceMemberRequest,
  mapWorkspaceResultToWorkspace,
  generateWorkspaceCode,
  getDeterministicColor,
} from '../models/workspace.models';
import { PaginationResult } from '../models/task.models';
import { AuthService } from './auth.service';

const STORAGE_SELECTED_WS_KEY = 'selected_workspace_id';
const STORAGE_SELECTED_WS_DATA_KEY = 'selected_workspace_data';
const STORAGE_DEFAULT_WS_KEY = 'default_workspace_id';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/workspaces`;

  private readonly workspacesSubject = new BehaviorSubject<Workspace[]>([]);
  readonly workspaces$: Observable<Workspace[]> = this.workspacesSubject.asObservable();

  private readonly selectedWorkspaceSubject = new BehaviorSubject<Workspace | null>(
    this.resolveInitialWorkspace(),
  );
  readonly selectedWorkspace$: Observable<Workspace | null> =
    this.selectedWorkspaceSubject.asObservable();

  /** Workspaces where the current user is a registered member */
  readonly memberWorkspaces$: Observable<Workspace[]> = this.workspaces$.pipe(
    map((workspaces) => workspaces.filter((ws) => !!ws.role)),
  );

  get currentWorkspace(): Workspace | null {
    return this.selectedWorkspaceSubject.value;
  }

  get allWorkspaces(): Workspace[] {
    return this.workspacesSubject.value;
  }

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  /** GET /api/v1/workspaces?page={page}&pageSize={pageSize}&name={name} */
  getAll(
    name?: string | null,
    page: number = 1,
    pageSize: number = 10,
  ): Observable<PaginationResult<WorkspaceResult>> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());

    if (name) {
      params = params.set('name', name);
    }

    return this.http.get<PaginationResult<WorkspaceResult>>(this.apiUrl, {
      params,
      withCredentials: true,
    });
  }

  /** GET /api/v1/workspaces/{id} */
  getById(id: string): Observable<WorkspaceDetailsResult> {
    return this.http.get<WorkspaceDetailsResult>(`${this.apiUrl}/${id}`, {
      withCredentials: true,
    });
  }

  /** POST /api/v1/workspaces */
  create(request: CreateWorkspaceRequest): Observable<string> {
    return this.http
      .post<string>(this.apiUrl, request, {
        withCredentials: true,
      })
      .pipe(
        map((res) =>
          typeof res === 'object' && res ? (res as { id: string }).id || String(res) : String(res),
        ),
      );
  }

  /** PUT /api/v1/workspaces/{id} */
  update(id: string, request: UpdateWorkspaceRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, request, {
      withCredentials: true,
    });
  }

  /** DELETE /api/v1/workspaces/{id} */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true,
    });
  }

  /** POST /api/v1/workspaces/{id}/members */
  addMember(id: string, request: AddWorkspaceMemberRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/members`, request, {
      withCredentials: true,
    });
  }

  /** DELETE /api/v1/workspaces/{id}/members/{userId} */
  removeMember(id: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/members/${userId}`, {
      withCredentials: true,
    });
  }

  /**
   * Fetches workspaces from API and updates local streams.
   */
  loadWorkspaces(name?: string): Observable<Workspace[]> {
    return this.getAll(name, 1, 10).pipe(
      map((res) => {
        const currentUserId = this.authService.currentUserId();
        const isAdmin = this.authService.isAdmin();
        const storedDefaultId = localStorage.getItem(STORAGE_DEFAULT_WS_KEY);
        const storedSelectedId = localStorage.getItem(STORAGE_SELECTED_WS_KEY);

        const mappedList: Workspace[] = (res.items || []).map((item) =>
          mapWorkspaceResultToWorkspace(item, currentUserId, isAdmin, item.id === storedDefaultId),
        );

        this.workspacesSubject.next(mappedList);

        if (mappedList.length > 0) {
          const curSelected = this.selectedWorkspaceSubject.value;
          const target =
            mappedList.find((w) => w.id === storedSelectedId) ||
            mappedList.find((w) => w.id === curSelected?.id) ||
            mappedList.find((w) => w.isDefault) ||
            mappedList[0];

          if (target) {
            this.selectedWorkspaceSubject.next(target);
          }
        } else {
          this.selectedWorkspaceSubject.next(null);
        }

        return mappedList;
      }),
      catchError(() => of(this.workspacesSubject.value)),
    );
  }

  selectWorkspace(workspace: Workspace): void {
    this.selectedWorkspaceSubject.next(workspace);
    try {
      localStorage.setItem(STORAGE_SELECTED_WS_KEY, workspace.id);
      localStorage.setItem(STORAGE_SELECTED_WS_DATA_KEY, JSON.stringify(workspace));
    } catch {
      // Storage unavailable or disabled
    }
  }

  selectWorkspaceById(id: string): boolean {
    const found = this.workspacesSubject.value.find((w) => w.id === id);
    if (found) {
      this.selectWorkspace(found);
      return true;
    }
    return false;
  }

  createWorkspace(workspaceData: Omit<Workspace, 'id'>): Workspace {
    const name = workspaceData.name;
    const description = workspaceData.description ?? '';
    const code = workspaceData.code || generateWorkspaceCode(name);
    const color = workspaceData.color || getDeterministicColor(name);
    const role = workspaceData.role || 'Owner';
    const isDefault = !!workspaceData.isDefault;

    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      code,
      description,
      role,
      memberCount: 1,
      taskCount: 0,
      color,
      isDefault,
    };

    let updated = [...this.workspacesSubject.value, newWs];
    if (newWs.isDefault) {
      updated = updated.map((w) => (w.id === newWs.id ? w : { ...w, isDefault: false }));
    }
    this.workspacesSubject.next(updated);
    return newWs;
  }

  updateWorkspace(id: string, updates: Partial<Omit<Workspace, 'id'>>): Workspace | null {
    const list = this.workspacesSubject.value;
    const index = list.findIndex((w) => w.id === id);
    if (index === -1) return null;

    const current = list[index];
    const updatedWs: Workspace = {
      ...current,
      ...updates,
      id: current.id,
    };

    let nextList = [...list];
    if (updates.isDefault) {
      nextList = nextList.map((w) => (w.id === id ? updatedWs : { ...w, isDefault: false }));
    } else {
      nextList[index] = updatedWs;
    }

    this.workspacesSubject.next(nextList);

    if (this.selectedWorkspaceSubject.value?.id === id) {
      this.selectedWorkspaceSubject.next(updatedWs);
      try {
        localStorage.setItem(STORAGE_SELECTED_WS_DATA_KEY, JSON.stringify(updatedWs));
      } catch {
        // Storage unavailable
      }
    }

    return updatedWs;
  }

  deleteWorkspace(id: string): boolean {
    const list = this.workspacesSubject.value;
    const exists = list.some((w) => w.id === id);
    if (!exists) return false;

    const nextList = list.filter((w) => w.id !== id);
    this.workspacesSubject.next(nextList);

    if (this.selectedWorkspaceSubject.value?.id === id) {
      const fallback = nextList.find((w) => w.isDefault) || nextList[0] || null;
      this.selectedWorkspaceSubject.next(fallback);
      if (fallback) {
        try {
          localStorage.setItem(STORAGE_SELECTED_WS_KEY, fallback.id);
          localStorage.setItem(STORAGE_SELECTED_WS_DATA_KEY, JSON.stringify(fallback));
        } catch {
          // Storage unavailable
        }
      } else {
        try {
          localStorage.removeItem(STORAGE_SELECTED_WS_KEY);
          localStorage.removeItem(STORAGE_SELECTED_WS_DATA_KEY);
        } catch {
          // Storage unavailable
        }
      }
    }

    return true;
  }

  setDefaultWorkspace(id: string): void {
    const list = this.workspacesSubject.value;
    const target = list.find((w) => w.id === id);
    if (!target) return;

    try {
      localStorage.setItem(STORAGE_DEFAULT_WS_KEY, id);
    } catch {
      // Storage unavailable
    }

    const updatedList = list.map((w) => ({
      ...w,
      isDefault: w.id === id,
    }));
    this.workspacesSubject.next(updatedList);
  }

  private resolveInitialWorkspace(): Workspace | null {
    try {
      const stored = localStorage.getItem(STORAGE_SELECTED_WS_DATA_KEY);
      if (stored) {
        return JSON.parse(stored) as Workspace;
      }
    } catch {
      // Storage unavailable or invalid JSON
    }
    return null;
  }
}
