import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { RoleService } from '../../core/services/role.service';
import { TaskService } from '../../core/services/task.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserResult, UserProfile } from '../../core/models/user.models';
import { TaskResult, TaskDetailsResult, TaskStatus } from '../../core/models/task.models';
import { Workspace } from '../../core/models/workspace.models';
import { WorkspaceService } from '../../core/services/workspace.service';
import { ProfileComponent } from '../profile/profile';
import { TaskDetailsComponent } from '../dashboard/task-details/task-details.component';

export type AdminTab = 'users' | 'tasks' | 'workspaces';

export interface AdminState {
  readonly activeTab: AdminTab;

  // Users Management
  readonly users: UserResult[];
  readonly usersLoading: boolean;
  readonly usersPage: number;
  readonly usersPageSize: number;
  readonly usersTotalCount: number;
  readonly userSearchQuery: string;

  // Concrete Profile View (reusing ProfileComponent)
  readonly selectedUserId: string | null;
  readonly isProfileDrawerOpen: boolean;

  // Role Management
  readonly selectedUserForRoles: UserResult | null;
  readonly isRolesModalOpen: boolean;
  readonly availableRoles: string[];
  readonly userRoles: string[];
  readonly rolesLoading: boolean;
  readonly roleUpdating: boolean;

  // Deletion Modal with Username Confirmation
  readonly userToDelete: UserResult | null;
  readonly isDeleteModalOpen: boolean;
  readonly confirmDeleteInput: string;
  readonly isDeletingUser: boolean;

  // Tasks Management
  readonly tasks: TaskResult[];
  readonly tasksLoading: boolean;
  readonly tasksPage: number;
  readonly tasksPageSize: number;
  readonly tasksTotalCount: number;
  readonly taskSearchQuery: string;
  readonly taskStatusFilter: string;
  readonly taskPriorityFilter: string;

  // Concrete Task Details View (reusing TaskDetailsComponent)
  readonly selectedTaskDetails: TaskDetailsResult | null;
  readonly isTaskBladeOpen: boolean;
  readonly taskDetailsLoading: boolean;

  // Workspaces Management
  readonly workspaces: Workspace[];
  readonly workspaceSearchQuery: string;
  readonly isWorkspaceModalOpen: boolean;
  readonly workspaceModalMode: 'create' | 'edit';
  readonly editingWorkspaceId: string | null;
  readonly workspaceFormName: string;
  readonly workspaceFormCode: string;
  readonly workspaceFormDescription: string;
  readonly workspaceFormColor: string;
  readonly workspaceFormRole: 'Owner' | 'Admin' | 'Contributor' | 'Reader';
  readonly workspaceFormIsDefault: boolean;

  // Workspace Deletion Confirmation
  readonly workspaceToDelete: Workspace | null;
  readonly isDeleteWorkspaceModalOpen: boolean;

  // User Dropdown
  readonly dropdownOpen: boolean;
  readonly userInitial: string;
}

