import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { TaskService } from '../../core/services/task.service';
import { TaskResult, TaskDetailsResult } from '../../core/models/task.models';
import { WorkspaceService } from '../../core/services/workspace.service';
import { MOCK_WORKSPACES } from '../../core/models/workspace.models';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let taskServiceSpy: jasmine.SpyObj<TaskService>;

  const mockTasks: TaskResult[] = [
    {
      id: 'task-1',
      workspaceId: 'ws-arch-core',
      title: 'Setup OTLP Tracing',
      description: 'Distributed tracing across services',
      status: 'InProgress',
      priority: 'High',
      deadline: '2026-10-10T00:00:00Z',
      assigneeId: 'user-123',
      tags: ['DevOps', 'Telemetry'],
    },
    {
      id: 'task-2',
      workspaceId: 'ws-arch-core',
      title: 'Fix Navigation Header',
      description: 'Align Azure logo and menu',
      status: 'Todo',
      priority: 'Low',
      deadline: null,
      assigneeId: null,
      tags: ['UI'],
    },
  ];

  const mockDetails: TaskDetailsResult = {
    ...mockTasks[0],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: null,
    createdBy: {
      id: 'user-123',
      email: 'test@example.com',
      userName: 'test_user',
      fullName: 'Test User',
    },
    assignee: {
      id: 'user-123',
      email: 'test@example.com',
      userName: 'test_user',
      fullName: 'Test User',
    },
    timeLogs: [
      {
        id: 'log-1',
        userId: 'user-123',
        minutesSpent: 45,
        description: 'Configured OTLP exporter',
        loggedDate: '2026-10-01',
        createdAt: '2026-10-01T10:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    localStorage.clear();
    authServiceSpy = jasmine.createSpyObj('AuthService', ['currentUser', 'logout']);
    authServiceSpy.currentUser.and.returnValue({
      sub: 'user-123',
      email: 'test@example.com',
      unique_name: 'test_user',
      role: 'User',
      exp: 9999999999,
      iat: 1000000000,
    });

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['info', 'success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'getMy',
      'getAll',
      'getById',
      'create',
      'update',
      'assign',
      'changeStatus',
      'logTime',
      'complete',
      'cancel',
    ]);

    taskServiceSpy.getMy.and.returnValue(
      of({ items: mockTasks, page: 1, pageSize: 10, totalCount: mockTasks.length }),
    );
    taskServiceSpy.getAll.and.returnValue(
      of({ items: mockTasks, page: 1, pageSize: 10, totalCount: mockTasks.length }),
    );
    taskServiceSpy.getById.and.returnValue(of(mockDetails));
    taskServiceSpy.create.and.returnValue(of('new-task-id'));
    taskServiceSpy.changeStatus.and.returnValue(of(void 0));
    taskServiceSpy.complete.and.returnValue(of(void 0));
    taskServiceSpy.cancel.and.returnValue(of(void 0));
    taskServiceSpy.logTime.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: TaskService, useValue: taskServiceSpy },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    routerSpy = router as unknown as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('Init_Should_LoadTasksAndComputeUserInitial_When_Created', () => {
    expect(component).toBeTruthy();
    expect(component.snapshot.userInitial).toBe('T');
    expect(taskServiceSpy.getMy).toHaveBeenCalledWith('all', 1, 10, 'ws-arch-core');
    expect(component.snapshot.tasks.length).toBe(2);
  });

  it('toggleDropdown_Should_ToggleDropdownState_When_Invoked', () => {
    expect(component.snapshot.dropdownOpen).toBeFalse();

    component['toggleDropdown']();
    expect(component.snapshot.dropdownOpen).toBeTrue();

    component['toggleDropdown']();
    expect(component.snapshot.dropdownOpen).toBeFalse();
  });

  it('closeDropdown_Should_SetDropdownOpenToFalse_When_Invoked', () => {
    component['toggleDropdown']();
    expect(component.snapshot.dropdownOpen).toBeTrue();

    component['closeDropdown']();
    expect(component.snapshot.dropdownOpen).toBeFalse();
  });

  it('onProfile_Should_CloseDropdownAndNavigateToProfile_When_Invoked', () => {
    component['toggleDropdown']();
    component['onProfile']();

    expect(component.snapshot.dropdownOpen).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('onAdmin_Should_CloseDropdownAndNavigateToAdmin_When_Invoked', () => {
    component['toggleDropdown']();
    component['onAdmin']();

    expect(component.snapshot.dropdownOpen).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
  });


  it('onLogout_Should_NotifyAndCallAuthLogout_When_Invoked', () => {
    component['onLogout']();

    expect(notificationServiceSpy.info).toHaveBeenCalledWith('You have been signed out.');
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('onDocumentClick_Should_CloseDropdown_When_ClickedOutside', () => {
    component['toggleDropdown']();
    expect(component.snapshot.dropdownOpen).toBeTrue();

    const outsideElement = document.createElement('div');
    const mouseEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(mouseEvent, 'target', { value: outsideElement });

    component['onDocumentClick'](mouseEvent);
    expect(component.snapshot.dropdownOpen).toBeFalse();
  });

  it('switchViewMode_Should_UpdateModeAndReloadTasks_When_Called', () => {
    component['switchViewMode']('all-tasks');

    expect(component.snapshot.viewMode).toBe('all-tasks');
    expect(taskServiceSpy.getAll).toHaveBeenCalledWith(1, 10, 'ws-arch-core');
  });

  it('setMyFilterType_Should_UpdateFilterAndReload_When_Called', () => {
    component['setMyFilterType']('assigned');

    expect(component.snapshot.myFilterType).toBe('assigned');
    expect(taskServiceSpy.getMy).toHaveBeenCalledWith('assigned', 1, 10, 'ws-arch-core');
  });

  it('filterTasks_Should_FilterTasksByQueryStatusAndPriority_When_FiltersChanged', (done) => {
    component['setStatusFilter']('InProgress');
    component['setPriorityFilter']('High');
    component['onSearchChange']('OTLP');

    component.filteredTasks$.subscribe((tasks) => {
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('task-1');
      done();
    });
  });

  it('onSelectTask_Should_FetchDetailsAndOpenBlade_When_Invoked', () => {
    component['onSelectTask'](mockTasks[0]);

    expect(taskServiceSpy.getById).toHaveBeenCalledWith('task-1');
    expect(component.snapshot.isBladeOpen).toBeTrue();
    expect(component.snapshot.selectedTask?.id).toBe('task-1');
    expect(component.snapshot.selectedTask?.timeLogs.length).toBe(1);

    component['closeBlade']();
    expect(component.snapshot.isBladeOpen).toBeFalse();
    expect(component.snapshot.selectedTask).toBeNull();
  });

  it('openCreateModal_Should_ResetFormAndOpenModal_When_Called', () => {
    component['openCreateModal']();

    expect(component.snapshot.isCreateModalOpen).toBeTrue();
    expect(component['createTaskForm'].get('title')?.value).toBe('');

    component['closeCreateModal']();
    expect(component.snapshot.isCreateModalOpen).toBeFalse();
  });

  it('EmptyColumnButton_Should_OpenCreateModal_When_Clicked', () => {
    const emptyBtn = fixture.nativeElement.querySelector('#btn-add-item-inreview');
    expect(emptyBtn).toBeTruthy();

    emptyBtn.click();
    fixture.detectChanges();

    expect(component.snapshot.isCreateModalOpen).toBeTrue();
  });

  it('onCreateTaskSubmit_Should_CreateTaskAndReload_When_FormIsValid', () => {
    component['openCreateModal']();
    component['createTaskForm'].setValue({
      title: 'New Integration Test',
      description: 'Write integration test with WebApplicationFactory',
      priority: 'High',
      deadline: '2026-10-15',
      tags: 'Test, Backend',
    });

    component['onCreateTaskSubmit']();

    expect(taskServiceSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        workspaceId: 'ws-arch-core',
        title: 'New Integration Test',
      }),
    );
    expect(notificationServiceSpy.success).toHaveBeenCalledWith('Task created successfully.');
    expect(component.snapshot.isCreateModalOpen).toBeFalse();
  });

  it('onCreateTaskSubmit_Should_MarkTouchedAndNotSubmit_When_Invalid', () => {
    component['openCreateModal']();
    component['createTaskForm'].setValue({
      title: '',
      description: '',
      priority: 'Low',
      deadline: '',
      tags: '',
    });

    component['onCreateTaskSubmit']();

    expect(taskServiceSpy.create).not.toHaveBeenCalled();
    expect(component['createTaskForm'].get('title')?.touched).toBeTrue();
  });

  it('Tags_Should_AddChip_When_UserPressesEnter', () => {
    component['openCreateModal']();
    component['tagInputText'] = 'Security';
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    component['onTagKeyDown'](enterEvent);

    expect(component['createdTags']).toContain('Security');
    expect(component['tagInputText']).toBe('');
    expect(component['createTaskForm'].get('tags')?.value).toBe('Security');
  });

  it('Tags_Should_AddChips_When_CommaSeparatedWordEntered', () => {
    component['openCreateModal']();
    component['onTagInput']('Auth, Gateway,');

    expect(component['createdTags']).toEqual(['Auth', 'Gateway']);
    expect(component['tagInputText']).toBe('');
    expect(component['createTaskForm'].get('tags')?.value).toBe('Auth, Gateway');
  });

  it('Tags_Should_RemoveChip_When_RemoveButtonClicked', () => {
    component['openCreateModal']();
    component['addCreatedTag']('DevOps');
    component['addCreatedTag']('Frontend');
    expect(component['createdTags'].length).toBe(2);

    component['removeCreatedTag']('DevOps');
    expect(component['createdTags']).toEqual(['Frontend']);
    expect(component['createTaskForm'].get('tags')?.value).toBe('Frontend');
  });

  it('Tags_Should_RemoveLastChip_When_BackspacePressedOnEmptyInput', () => {
    component['openCreateModal']();
    component['addCreatedTag']('CI/CD');
    component['addCreatedTag']('Docker');
    component['tagInputText'] = '';

    const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace' });
    component['onTagKeyDown'](backspaceEvent);

    expect(component['createdTags']).toEqual(['CI/CD']);
  });

  it('Tags_Should_FlushPendingText_When_SubmittingForm', () => {
    component['openCreateModal']();
    component['createTaskForm'].patchValue({
      title: 'Task with pending tag',
      priority: 'Low',
    });
    component['tagInputText'] = 'Database';

    component['onCreateTaskSubmit']();

    expect(taskServiceSpy.create).toHaveBeenCalled();
    const createCallArg = taskServiceSpy.create.calls.mostRecent().args[0];
    expect(createCallArg.tags).toContain('Database');
  });

  it('onChangeStatus_Should_CallTaskServiceAndNotify_When_Called', () => {
    component['onChangeStatus'](mockTasks[0], 'Done');

    expect(taskServiceSpy.changeStatus).toHaveBeenCalledWith('task-1', { status: 'Done' });
    expect(notificationServiceSpy.success).toHaveBeenCalledWith('Status changed to Done.');
    const updated = component.snapshot.tasks.find((t) => t.id === 'task-1');
    expect(updated?.status).toBe('Done');
  });

  it('onCompleteTask_Should_CallTaskServiceComplete_When_Called', () => {
    component['onCompleteTask'](mockTasks[0]);

    expect(taskServiceSpy.complete).toHaveBeenCalledWith('task-1');
    expect(notificationServiceSpy.success).toHaveBeenCalledWith('Task completed successfully.');
    const updated = component.snapshot.tasks.find((t) => t.id === 'task-1');
    expect(updated?.status).toBe('Done');
  });

  it('onCancelTask_Should_CallTaskServiceCancel_When_Called', () => {
    component['onCancelTask'](mockTasks[0]);

    expect(taskServiceSpy.cancel).toHaveBeenCalledWith('task-1');
    expect(notificationServiceSpy.info).toHaveBeenCalledWith('Task cancelled.');
    const updated = component.snapshot.tasks.find((t) => t.id === 'task-1');
    expect(updated?.status).toBe('Cancelled');
  });

  it('onLogTimeSubmit_Should_LogTimeAndCloseModal_When_Valid', () => {
    component['openLogTimeModal'](mockTasks[0]);
    expect(component.snapshot.isLogTimeModalOpen).toBeTrue();
    expect(component.snapshot.taskForTimeLog?.id).toBe('task-1');

    component['logTimeForm'].setValue({
      minutesSpent: 90,
      description: 'Wrote unit tests',
      loggedDate: '2026-10-01',
    });

    component['onLogTimeSubmit']();

    expect(taskServiceSpy.logTime).toHaveBeenCalledWith('task-1', {
      minutesSpent: 90,
      description: 'Wrote unit tests',
      loggedDate: '2026-10-01',
    });
    expect(notificationServiceSpy.success).toHaveBeenCalledWith('Logged 90 minutes.');
    expect(component.snapshot.isLogTimeModalOpen).toBeFalse();
  });

  it('setTimePreset_Should_UpdateMinutesSpentInForm_When_Invoked', () => {
    expect(component.timePresets.length).toBe(5);

    component['setTimePreset'](30);
    expect(component['logTimeForm'].get('minutesSpent')?.value).toBe(30);

    component['setTimePreset'](60);
    expect(component['logTimeForm'].get('minutesSpent')?.value).toBe(60);

    component['setTimePreset'](120);
    expect(component['logTimeForm'].get('minutesSpent')?.value).toBe(120);

    component['setTimePreset'](240);
    expect(component['logTimeForm'].get('minutesSpent')?.value).toBe(240);

    component['setTimePreset'](480);
    expect(component['logTimeForm'].get('minutesSpent')?.value).toBe(480);
  });


  it('onEscape_Should_CloseOpenModalsOrBladePriorToDropdown_When_Invoked', () => {
    // 1. Create Modal
    component['openCreateModal']();
    expect(component.snapshot.isCreateModalOpen).toBeTrue();
    component['onEscape']();
    expect(component.snapshot.isCreateModalOpen).toBeFalse();

    // 2. Log Time Modal
    component['openLogTimeModal'](mockTasks[0]);
    expect(component.snapshot.isLogTimeModalOpen).toBeTrue();
    component['onEscape']();
    expect(component.snapshot.isLogTimeModalOpen).toBeFalse();

    // 3. Blade
    component['onSelectTask'](mockTasks[0]);
    expect(component.snapshot.isBladeOpen).toBeTrue();
    component['onEscape']();
    expect(component.snapshot.isBladeOpen).toBeFalse();

    // 4. Dropdown
    component['toggleDropdown']();
    expect(component.snapshot.dropdownOpen).toBeTrue();
    component['onEscape']();
    expect(component.snapshot.dropdownOpen).toBeFalse();
  });

  it('loadTasks_Should_HandleError_When_TaskServiceFails', () => {
    taskServiceSpy.getMy.and.returnValue(throwError(() => new Error('Service down')));

    component['loadTasks']();

    expect(component.snapshot.tasks).toEqual([]);
    expect(component.snapshot.loading).toBeFalse();
  });

  it('setLayoutMode_Should_UpdateLayoutMode_When_Invoked', () => {
    expect(component.snapshot.layoutMode).toBe('board');
    component['setLayoutMode']('list');
    expect(component.snapshot.layoutMode).toBe('list');
    component['setLayoutMode']('board');
    expect(component.snapshot.layoutMode).toBe('board');
  });

  it('columns$_Should_GroupTasksByStatus_When_Subscribed', (done) => {
    component.columns$.subscribe((columns) => {
      expect(columns.length).toBe(5);
      const todoCol = columns.find((c) => c.status === 'Todo');
      const inProgressCol = columns.find((c) => c.status === 'InProgress');
      expect(todoCol?.count).toBe(1);
      expect(inProgressCol?.count).toBe(1);
      done();
    });
  });

  it('onDetailsStatusChange_Should_CallChangeStatus_When_SelectedTaskPresent', () => {
    component['onSelectTask'](mockTasks[0]);
    component['onDetailsStatusChange']('Done');

    expect(taskServiceSpy.changeStatus).toHaveBeenCalledWith('task-1', { status: 'Done' });
  });

  it('openLogTimeForSelected_Should_OpenModal_When_SelectedTaskPresent', () => {
    component['onSelectTask'](mockTasks[0]);
    component['openLogTimeForSelected']();

    expect(component.snapshot.isLogTimeModalOpen).toBeTrue();
    expect(component.snapshot.taskForTimeLog?.id).toBe('task-1');
  });

  it('onDetailsComplete_Should_CompleteSelectedTask_When_Invoked', () => {
    component['onSelectTask'](mockTasks[0]);
    component['onDetailsComplete']();

    expect(taskServiceSpy.complete).toHaveBeenCalledWith('task-1');
  });

  it('onDetailsCancel_Should_CancelSelectedTask_When_Invoked', () => {
    component['onSelectTask'](mockTasks[0]);
    component['onDetailsCancel']();

    expect(taskServiceSpy.cancel).toHaveBeenCalledWith('task-1');
  });

  it('setActiveTab_Should_UpdateActiveTabAndLayoutMode_When_Invoked', () => {
    expect(component.snapshot.activeTab).toBe('board');
    expect(component.snapshot.layoutMode).toBe('board');

    component['setActiveTab']('list');
    expect(component.snapshot.activeTab).toBe('list');
    expect(component.snapshot.layoutMode).toBe('list');

    component['setActiveTab']('statistics');
    expect(component.snapshot.activeTab).toBe('statistics');

    component['setActiveTab']('board');
    expect(component.snapshot.activeTab).toBe('board');
    expect(component.snapshot.layoutMode).toBe('board');
  });

  it('resetFilters_Should_ResetAllFiltersToDefault_When_Invoked', () => {
    component['setStatusFilter']('InProgress');
    component['setPriorityFilter']('High');
    component['onSearchChange']('OTLP');

    expect(component.snapshot.statusFilter).toBe('InProgress');
    expect(component.snapshot.priorityFilter).toBe('High');
    expect(component.snapshot.searchQuery).toBe('OTLP');

    component['resetFilters']();

    expect(component.snapshot.statusFilter).toBe('ALL');
    expect(component.snapshot.priorityFilter).toBe('ALL');
    expect(component.snapshot.searchQuery).toBe('');
  });

  it('stats$_Should_ComputeAccurateAggregationsAndCompletionRate_When_Subscribed', (done) => {
    component.stats$.subscribe((stats) => {
      expect(stats.totalScope).toBe(2);
      expect(stats.total).toBe(2);
      expect(stats.todo).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.inReview).toBe(0);
      expect(stats.done).toBe(0);
      expect(stats.cancelled).toBe(0);
      expect(stats.high).toBe(1);
      expect(stats.low).toBe(1);
      expect(stats.completionRate).toBe(0);
      done();
    });
  });

  it('onWorkspaceChange_Should_SelectWorkspaceViaService_When_Triggered', () => {
    const workspaceService = TestBed.inject(WorkspaceService);
    const selectSpy = spyOn(workspaceService, 'selectWorkspace').and.callThrough();

    const targetWs = MOCK_WORKSPACES[1];
    component['onWorkspaceChange'](targetWs);

    expect(selectSpy).toHaveBeenCalledWith(targetWs);
    expect(notificationServiceSpy.info).toHaveBeenCalledWith(`Switched active workspace to: ${targetWs.name}`);
  });

  it('onWorkspaces_Should_CloseDropdownAndNavigateToWorkspaces', () => {
    component['onWorkspaces']();

    expect(component.snapshot.dropdownOpen).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/workspaces']);
  });
});

