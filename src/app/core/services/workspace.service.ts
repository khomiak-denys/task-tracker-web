import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Workspace, MOCK_WORKSPACES } from '../models/workspace.models';

const STORAGE_SELECTED_WS_KEY = 'selected_workspace_id';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  private readonly workspacesSubject = new BehaviorSubject<Workspace[]>(MOCK_WORKSPACES);
  readonly workspaces$: Observable<Workspace[]> = this.workspacesSubject.asObservable();

  private readonly selectedWorkspaceSubject = new BehaviorSubject<Workspace>(
    this.resolveInitialWorkspace()
  );
  readonly selectedWorkspace$: Observable<Workspace> = this.selectedWorkspaceSubject.asObservable();

  /** Workspaces where the current user is a registered member */
  readonly memberWorkspaces$: Observable<Workspace[]> = this.workspaces$.pipe(
    map((workspaces) => workspaces.filter((ws) => !!ws.role))
  );

  get currentWorkspace(): Workspace {
    return this.selectedWorkspaceSubject.value;
  }

  get allWorkspaces(): Workspace[] {
    return this.workspacesSubject.value;
  }

  selectWorkspace(workspace: Workspace): void {
    this.selectedWorkspaceSubject.next(workspace);
    try {
      localStorage.setItem(STORAGE_SELECTED_WS_KEY, workspace.id);
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
    const newWs: Workspace = {
      ...workspaceData,
      id: `ws-${Date.now()}`,
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

    if (this.selectedWorkspaceSubject.value.id === id) {
      this.selectedWorkspaceSubject.next(updatedWs);
    }

    return updatedWs;
  }

  deleteWorkspace(id: string): boolean {
    const list = this.workspacesSubject.value;
    const exists = list.some((w) => w.id === id);
    if (!exists) return false;

    const nextList = list.filter((w) => w.id !== id);
    this.workspacesSubject.next(nextList);

    if (this.selectedWorkspaceSubject.value.id === id) {
      const fallback = nextList.find((w) => w.isDefault) || nextList[0];
      if (fallback) {
        this.selectWorkspace(fallback);
      }
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

  private resolveInitialWorkspace(): Workspace {
    try {
      const storedId = localStorage.getItem(STORAGE_SELECTED_WS_KEY);
      if (storedId) {
        const found = MOCK_WORKSPACES.find((w) => w.id === storedId);
        if (found) return found;
      }
    } catch {
      // Storage unavailable or disabled
    }
    return MOCK_WORKSPACES[0];
  }
}
