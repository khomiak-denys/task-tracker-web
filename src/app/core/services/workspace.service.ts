import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  distinctUntilChanged,
  map,
  of,
  tap,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { PaginationResult } from '../models/task.models';
import {
  Workspace,
  WorkspaceResult,
  WorkspaceDetailsResult,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  AddWorkspaceMemberRequest,
} from '../models/workspace.models';

const STORAGE_SELECTED_WS_KEY = 'selected_workspace_id';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/workspaces`;

  private readonly workspacesSubject = new BehaviorSubject<Workspace[]>([]);
  readonly workspaces$: Observable<Workspace[]> = this.workspacesSubject.asObservable();

  private readonly selectedWorkspaceSubject = new BehaviorSubject<Workspace | null>(null);
  readonly selectedWorkspace$: Observable<Workspace | null> = this.selectedWorkspaceSubject.asObservable();

  private readonly isNotFoundSubject = new BehaviorSubject<boolean>(false);
  readonly isNotFound$: Observable<boolean> = this.isNotFoundSubject.asObservable();

  /** Workspaces where the current user is a registered member */
  readonly memberWorkspaces$: Observable<Workspace[]> = this.workspaces$.pipe(
    map((workspaces) => workspaces.filter((ws) => !!ws.role))
  );

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {
    if (this.authService?.isAuthenticated$) {
      this.authService.isAuthenticated$
        .pipe(distinctUntilChanged())
        .subscribe((isAuth) => {
          if (isAuth) {
            this.loadWorkspaces().subscribe({
              error: () => {
                // Keep local state on error
              },
            });
          }
        });
    }
  }

  get currentWorkspace(): Workspace | null {
    return this.selectedWorkspaceSubject.value;
  }

  get allWorkspaces(): Workspace[] {
    return this.workspacesSubject.value;
  }

  get isNotFound(): boolean {
    return this.isNotFoundSubject.value;
  }

  setIsNotFound(value: boolean): void {
    this.isNotFoundSubject.next(value);
  }

  // -------------------------------------------------------------
  // Backend HTTP API Endpoints
  // -------------------------------------------------------------

  /** GET /api/v1/workspaces?page={page}&pageSize={pageSize}&name={name} */
  getAll(
    page: number = 1,
    pageSize: number = 50,
    name?: string
  ): Observable<PaginationResult<WorkspaceResult>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (name && name.trim()) {
      params = params.set('name', name.trim());
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
      .pipe(tap(() => this.isNotFoundSubject.next(false)));
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

  // -------------------------------------------------------------
  // State Synchronization & Orchestration
  // -------------------------------------------------------------

  /**
   * Fetches workspaces from the backend API, updates the reactive stream,
   * and synchronizes the selected workspace.
   */
  loadWorkspaces(page: number = 1, pageSize: number = 50, name?: string): Observable<Workspace[]> {
    return this.getAll(page, pageSize, name).pipe(
      map((res) => {
        this.isNotFoundSubject.next(false);
        const currentUser = this.authService.currentUser ? this.authService.currentUser() : null;
        const currentUserId = currentUser?.sub;
        const isAdmin = this.authService.isAdmin ? this.authService.isAdmin() : false;

        const mappedList: Workspace[] = (res?.items || []).map((item) =>
          this.mapResultToWorkspace(item, currentUserId, isAdmin)
        );

        this.workspacesSubject.next(mappedList);
        this.syncSelectedWorkspace(mappedList);
        return mappedList;
      }),
      catchError((err: unknown) => {
        const is404 =
          (err instanceof HttpErrorResponse && err.status === 404) ||
          (typeof err === 'object' && err !== null && (err as { status?: number }).status === 404);

        if (is404) {
          this.isNotFoundSubject.next(true);
          this.workspacesSubject.next([]);
          this.selectedWorkspaceSubject.next(null);
        }
        return of(this.workspacesSubject.value);
      })
    );
  }

  selectWorkspace(workspace: Workspace | null): void {
    this.selectedWorkspaceSubject.next(workspace);
    try {
      if (workspace) {
        localStorage.setItem(STORAGE_SELECTED_WS_KEY, workspace.id);
      } else {
        localStorage.removeItem(STORAGE_SELECTED_WS_KEY);
      }
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
    this.isNotFoundSubject.next(false);
    const newWs: Workspace = {
      ...workspaceData,
      id: `ws-${Date.now()}`,
    };
    let updated = [...this.workspacesSubject.value, newWs];
    if (newWs.isDefault) {
      updated = updated.map((w) => (w.id === newWs.id ? w : { ...w, isDefault: false }));
    }
    this.workspacesSubject.next(updated);

    if (!this.selectedWorkspaceSubject.value) {
      this.selectWorkspace(newWs);
    }

    // If authenticated, sync with backend asynchronously
    if (this.authService?.getStoredToken && this.authService.getStoredToken()) {
      this.create({
        name: workspaceData.name,
        description: workspaceData.description,
      }).subscribe({
        next: (createdId) => {
          const cleanId = String(createdId).replace(/"/g, '').trim();
          if (cleanId) {
            const list = this.workspacesSubject.value.map((ws) =>
              ws.id === newWs.id ? { ...ws, id: cleanId } : ws
            );
            this.workspacesSubject.next(list);
            if (this.selectedWorkspaceSubject.value?.id === newWs.id) {
              const updatedSelection = list.find((ws) => ws.id === cleanId) || null;
              if (updatedSelection) {
                this.selectWorkspace(updatedSelection);
              }
            }
          }
        },
        error: () => {
          // Keep local entry
        },
      });
    }

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
    }

    // Sync with backend if authenticated and real ID
    if (this.authService?.getStoredToken && this.authService.getStoredToken() && this.isGuid(id)) {
      this.update(id, {
        name: updatedWs.name,
        description: updatedWs.description,
      }).subscribe({
        error: () => {},
      });
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
      this.selectWorkspace(fallback);
    }

    if (this.authService?.getStoredToken && this.authService.getStoredToken() && this.isGuid(id)) {
      this.delete(id).subscribe({
        error: () => {},
      });
    }

    return true;
  }

  setDefaultWorkspace(id: string): void {
    const list = this.workspacesSubject.value;
    const target = list.find((w) => w.id === id);
    if (!target) return;

    const updatedList = list.map((w) => ({
      ...w,
      isDefault: w.id === id,
    }));
    this.workspacesSubject.next(updatedList);
  }

  private syncSelectedWorkspace(list: Workspace[]): void {
    if (!list || list.length === 0) {
      this.selectWorkspace(null);
      return;
    }
    const current = this.selectedWorkspaceSubject.value;
    const found = current ? list.find((w) => w.id === current.id) : null;
    if (found) {
      this.selectedWorkspaceSubject.next(found);
    } else {
      let storedId: string | null = null;
      try {
        storedId = localStorage.getItem(STORAGE_SELECTED_WS_KEY);
      } catch {
        // Storage unavailable or disabled
      }
      const stored = storedId ? list.find((w) => w.id === storedId) : null;
      const initial = stored || list.find((w) => w.isDefault) || list[0] || null;
      this.selectWorkspace(initial);
    }
  }

  private mapResultToWorkspace(
    item: WorkspaceResult,
    currentUserId?: string | null,
    isAdmin: boolean = false
  ): Workspace {
    const isOwner = !!(
      currentUserId && item.ownerId.toLowerCase() === currentUserId.toLowerCase()
    );
    const role: 'Owner' | 'Admin' | 'Contributor' | 'Reader' = isOwner
      ? 'Owner'
      : isAdmin
      ? 'Admin'
      : 'Contributor';

    const code =
      item.name
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase() || 'WS';

    return {
      id: item.id,
      name: item.name,
      code,
      description: item.description || '',
      role,
      memberCount: item.memberCount ?? item.membersCount ?? 1,
      taskCount: item.taskCount ?? 0,
    };
  }

  private isGuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }
}
