import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';
import { AdminComponent } from './admin';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { RoleService } from '../../core/services/role.service';
import { TaskService } from '../../core/services/task.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserResult, UserProfile } from '../../core/models/user.models';
import { TaskResult, TaskDetailsResult } from '../../core/models/task.models';
import { Workspace, MOCK_WORKSPACES } from '../../core/models/workspace.models';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;

  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let roleServiceSpy: jasmine.SpyObj<RoleService>;
  let taskServiceSpy: jasmine.SpyObj<TaskService>;
  let workspaceServiceSpy: jasmine.SpyObj<WorkspaceService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUsers: UserResult[] = [
    {
      id: 'user-1',
      userName: 'john_doe',
      email: 'john@example.com',
      fullName: 'John Doe',
    },
    {
      id: 'user-2',
      userName: 'jane_smith',
      email: 'jane@example.com',
      fullName: 'Jane Smith',
    },
  ];

  const mockTasks: TaskResult[] = [
    {
      id: 'task-1',
      title: 'Infrastructure Deployment',
      description: 'Deploy gateway and microservices',
      status: 'InProgress',
      priority: 'High',
      deadline: '2026-10-15T00:00:00Z',
      assigneeId: 'user-1',
      tags: ['DevOps'],
    },
  ];

  const mockTaskDetails: TaskDetailsResult = {
    ...mockTasks[0],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: null,
    createdBy: {
      id: 'user-1',
      email: 'john@example.com',
      userName: 'john_doe',
      fullName: 'John Doe',
    },
    assignee: {
      id: 'user-1',
      email: 'john@example.com',
      userName: 'john_doe',
      fullName: 'John Doe',
    },
    timeLogs: [],
  };

  const mockProfile: UserProfile = {
    id: 'user-1',
    userName: 'john_doe',
    email: 'john@example.com',
    fullName: 'John Doe',
    roles: ['Admin'],
    emailConfirmed: true,
    twoFactorEnabled: false,
    lockoutEnd: null,
    lockoutEnabled: false,
    accessFailedCount: 0,
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'currentUser',
      'currentUserId',
      'isAuthenticated',
      'isAdmin',
    ]);
    authServiceSpy.currentUser.and.returnValue({
      sub: 'admin-id',
      email: 'admin@example.com',
      unique_name: 'admin_user',
      role: 'Admin',
      exp: 9999999999,
      iat: 1000000000,
    });
    authServiceSpy.currentUserId.and.returnValue('admin-id');
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.isAdmin.and.returnValue(true);

    userServiceSpy = jasmine.createSpyObj('UserService', [
      'getAll',
      'getProfile',
      'updateProfile',
      'deleteUser',
    ]);
    userServiceSpy.getAll.and.returnValue(
      of({ items: mockUsers, page: 1, pageSize: 10, totalCount: mockUsers.length }),
    );
    userServiceSpy.getProfile.and.returnValue(of(mockProfile));
    userServiceSpy.updateProfile.and.returnValue(of(void 0));
    userServiceSpy.deleteUser.and.returnValue(of(void 0));

    roleServiceSpy = jasmine.createSpyObj('RoleService', [
      'getAll',
      'getForUser',
      'assignRole',
      'removeRole',
    ]);
    roleServiceSpy.getAll.and.returnValue(of(['Admin', 'Manager', 'User']));
    roleServiceSpy.getForUser.and.returnValue(of(['User']));
    roleServiceSpy.assignRole.and.returnValue(of(void 0));
    roleServiceSpy.removeRole.and.returnValue(of(void 0));

    taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'getAll',
      'getById',
      'changeStatus',
      'complete',
      'cancel',
    ]);
    taskServiceSpy.getAll.and.returnValue(
      of({ items: mockTasks, page: 1, pageSize: 10, totalCount: mockTasks.length }),
    );
    taskServiceSpy.getById.and.returnValue(of(mockTaskDetails));
    taskServiceSpy.changeStatus.and.returnValue(of(void 0));
    taskServiceSpy.complete.and.returnValue(of(void 0));
    taskServiceSpy.cancel.and.returnValue(of(void 0));

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'success',
      'error',
      'info',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    workspaceServiceSpy = jasmine.createSpyObj(
      'WorkspaceService',
      [
        'createWorkspace',
        'updateWorkspace',
        'deleteWorkspace',
        'setDefaultWorkspace',
        'selectWorkspace',
      ],
      {
        workspaces$: of(MOCK_WORKSPACES),
        allWorkspaces: MOCK_WORKSPACES,
        currentWorkspace: MOCK_WORKSPACES[0],
      },
    );
    workspaceServiceSpy.createWorkspace.and.callFake((data) => ({
      ...data,
      id: 'ws-new-created',
    }));
    workspaceServiceSpy.updateWorkspace.and.callFake((id, data) => ({
      ...MOCK_WORKSPACES[0],
      ...data,
      id,
    }));
    workspaceServiceSpy.deleteWorkspace.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: RoleService, useValue: roleServiceSpy },
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: WorkspaceService, useValue: workspaceServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
      ],
    }).compileComponents();


    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Init_Should_LoadUsersTasksAndRoles_When_Created', () => {
    expect(component).toBeTruthy();
    expect(userServiceSpy.getAll).toHaveBeenCalledWith(1, 10);
    expect(taskServiceSpy.getAll).toHaveBeenCalledWith(1, 10);
    expect(roleServiceSpy.getAll).toHaveBeenCalled();
    expect(component.snapshot.users.length).toBe(2);
    expect(component.snapshot.tasks.length).toBe(1);
    expect(component.snapshot.availableRoles).toEqual(['Admin', 'Manager', 'User']);
  });

  it('setActiveTab_Should_SwitchActiveTab_When_Invoked', () => {
    expect(component.snapshot.activeTab).toBe('users');

    component.setActiveTab('tasks');
    expect(component.snapshot.activeTab).toBe('tasks');

    component.setActiveTab('users');
    expect(component.snapshot.activeTab).toBe('users');
  });

  it('openProfileDrawer_Should_SetSelectedUserAndOpenDrawer_When_Called', () => {
    component.openProfileDrawer(mockUsers[0]);

    expect(component.snapshot.selectedUserId).toBe('user-1');
    expect(component.snapshot.isProfileDrawerOpen).toBeTrue();

    component.closeProfileDrawer();
    expect(component.snapshot.selectedUserId).toBeNull();
    expect(component.snapshot.isProfileDrawerOpen).toBeFalse();
  });

  it('onUserProfileUpdated_Should_UpdateUserInList_When_ProfileSaved', () => {
    component.onUserProfileUpdated({
      ...mockProfile,
      userName: 'john_new_name',
      fullName: 'John Updated',
    });

    const updated = component.snapshot.users.find((u) => u.id === 'user-1');
    expect(updated?.userName).toBe('john_new_name');
    expect(updated?.fullName).toBe('John Updated');
  });

  it('openDeleteModal_Should_SetTargetUserAndOpenModal_When_Called', () => {
    component.openDeleteModal(mockUsers[0]);

    expect(component.snapshot.userToDelete?.id).toBe('user-1');
    expect(component.snapshot.isDeleteModalOpen).toBeTrue();
    expect(component.snapshot.confirmDeleteInput).toBe('');
    expect(component.isDeleteButtonEnabled()).toBeFalse();

    component.onConfirmDeleteInputChange('wrong_username');
    expect(component.isDeleteButtonEnabled()).toBeFalse();

    component.onConfirmDeleteInputChange('john_doe');
    expect(component.isDeleteButtonEnabled()).toBeTrue();

    component.closeDeleteModal();
    expect(component.snapshot.isDeleteModalOpen).toBeFalse();
    expect(component.snapshot.userToDelete).toBeNull();
  });

  it('onConfirmDeleteUser_Should_CallDeleteUserAndReload_When_Confirmed', () => {
    component.openDeleteModal(mockUsers[0]);
    component.onConfirmDeleteInputChange('john_doe');

    component.onConfirmDeleteUser();

    expect(userServiceSpy.deleteUser).toHaveBeenCalledWith('user-1');
    expect(notificationServiceSpy.success).toHaveBeenCalledWith("User 'john_doe' has been deleted.");
    expect(component.snapshot.isDeleteModalOpen).toBeFalse();
  });

  it('openRolesModal_Should_FetchUserRolesAndOpenModal_When_Called', () => {
    component.openRolesModal(mockUsers[0]);

    expect(component.snapshot.selectedUserForRoles?.id).toBe('user-1');
    expect(component.snapshot.isRolesModalOpen).toBeTrue();
    expect(roleServiceSpy.getForUser).toHaveBeenCalledWith('user-1');
    expect(component.isRoleAssigned('User')).toBeTrue();
    expect(component.isRoleAssigned('Admin')).toBeFalse();

    component.closeRolesModal();
    expect(component.snapshot.isRolesModalOpen).toBeFalse();
    expect(component.snapshot.selectedUserForRoles).toBeNull();
  });

  it('toggleRole_Should_AssignOrRemoveRole_When_Invoked', () => {
    component.openRolesModal(mockUsers[0]);

    // Assign 'Manager'
    component.toggleRole('Manager');
    expect(roleServiceSpy.assignRole).toHaveBeenCalledWith('user-1', 'Manager');
    expect(notificationServiceSpy.success).toHaveBeenCalledWith("Role 'Manager' assigned to john_doe.");
    expect(component.isRoleAssigned('Manager')).toBeTrue();

    // Remove 'Manager'
    component.toggleRole('Manager');
    expect(roleServiceSpy.removeRole).toHaveBeenCalledWith('user-1', 'Manager');
    expect(notificationServiceSpy.success).toHaveBeenCalledWith("Role 'Manager' removed from john_doe.");
    expect(component.isRoleAssigned('Manager')).toBeFalse();
  });

  it('onSelectTask_Should_FetchDetailsAndOpenBlade_When_Invoked', () => {
    component.onSelectTask(mockTasks[0]);

    expect(taskServiceSpy.getById).toHaveBeenCalledWith('task-1');
    expect(component.snapshot.isTaskBladeOpen).toBeTrue();
    expect(component.snapshot.selectedTaskDetails?.id).toBe('task-1');

    component.closeTaskBlade();
    expect(component.snapshot.isTaskBladeOpen).toBeFalse();
    expect(component.snapshot.selectedTaskDetails).toBeNull();
  });

  it('onTaskStatusChange_Should_UpdateStatusViaTaskService_When_Invoked', () => {
    component.onSelectTask(mockTasks[0]);
    component.onTaskStatusChange('Done');

    expect(taskServiceSpy.changeStatus).toHaveBeenCalledWith('task-1', { status: 'Done' });
    expect(notificationServiceSpy.success).toHaveBeenCalledWith('Status changed to Done.');
    expect(component.snapshot.selectedTaskDetails?.status).toBe('Done');
  });

  it('onTaskComplete_Should_CallTaskServiceComplete_When_Invoked', () => {
    component.onSelectTask(mockTasks[0]);
    component.onTaskComplete();

    expect(taskServiceSpy.complete).toHaveBeenCalledWith('task-1');
    expect(notificationServiceSpy.success).toHaveBeenCalledWith('Task marked as completed.');
  });

  it('onTaskCancel_Should_CallTaskServiceCancel_When_Invoked', () => {
    component.onSelectTask(mockTasks[0]);
    component.onTaskCancel();

    expect(taskServiceSpy.cancel).toHaveBeenCalledWith('task-1');
    expect(notificationServiceSpy.info).toHaveBeenCalledWith('Task cancelled.');
  });

  it('onEscape_Should_CloseModalsAndDrawers_When_Pressed', () => {
    // 1. Delete modal
    component.openDeleteModal(mockUsers[0]);
    expect(component.snapshot.isDeleteModalOpen).toBeTrue();
    component.onEscape();
    expect(component.snapshot.isDeleteModalOpen).toBeFalse();

    // 2. Roles modal
    component.openRolesModal(mockUsers[0]);
    expect(component.snapshot.isRolesModalOpen).toBeTrue();
    component.onEscape();
    expect(component.snapshot.isRolesModalOpen).toBeFalse();

    // 3. Profile drawer
    component.openProfileDrawer(mockUsers[0]);
    expect(component.snapshot.isProfileDrawerOpen).toBeTrue();
    component.onEscape();
    expect(component.snapshot.isProfileDrawerOpen).toBeFalse();

    // 4. Task blade
    component.onSelectTask(mockTasks[0]);
    expect(component.snapshot.isTaskBladeOpen).toBeTrue();
    component.onEscape();
    expect(component.snapshot.isTaskBladeOpen).toBeFalse();
  });

  it('filteredUsers$_Should_FilterBySearchQuery_When_QueryChanged', (done) => {
    component.onUserSearchChange('jane');

    component.filteredUsers$.subscribe((filtered) => {
      expect(filtered.length).toBe(1);
      expect(filtered[0].userName).toBe('jane_smith');
      done();
    });
  });

  it('filteredTasks$_Should_FilterBySearchQueryAndStatus_When_FiltersChanged', (done) => {
    component.onTaskSearchChange('gateway');
    component.onTaskStatusFilterChange('InProgress');

    component.filteredTasks$.subscribe((filtered) => {
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('task-1');
      done();
    });
  });

  // -------------------------------------------------------------
  // Workspaces Management Tests
  // -------------------------------------------------------------

  it('setActiveTab_Should_SwitchToWorkspacesTab_When_Invoked', () => {
    component.setActiveTab('workspaces');
    expect(component.snapshot.activeTab).toBe('workspaces');
  });

  it('filteredWorkspaces$_Should_FilterBySearchQuery_When_QueryChanged', (done) => {
    component.onWorkspaceSearchChange('gateway');

    component.filteredWorkspaces$.subscribe((filtered) => {
      expect(filtered.length).toBe(1);
      expect(filtered[0].code).toBe('GW');
      done();
    });
  });

  it('openCreateWorkspaceModal_Should_ResetFormToCreateDefaults_When_Invoked', () => {
    component.openCreateWorkspaceModal();

    expect(component.snapshot.isWorkspaceModalOpen).toBeTrue();
    expect(component.snapshot.workspaceModalMode).toBe('create');
    expect(component.snapshot.workspaceFormName).toBe('');
    expect(component.snapshot.workspaceFormCode).toBe('');
    expect(component.snapshot.workspaceFormColor).toBe('#0078D4');
  });

  it('saveWorkspace_Should_CallCreateWorkspaceAndNotify_When_ModeIsCreate', () => {
    component.openCreateWorkspaceModal();
    component.onWorkspaceFormNameChange('Security Operations');
    component.onWorkspaceFormCodeChange('SEC');
    component.onWorkspaceFormDescriptionChange('Security controls');
    component.onWorkspaceFormColorSelect('#5C2D91');
    component.onWorkspaceFormRoleChange('Owner');
    component.onWorkspaceFormIsDefaultChange(true);

    component.saveWorkspace();

    expect(workspaceServiceSpy.createWorkspace).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'Security Operations',
        code: 'SEC',
        description: 'Security controls',
        color: '#5C2D91',
        role: 'Owner',
        isDefault: true,
      }),
    );
    expect(notificationServiceSpy.success).toHaveBeenCalledWith(
      jasmine.stringMatching(/created successfully/),
    );
    expect(component.snapshot.isWorkspaceModalOpen).toBeFalse();
  });

  it('openEditWorkspaceModal_Should_PopulateFormWithExistingValues_When_Invoked', () => {
    const ws = MOCK_WORKSPACES[0];
    component.openEditWorkspaceModal(ws);

    expect(component.snapshot.isWorkspaceModalOpen).toBeTrue();
    expect(component.snapshot.workspaceModalMode).toBe('edit');
    expect(component.snapshot.editingWorkspaceId).toBe(ws.id);
    expect(component.snapshot.workspaceFormName).toBe(ws.name);
    expect(component.snapshot.workspaceFormCode).toBe(ws.code);
  });

  it('saveWorkspace_Should_CallUpdateWorkspaceAndNotify_When_ModeIsEdit', () => {
    const ws = MOCK_WORKSPACES[0];
    component.openEditWorkspaceModal(ws);
    component.onWorkspaceFormNameChange('Updated Core Lab');

    component.saveWorkspace();

    expect(workspaceServiceSpy.updateWorkspace).toHaveBeenCalledWith(
      ws.id,
      jasmine.objectContaining({
        name: 'Updated Core Lab',
      }),
    );
    expect(notificationServiceSpy.success).toHaveBeenCalledWith(
      jasmine.stringMatching(/updated successfully/),
    );
    expect(component.snapshot.isWorkspaceModalOpen).toBeFalse();
  });

  it('openDeleteWorkspaceModal_Should_OpenConfirmModal_When_MultipleWorkspacesExist', () => {
    const ws = MOCK_WORKSPACES[1];
    component.openDeleteWorkspaceModal(ws);

    expect(component.snapshot.isDeleteWorkspaceModalOpen).toBeTrue();
    expect(component.snapshot.workspaceToDelete).toBe(ws);
  });

  it('confirmDeleteWorkspace_Should_CallDeleteWorkspaceAndNotify_When_Confirmed', () => {
    const ws = MOCK_WORKSPACES[1];
    component.openDeleteWorkspaceModal(ws);
    component.confirmDeleteWorkspace();

    expect(workspaceServiceSpy.deleteWorkspace).toHaveBeenCalledWith(ws.id);
    expect(notificationServiceSpy.success).toHaveBeenCalledWith(
      jasmine.stringMatching(/deleted/),
    );
    expect(component.snapshot.isDeleteWorkspaceModalOpen).toBeFalse();
  });

  it('onSetDefaultWorkspace_Should_CallServiceSetDefault_When_Invoked', () => {
    const ws = MOCK_WORKSPACES[1];
    component.onSetDefaultWorkspace(ws);

    expect(workspaceServiceSpy.setDefaultWorkspace).toHaveBeenCalledWith(ws.id);
    expect(notificationServiceSpy.success).toHaveBeenCalledWith(
      jasmine.stringMatching(/set as default/),
    );
  });

  it('onSelectAndSwitchWorkspace_Should_CallServiceSelectWorkspace_When_Invoked', () => {
    const ws = MOCK_WORKSPACES[2];
    component.onSelectAndSwitchWorkspace(ws);

    expect(workspaceServiceSpy.selectWorkspace).toHaveBeenCalledWith(ws);
    expect(notificationServiceSpy.success).toHaveBeenCalledWith(
      jasmine.stringMatching(/Switched active workspace/),
    );
  });

  it('onEscape_Should_CloseWorkspaceModals_When_Open', () => {
    // Workspace Create/Edit modal
    component.openCreateWorkspaceModal();
    expect(component.snapshot.isWorkspaceModalOpen).toBeTrue();
    component.onEscape();
    expect(component.snapshot.isWorkspaceModalOpen).toBeFalse();

    // Workspace Delete modal
    component.openDeleteWorkspaceModal(MOCK_WORKSPACES[0]);
    expect(component.snapshot.isDeleteWorkspaceModalOpen).toBeTrue();
    component.onEscape();
    expect(component.snapshot.isDeleteWorkspaceModalOpen).toBeFalse();
  });
});