const initialAdminState: AdminState = {
  activeTab: 'users',

  users: [],
  usersLoading: true,
  usersPage: 1,
  usersPageSize: 10,
  usersTotalCount: 0,
  userSearchQuery: '',

  selectedUserId: null,
  isProfileDrawerOpen: false,

  selectedUserForRoles: null,
  isRolesModalOpen: false,
  availableRoles: [],
  userRoles: [],
  rolesLoading: false,
  roleUpdating: false,

  userToDelete: null,
  isDeleteModalOpen: false,
  confirmDeleteInput: '',
  isDeletingUser: false,

  tasks: [],
  tasksLoading: true,
  tasksPage: 1,
  tasksPageSize: 10,
  tasksTotalCount: 0,
  taskSearchQuery: '',
  taskStatusFilter: 'ALL',
  taskPriorityFilter: 'ALL',

  selectedTaskDetails: null,
  isTaskBladeOpen: false,
  taskDetailsLoading: false,

  workspaces: [],
  workspaceSearchQuery: '',
  isWorkspaceModalOpen: false,
  workspaceModalMode: 'create',
  editingWorkspaceId: null,
  workspaceFormName: '',
  workspaceFormCode: '',
  workspaceFormDescription: '',
  workspaceFormColor: '#0078D4',
  workspaceFormRole: 'Admin',
  workspaceFormIsDefault: false,

  workspaceToDelete: null,
  isDeleteWorkspaceModalOpen: false,

  dropdownOpen: false,
  userInitial: '?',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProfileComponent,
    TaskDetailsComponent,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements OnInit {
  private readonly stateSubject = new BehaviorSubject<AdminState>(initialAdminState);
  readonly state$: Observable<AdminState> = this.stateSubject.asObservable();

  get snapshot(): AdminState {
    return this.stateSubject.value;
  }

  // Filtered lists for client-side search refinement on current page
  readonly filteredUsers$: Observable<UserResult[]> = this.state$.pipe(
    map((state) => {
      const q = state.userSearchQuery.toLowerCase().trim();
      if (!q) return state.users;
      return state.users.filter(
        (u) =>
          u.userName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.fullName && u.fullName.toLowerCase().includes(q)),
      );
    }),
  );

  readonly filteredTasks$: Observable<TaskResult[]> = this.state$.pipe(
    map((state) => {
      const q = state.taskSearchQuery.toLowerCase().trim();
      const statusFilter = state.taskStatusFilter;
      const priorityFilter = state.taskPriorityFilter;

      return state.tasks.filter((t) => {
        if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
        if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.id.toLowerCase().includes(q)
        );
      });
    }),
  );

  readonly filteredWorkspaces$: Observable<Workspace[]> = this.state$.pipe(
    map((state) => {
      const q = state.workspaceSearchQuery.toLowerCase().trim();
      if (!q) return state.workspaces;
      return state.workspaces.filter(
        (ws) =>
          ws.name.toLowerCase().includes(q) ||
          ws.code.toLowerCase().includes(q) ||
          (ws.description && ws.description.toLowerCase().includes(q)),
      );
    }),
  );

  readonly availableWorkspaceColors: string[] = [
    '#0078D4', // Azure Blue
    '#107C10', // Microsoft Green
    '#5C2D91', // Deep Purple
    '#D83B01', // Burnt Orange
    '#008272', // Teal
    '#E3008C', // Magenta
    '#004E8C', // Navy
    '#881798', // Grape
  ];

  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef);

  constructor(
    protected readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly roleService: RoleService,
    private readonly taskService: TaskService,
    private readonly workspaceService: WorkspaceService,
    private readonly notificationService: NotificationService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.updateState({ userInitial: this.calculateUserInitial() });
    this.loadUsers();
    this.loadTasks();
    this.loadAvailableRoles();
    this.loadWorkspaces();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.snapshot.dropdownOpen) {
      this.closeDropdown();
    } else if (this.snapshot.isDeleteModalOpen) {
      this.closeDeleteModal();
    } else if (this.snapshot.isDeleteWorkspaceModalOpen) {
      this.closeDeleteWorkspaceModal();
    } else if (this.snapshot.isWorkspaceModalOpen) {
      this.closeWorkspaceModal();
    } else if (this.snapshot.isRolesModalOpen) {
      this.closeRolesModal();
    } else if (this.snapshot.isProfileDrawerOpen) {
      this.closeProfileDrawer();
    } else if (this.snapshot.isTaskBladeOpen) {
      this.closeTaskBlade();
    }
  }

  // Tab Navigation
  setActiveTab(tab: AdminTab): void {
    this.updateState({ activeTab: tab });
  }

  // -------------------------------------------------------------
  // Users Management
  // -------------------------------------------------------------

  loadUsers(page: number = this.snapshot.usersPage): void {
    this.updateState({ usersLoading: true });
    this.userService
      .getAll(page, this.snapshot.usersPageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.updateState({
            users: result.items,
            usersPage: result.page,
            usersTotalCount: result.totalCount,
            usersLoading: false,
          });
        },
        error: () => {
          this.updateState({ usersLoading: false });
          this.notificationService.error('Failed to load users list.');
        },
      });
  }

  onUserSearchChange(query: string): void {
    this.updateState({ userSearchQuery: query });
  }

  onUserPageChange(newPage: number): void {
    if (newPage < 1) return;
    const maxPage = Math.ceil(this.snapshot.usersTotalCount / this.snapshot.usersPageSize) || 1;
    if (newPage > maxPage) return;
    this.loadUsers(newPage);
  }

  // Concrete Profile View (reusing ProfileComponent)
  openProfileDrawer(user: UserResult): void {
    this.updateState({
      selectedUserId: user.id,
      isProfileDrawerOpen: true,
    });
  }

  closeProfileDrawer(): void {
    this.updateState({
      isProfileDrawerOpen: false,
      selectedUserId: null,
    });
  }

  onUserProfileUpdated(updatedProfile: UserProfile): void {
    const updatedUsers = this.snapshot.users.map((u) =>
      u.id === updatedProfile.id
        ? {
            ...u,
            userName: updatedProfile.userName,
            fullName: updatedProfile.fullName,
          }
        : u,
    );
    this.updateState({ users: updatedUsers });
  }

  // -------------------------------------------------------------
  // Role Assignment
  // -------------------------------------------------------------

  private loadAvailableRoles(): void {
    this.roleService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.updateState({ availableRoles: roles });
        },
        error: () => {
          // Default standard roles if request fails
          this.updateState({ availableRoles: ['Admin', 'Manager', 'User'] });
        },
      });
  }

  openRolesModal(user: UserResult): void {
    this.updateState({
      selectedUserForRoles: user,
      isRolesModalOpen: true,
      rolesLoading: true,
      userRoles: [],
    });

    this.roleService
      .getForUser(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.updateState({
            userRoles: roles,
            rolesLoading: false,
          });
        },
        error: () => {
          this.updateState({ rolesLoading: false });
          this.notificationService.error(`Failed to load roles for ${user.userName}.`);
        },
      });
  }

  closeRolesModal(): void {
    this.updateState({
      isRolesModalOpen: false,
      selectedUserForRoles: null,
      userRoles: [],
    });
  }

  isRoleAssigned(role: string): boolean {
    return this.snapshot.userRoles.includes(role);
  }

  toggleRole(role: string): void {
    const user = this.snapshot.selectedUserForRoles;
    if (!user || this.snapshot.roleUpdating) return;

    const hasRole = this.isRoleAssigned(role);
    this.updateState({ roleUpdating: true });

    const roleCall$ = hasRole
      ? this.roleService.removeRole(user.id, role)
      : this.roleService.assignRole(user.id, role);

    roleCall$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const nextRoles = hasRole
          ? this.snapshot.userRoles.filter((r) => r !== role)
          : [...this.snapshot.userRoles, role];

        this.updateState({
          userRoles: nextRoles,
          roleUpdating: false,
        });

        const actionText = hasRole ? 'removed from' : 'assigned to';
        this.notificationService.success(`Role '${role}' ${actionText} ${user.userName}.`);
      },
      error: () => {
        this.updateState({ roleUpdating: false });
        this.notificationService.error(`Failed to update role '${role}'.`);
      },
    });
  }

  // -------------------------------------------------------------
  // User Deletion with Username Confirmation Modal
  // -------------------------------------------------------------

  openDeleteModal(user: UserResult): void {
    this.updateState({
      userToDelete: user,
      isDeleteModalOpen: true,
      confirmDeleteInput: '',
      isDeletingUser: false,
    });
  }

  closeDeleteModal(): void {
    this.updateState({
      isDeleteModalOpen: false,
      userToDelete: null,
      confirmDeleteInput: '',
      isDeletingUser: false,
    });
  }

  onConfirmDeleteInputChange(value: string): void {
    this.updateState({ confirmDeleteInput: value });
  }

  isDeleteButtonEnabled(): boolean {
    const target = this.snapshot.userToDelete;
    if (!target) return false;
    return (
      this.snapshot.confirmDeleteInput.trim() === target.userName.trim() &&
      !this.snapshot.isDeletingUser
    );
  }

  onConfirmDeleteUser(): void {
    const user = this.snapshot.userToDelete;
    if (!user || !this.isDeleteButtonEnabled()) return;

    this.updateState({ isDeletingUser: true });

    this.userService
      .deleteUser(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`User '${user.userName}' has been deleted.`);
          // If drawer is open with this user, close it
          if (this.snapshot.selectedUserId === user.id) {
            this.closeProfileDrawer();
          }
          this.closeDeleteModal();
          this.loadUsers();
        },
        error: () => {
          this.updateState({ isDeletingUser: false });
          this.notificationService.error(`Failed to delete user '${user.userName}'.`);
        },
      });
  }

  // -------------------------------------------------------------
  // Tasks Management
  // -------------------------------------------------------------

  loadTasks(page: number = this.snapshot.tasksPage): void {
    this.updateState({ tasksLoading: true });
    this.taskService
      .getAll(page, this.snapshot.tasksPageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.updateState({
            tasks: result.items,
            tasksPage: result.page,
            tasksTotalCount: result.totalCount,
            tasksLoading: false,
          });
        },
        error: () => {
          this.updateState({ tasksLoading: false });
          this.notificationService.error('Failed to load system tasks.');
        },
      });
  }

  onTaskSearchChange(query: string): void {
    this.updateState({ taskSearchQuery: query });
  }

  onTaskStatusFilterChange(status: string): void {
    this.updateState({ taskStatusFilter: status });
  }

  onTaskPriorityFilterChange(priority: string): void {
    this.updateState({ taskPriorityFilter: priority });
  }

  onTaskPageChange(newPage: number): void {
    if (newPage < 1) return;
    const maxPage = Math.ceil(this.snapshot.tasksTotalCount / this.snapshot.tasksPageSize) || 1;
    if (newPage > maxPage) return;
    this.loadTasks(newPage);
  }

  // Task Details Blade
  onSelectTask(task: TaskResult): void {
    this.updateState({
      taskDetailsLoading: true,
      isTaskBladeOpen: true,
    });

    this.taskService
      .getById(task.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (details) => {
          this.updateState({
            selectedTaskDetails: details,
            taskDetailsLoading: false,
          });
        },
        error: () => {
          this.updateState({ taskDetailsLoading: false });
          this.notificationService.error('Failed to load task details.');
        },
      });
  }

  closeTaskBlade(): void {
    this.updateState({
      isTaskBladeOpen: false,
      selectedTaskDetails: null,
    });
  }

  onTaskStatusChange(newStatus: TaskStatus): void {
    const task = this.snapshot.selectedTaskDetails;
    if (!task) return;

    this.taskService
      .changeStatus(task.id, { status: newStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`Status changed to ${newStatus}.`);
          this.updateState({
            selectedTaskDetails: { ...task, status: newStatus },
            tasks: this.snapshot.tasks.map((t) =>
              t.id === task.id ? { ...t, status: newStatus } : t,
            ),
          });
        },
        error: () => {
          this.notificationService.error('Failed to change status.');
        },
      });
  }

  onTaskComplete(): void {
    const task = this.snapshot.selectedTaskDetails;
    if (!task) return;

    this.taskService
      .complete(task.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Task marked as completed.');
          this.updateState({
            selectedTaskDetails: { ...task, status: 'Done' },
            tasks: this.snapshot.tasks.map((t) =>
              t.id === task.id ? { ...t, status: 'Done' } : t,
            ),
          });
        },
        error: () => {
          this.notificationService.error('Failed to complete task.');
        },
      });
  }

  onTaskCancel(): void {
    const task = this.snapshot.selectedTaskDetails;
    if (!task) return;

    this.taskService
      .cancel(task.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.info('Task cancelled.');
          this.updateState({
            selectedTaskDetails: { ...task, status: 'Cancelled' },
            tasks: this.snapshot.tasks.map((t) =>
              t.id === task.id ? { ...t, status: 'Cancelled' } : t,
            ),
          });
        },
        error: () => {
          this.notificationService.error('Failed to cancel task.');
        },
      });
  }

  // -------------------------------------------------------------
  // Workspaces Management
  // -------------------------------------------------------------

  private loadWorkspaces(): void {
    this.workspaceService.workspaces$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((workspaces) => {
        this.updateState({ workspaces });
      });
    if (typeof this.workspaceService.loadWorkspaces === 'function') {
      this.workspaceService.loadWorkspaces().subscribe({
        error: () => {},
      });
    }
  }

  onWorkspaceSearchChange(query: string): void {
    this.updateState({ workspaceSearchQuery: query });
  }

  openCreateWorkspaceModal(): void {
    this.updateState({
      isWorkspaceModalOpen: true,
      workspaceModalMode: 'create',
      editingWorkspaceId: null,
      workspaceFormName: '',
      workspaceFormCode: '',
      workspaceFormDescription: '',
      workspaceFormColor: '#0078D4',
      workspaceFormRole: 'Admin',
      workspaceFormIsDefault: false,
    });
  }

  openEditWorkspaceModal(ws: Workspace): void {
    this.updateState({
      isWorkspaceModalOpen: true,
      workspaceModalMode: 'edit',
      editingWorkspaceId: ws.id,
      workspaceFormName: ws.name,
      workspaceFormCode: ws.code,
      workspaceFormDescription: ws.description,
      workspaceFormColor: ws.color || '#0078D4',
      workspaceFormRole: ws.role,
      workspaceFormIsDefault: !!ws.isDefault,
    });
  }

  closeWorkspaceModal(): void {
    this.updateState({
      isWorkspaceModalOpen: false,
      editingWorkspaceId: null,
    });
  }

  onWorkspaceFormNameChange(value: string): void {
    const trimmed = value;
    let suggestedCode = this.snapshot.workspaceFormCode;
    if (this.snapshot.workspaceModalMode === 'create' && !suggestedCode) {
      suggestedCode = trimmed
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 4)
        .toUpperCase();
    }
    this.updateState({
      workspaceFormName: trimmed,
      workspaceFormCode: suggestedCode,
    });
  }

  onWorkspaceFormCodeChange(value: string): void {
    this.updateState({ workspaceFormCode: value.toUpperCase().trim() });
  }

  onWorkspaceFormDescriptionChange(value: string): void {
    this.updateState({ workspaceFormDescription: value });
  }

  onWorkspaceFormRoleChange(role: 'Owner' | 'Admin' | 'Contributor' | 'Reader'): void {
    this.updateState({ workspaceFormRole: role });
  }

  onWorkspaceFormColorSelect(color: string): void {
    this.updateState({ workspaceFormColor: color });
  }

  onWorkspaceFormIsDefaultChange(isDefault: boolean): void {
    this.updateState({ workspaceFormIsDefault: isDefault });
  }

  isWorkspaceFormValid(): boolean {
    return (
      this.snapshot.workspaceFormName.trim().length >= 2 &&
      this.snapshot.workspaceFormCode.trim().length >= 2
    );
  }

  saveWorkspace(): void {
    if (!this.isWorkspaceFormValid()) return;

    const {
      workspaceModalMode,
      editingWorkspaceId,
      workspaceFormName,
      workspaceFormCode,
      workspaceFormDescription,
      workspaceFormColor,
      workspaceFormRole,
      workspaceFormIsDefault,
    } = this.snapshot;

    const name = workspaceFormName.trim();
    const code = workspaceFormCode.trim().toUpperCase();
    const description = workspaceFormDescription.trim();

    if (workspaceModalMode === 'create') {
      this.workspaceService.createWorkspace({
        name,
        code,
        description,
        color: workspaceFormColor,
        role: workspaceFormRole,
        isDefault: workspaceFormIsDefault,
        memberCount: 1,
        taskCount: 0,
      });
      this.notificationService.success(`Workspace '${name}' created successfully.`);
    } else if (editingWorkspaceId) {
      this.workspaceService.updateWorkspace(editingWorkspaceId, {
        name,
        code,
        description,
        color: workspaceFormColor,
        role: workspaceFormRole,
        isDefault: workspaceFormIsDefault,
      });
      this.notificationService.success(`Workspace '${name}' updated successfully.`);
    }

    this.closeWorkspaceModal();
  }

  openDeleteWorkspaceModal(ws: Workspace): void {
    if (this.snapshot.workspaces.length <= 1) {
      this.notificationService.error('Cannot delete the only remaining workspace.');
      return;
    }
    this.updateState({
      workspaceToDelete: ws,
      isDeleteWorkspaceModalOpen: true,
    });
  }

  closeDeleteWorkspaceModal(): void {
    this.updateState({
      workspaceToDelete: null,
      isDeleteWorkspaceModalOpen: false,
    });
  }

  confirmDeleteWorkspace(): void {
    const ws = this.snapshot.workspaceToDelete;
    if (!ws) return;

    this.workspaceService.deleteWorkspace(ws.id);
    this.notificationService.success(`Workspace '${ws.name}' deleted.`);
    this.closeDeleteWorkspaceModal();
  }

  onSetDefaultWorkspace(ws: Workspace): void {
    this.workspaceService.setDefaultWorkspace(ws.id);
    this.notificationService.success(`Workspace '${ws.name}' set as default.`);
  }

  onSelectAndSwitchWorkspace(ws: Workspace): void {
    this.workspaceService.selectWorkspace(ws);
    this.notificationService.success(`Switched active workspace to '${ws.name}'.`);
  }

  getUserInitial(user: UserResult): string {
    const name = user.fullName || user.userName || user.email;
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  getWorkspaceInitial(ws?: Workspace | null): string {
    if (!ws?.name) return 'W';
    const trimmed = ws.name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'W';
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.snapshot.dropdownOpen) return;
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.querySelector('.user-menu-container')?.contains(target)) {
      this.closeDropdown();
    }
  }

  protected toggleDropdown(): void {
    this.updateState({ dropdownOpen: !this.snapshot.dropdownOpen });
  }

  protected closeDropdown(): void {
    this.updateState({ dropdownOpen: false });
  }

  protected onProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/profile']);
  }

  protected onLogout(): void {
    this.closeDropdown();
    this.notificationService.info('You have been signed out.');
    this.authService.logout();
  }

  private calculateUserInitial(): string {
    const user =
      typeof this.authService?.currentUser === 'function' ? this.authService.currentUser() : null;
    if (!user) return '?';
    const name =
      user.unique_name ||
      user['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      user.name ||
      user.email ||
      '';
    const trimmed = typeof name === 'string' ? name.trim() : '';
    return trimmed.charAt(0).toUpperCase() || '?';
  }

  private updateState(partial: Partial<AdminState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial,
    });
  }
}
