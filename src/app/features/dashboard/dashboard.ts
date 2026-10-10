import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { TaskService } from '../../core/services/task.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import {
  TaskResult,
  TaskDetailsResult,
  TaskStatus,
  Priority,
  MyTasksFilterType,
  CreateTaskRequest,
  LogTimeRequest,
} from '../../core/models/task.models';
import { Workspace } from '../../core/models/workspace.models';
import { TaskDetailsComponent } from './task-details/task-details.component';

export type DashboardTab = 'board' | 'list' | 'statistics';

export interface StatisticsSummary {
  readonly total: number;
  readonly todo: number;
  readonly inProgress: number;
  readonly inReview: number;
  readonly done: number;
  readonly cancelled: number;
  readonly critical: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
  readonly completionRate: number;
  readonly totalScope: number;
}

export interface BoardColumnData {
  readonly status: TaskStatus;
  readonly title: string;
  readonly colorClass: string;
  readonly count: number;
  readonly tasks: TaskResult[];
}

export const BOARD_COLUMNS: { status: TaskStatus; title: string; colorClass: string }[] = [
  { status: 'Todo', title: 'To Do', colorClass: 'col-todo' },
  { status: 'InProgress', title: 'In Progress', colorClass: 'col-in-progress' },
  { status: 'InReview', title: 'In Review', colorClass: 'col-in-review' },
  { status: 'Done', title: 'Done', colorClass: 'col-done' },
  { status: 'Cancelled', title: 'Cancelled', colorClass: 'col-cancelled' },
];

export interface DashboardState {
  readonly loading: boolean;
  readonly dropdownOpen: boolean;
  readonly userInitial: string;
  readonly activeTab: DashboardTab;
  readonly viewMode: 'my-tasks' | 'all-tasks';
  readonly layoutMode: 'board' | 'list';
  readonly myFilterType: MyTasksFilterType;
  readonly statusFilter: TaskStatus | 'ALL';
  readonly priorityFilter: Priority | 'ALL';
  readonly searchQuery: string;
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly tasks: TaskResult[];
  readonly selectedTask: TaskDetailsResult | null;
  readonly isBladeOpen: boolean;
  readonly isCreateModalOpen: boolean;
  readonly isLogTimeModalOpen: boolean;
  readonly taskForTimeLog: TaskResult | null;
  readonly workspaces: Workspace[];
  readonly selectedWorkspace: Workspace | null;
}

export interface KpiSummary {
  readonly total: number;
  readonly todo: number;
  readonly inProgress: number;
  readonly inReview: number;
  readonly done: number;
  readonly critical: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    RouterLink,
    TaskDetailsComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly workspaceService = inject(WorkspaceService);
  private readonly stateSubject = new BehaviorSubject<DashboardState>({
    loading: false,
    dropdownOpen: false,
    userInitial: this.calculateUserInitial(),
    activeTab: 'board',
    viewMode: 'my-tasks',
    layoutMode: 'board',
    myFilterType: 'all',
    statusFilter: 'ALL',
    priorityFilter: 'ALL',
    searchQuery: '',
    page: 1,
    pageSize: 10,
    totalCount: 0,
    tasks: [],
    selectedTask: null,
    isBladeOpen: false,
    isCreateModalOpen: false,
    isLogTimeModalOpen: false,
    taskForTimeLog: null,
    workspaces: [],
    selectedWorkspace: null,
  });

  readonly state$: Observable<DashboardState> = this.stateSubject.asObservable();

  readonly filteredTasks$: Observable<TaskResult[]> = this.state$.pipe(
    map((s) => this.filterTasks(s.tasks, s.searchQuery, s.statusFilter, s.priorityFilter)),
  );

  readonly columns$: Observable<BoardColumnData[]> = this.filteredTasks$.pipe(
    map((tasks) =>
      BOARD_COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        return {
          ...col,
          count: colTasks.length,
          tasks: colTasks,
        };
      }),
    ),
  );

  readonly stats$: Observable<StatisticsSummary> = combineLatest([
    this.filteredTasks$,
    this.state$,
  ]).pipe(
    map(([filtered, state]) => {
      const total = filtered.length;
      const todo = filtered.filter((t) => t.status === 'Todo').length;
      const inProgress = filtered.filter((t) => t.status === 'InProgress').length;
      const inReview = filtered.filter((t) => t.status === 'InReview').length;
      const done = filtered.filter((t) => t.status === 'Done').length;
      const cancelled = filtered.filter((t) => t.status === 'Cancelled').length;
      const critical = filtered.filter((t) => t.priority === 'Critical').length;
      const high = filtered.filter((t) => t.priority === 'High').length;
      const medium = filtered.filter((t) => t.priority === 'Medium').length;
      const low = filtered.filter((t) => t.priority === 'Low').length;
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        total,
        todo,
        inProgress,
        inReview,
        done,
        cancelled,
        critical,
        high,
        medium,
        low,
        completionRate,
        totalScope: state.tasks.length,
      };
    }),
  );

  readonly kpi$: Observable<KpiSummary> = this.stats$.pipe(
    map((s) => ({
      total: s.totalScope,
      todo: s.todo,
      inProgress: s.inProgress,
      inReview: s.inReview,
      done: s.done,
      critical: s.critical,
    })),
  );

  get snapshot(): DashboardState {
    return this.stateSubject.value;
  }

  protected readonly createTaskForm: FormGroup;
  protected readonly logTimeForm: FormGroup;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    protected readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly taskService: TaskService,
    private readonly fb: FormBuilder,
    private readonly elementRef: ElementRef,
    private readonly router: Router,
  ) {
    this.createTaskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      priority: ['Medium' as Priority, [Validators.required]],
      deadline: [''],
      tags: [''],
    });

    this.logTimeForm = this.fb.group({
      minutesSpent: [30, [Validators.required, Validators.min(1)]],
      description: [''],
      loggedDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.updateState({ userInitial: this.calculateUserInitial() });

    this.workspaceService.selectedWorkspace$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ws) => {
        this.updateState({ selectedWorkspace: ws, page: 1 });
        if (ws?.id) {
          this.loadTasks();
        } else {
          this.updateState({ loading: false, tasks: [], totalCount: 0 });
        }
      });
  }

  protected onWorkspaces(): void {
    this.updateState({ dropdownOpen: false });
    this.router.navigate(['/workspaces']);
  }

  protected loadTasks(): void {
    const current = this.snapshot;
    const workspaceId =
      current.selectedWorkspace?.id || this.workspaceService.currentWorkspace?.id || null;

    if (!workspaceId) {
      this.updateState({ loading: false, tasks: [], totalCount: 0 });
      return;
    }

    this.updateState({ loading: true });

    const request$ =
      current.viewMode === 'my-tasks'
        ? this.taskService.getMy(current.myFilterType, current.page, current.pageSize, workspaceId)
        : this.taskService.getAll(current.page, current.pageSize, workspaceId);

    request$
      .pipe(
        catchError(() => {
          return of({
            items: [],
            page: 1,
            pageSize: 10,
            totalCount: 0,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          const items = res?.items ?? [];
          this.updateState({
            loading: false,
            tasks: items,
            totalCount: res?.totalCount ?? items.length,
            page: res?.page ?? 1,
          });
        },
        error: () => {
          this.updateState({ loading: false });
        },
      });
  }

  protected switchViewMode(mode: 'my-tasks' | 'all-tasks'): void {
    this.updateState({ viewMode: mode, page: 1 });
    this.loadTasks();
  }

  protected setLayoutMode(mode: 'board' | 'list'): void {
    this.updateState({ layoutMode: mode, activeTab: mode });
  }

  protected setActiveTab(tab: DashboardTab): void {
    this.updateState({
      activeTab: tab,
      layoutMode: tab === 'list' ? 'list' : 'board',
    });
  }

  protected onWorkspaceChange(workspace: Workspace): void {
    this.workspaceService.selectWorkspace(workspace);
    this.notificationService.info(`Switched active workspace to: ${workspace.name}`);
  }

  protected onCreateWorkspace(): void {
    this.notificationService.info(
      'Workspace creation is simulated in mock mode. API integration pending.',
    );
  }

  protected resetFilters(): void {
    this.updateState({
      statusFilter: 'ALL',
      priorityFilter: 'ALL',
      searchQuery: '',
      myFilterType: 'all',
    });
  }

  protected setMyFilterType(type: MyTasksFilterType): void {
    this.updateState({ myFilterType: type, page: 1 });
    this.loadTasks();
  }

  protected setStatusFilter(status: TaskStatus | 'ALL'): void {
    this.updateState({ statusFilter: status });
  }

  protected setPriorityFilter(priority: Priority | 'ALL'): void {
    this.updateState({ priorityFilter: priority });
  }

  protected onSearchChange(term: string): void {
    this.updateState({ searchQuery: term });
  }

  protected onSelectTask(task: TaskResult): void {
    this.taskService
      .getById(task.id)
      .pipe(
        catchError(() => {
          this.notificationService.error('Failed to load task details.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((details) => {
        if (details) {
          this.updateState({ selectedTask: details, isBladeOpen: true });
        }
      });
  }

  protected closeBlade(): void {
    this.updateState({ isBladeOpen: false, selectedTask: null });
  }

  protected onDetailsStatusChange(newStatus: TaskStatus): void {
    if (this.snapshot.selectedTask) {
      this.onChangeStatus(this.snapshot.selectedTask, newStatus);
    }
  }

  protected openLogTimeForSelected(): void {
    if (this.snapshot.selectedTask) {
      this.openLogTimeModal(this.snapshot.selectedTask);
    }
  }

  protected onDetailsComplete(): void {
    if (this.snapshot.selectedTask) {
      this.onCompleteTask(this.snapshot.selectedTask);
    }
  }

  protected onDetailsCancel(): void {
    if (this.snapshot.selectedTask) {
      this.onCancelTask(this.snapshot.selectedTask);
    }
  }

  protected createdTags: string[] = [];
  protected tagInputText = '';

  protected focusTagInput(inputEl: HTMLInputElement): void {
    inputEl.focus();
  }

  protected onTagInput(value: string): void {
    if (value.includes(',')) {
      const parts = value.split(',');
      for (const part of parts) {
        this.addCreatedTag(part);
      }
      this.tagInputText = '';
    } else {
      this.tagInputText = value;
    }
  }

  protected onTagKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (this.tagInputText.trim()) {
        this.addCreatedTag(this.tagInputText);
        this.tagInputText = '';
      }
    } else if (event.key === 'Backspace' && !this.tagInputText && this.createdTags.length > 0) {
      this.removeCreatedTag(this.createdTags[this.createdTags.length - 1]);
    }
  }

  protected onTagBlur(): void {
    if (this.tagInputText.trim()) {
      this.addCreatedTag(this.tagInputText);
      this.tagInputText = '';
    }
  }

  protected addCreatedTag(tag: string): void {
    const trimmed = tag.trim();
    if (trimmed && !this.createdTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      this.createdTags = [...this.createdTags, trimmed];
      this.createTaskForm.get('tags')?.setValue(this.createdTags.join(', '));
    }
  }

  protected removeCreatedTag(tag: string, event?: Event): void {
    event?.stopPropagation();
    this.createdTags = this.createdTags.filter((t) => t !== tag);
    this.createTaskForm.get('tags')?.setValue(this.createdTags.join(', '));
  }

  protected openCreateModal(): void {
    this.createdTags = [];
    this.tagInputText = '';
    this.createTaskForm.reset({
      title: '',
      priority: 'Medium',
      deadline: '',
      description: '',
      tags: '',
    });
    this.updateState({ isCreateModalOpen: true });
  }

  protected closeCreateModal(): void {
    this.createdTags = [];
    this.tagInputText = '';
    this.updateState({ isCreateModalOpen: false });
  }

  protected onCreateTaskSubmit(): void {
    if (this.tagInputText.trim()) {
      this.addCreatedTag(this.tagInputText);
      this.tagInputText = '';
    }

    if (this.createTaskForm.invalid) {
      this.createTaskForm.markAllAsTouched();
      return;
    }

    const val = this.createTaskForm.value;
    const formTagsArray = val.tags
      ? val.tags
          .split(',')
          .map((t: string) => t.trim())
          .filter((t: string) => !!t)
      : [];
    const tagsArray = this.createdTags.length > 0 ? [...this.createdTags] : formTagsArray;

    const activeWorkspaceId =
      this.snapshot.selectedWorkspace?.id || this.workspaceService.currentWorkspace?.id || '';

    if (!activeWorkspaceId) {
      this.notificationService.error('Please select or create a workspace before creating tasks.');
      return;
    }

    const request: CreateTaskRequest = {
      workspaceId: activeWorkspaceId,
      title: val.title.trim(),
      description: val.description?.trim() || null,
      priority: val.priority,
      deadline: val.deadline ? new Date(val.deadline).toISOString() : null,
      tags: tagsArray,
    };

    this.taskService
      .create(request)
      .pipe(
        catchError(() => {
          this.notificationService.error('Failed to create task.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result) {
          this.notificationService.success('Task created successfully.');
          this.closeCreateModal();
          this.loadTasks();
        }
      });
  }

  protected onChangeStatus(task: TaskResult, status: TaskStatus): void {
    this.taskService
      .changeStatus(task.id, { status })
      .pipe(
        catchError(() => of(void 0)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const updated = this.snapshot.tasks.map((t) => (t.id === task.id ? { ...t, status } : t));
        const updatedSelected =
          this.snapshot.selectedTask?.id === task.id
            ? { ...this.snapshot.selectedTask, status }
            : this.snapshot.selectedTask;
        this.updateState({ tasks: updated, selectedTask: updatedSelected });
        this.notificationService.success(`Status changed to ${status}.`);
      });
  }

  protected onCompleteTask(task: TaskResult): void {
    this.taskService
      .complete(task.id)
      .pipe(
        catchError(() => of(void 0)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const updated = this.snapshot.tasks.map((t) =>
          t.id === task.id ? { ...t, status: 'Done' as TaskStatus } : t,
        );
        this.updateState({ tasks: updated });
        this.notificationService.success('Task completed successfully.');
      });
  }

  protected onCancelTask(task: TaskResult): void {
    this.taskService
      .cancel(task.id)
      .pipe(
        catchError(() => of(void 0)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const updated = this.snapshot.tasks.map((t) =>
          t.id === task.id ? { ...t, status: 'Cancelled' as TaskStatus } : t,
        );
        this.updateState({ tasks: updated });
        this.notificationService.info('Task cancelled.');
      });
  }

  readonly timePresets: { minutes: number; label: string; description: string }[] = [
    { minutes: 30, label: '30m', description: '30 minutes' },
    { minutes: 60, label: '1h', description: '1 hour' },
    { minutes: 120, label: '2h', description: '2 hours' },
    { minutes: 240, label: '4h', description: '4 hours' },
    { minutes: 480, label: '8h', description: '8 hours' },
  ];

  protected setTimePreset(minutes: number): void {
    this.logTimeForm.patchValue({ minutesSpent: minutes });
    this.logTimeForm.get('minutesSpent')?.markAsDirty();
  }

  protected openLogTimeModal(task: TaskResult): void {
    this.logTimeForm.reset({
      minutesSpent: 60,
      description: '',
      loggedDate: new Date().toISOString().substring(0, 10),
    });
    this.updateState({ isLogTimeModalOpen: true, taskForTimeLog: task });
  }

  protected closeLogTimeModal(): void {
    this.updateState({ isLogTimeModalOpen: false, taskForTimeLog: null });
  }

  protected onLogTimeSubmit(): void {
    if (this.logTimeForm.invalid || !this.snapshot.taskForTimeLog) {
      this.logTimeForm.markAllAsTouched();
      return;
    }

    const taskId = this.snapshot.taskForTimeLog.id;
    const val = this.logTimeForm.value;
    const req: LogTimeRequest = {
      minutesSpent: Number(val.minutesSpent),
      description: val.description?.trim() || null,
      loggedDate: val.loggedDate,
    };

    this.taskService
      .logTime(taskId, req)
      .pipe(
        catchError(() => of(void 0)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.notificationService.success(`Logged ${req.minutesSpent} minutes.`);
        this.closeLogTimeModal();
      });
  }

  protected toggleDropdown(): void {
    this.updateState({ dropdownOpen: !this.stateSubject.value.dropdownOpen });
  }

  protected closeDropdown(): void {
    this.updateState({ dropdownOpen: false });
  }

  protected onProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/profile']);
  }

  protected onAdmin(): void {
    this.closeDropdown();
    this.router.navigate(['/admin']);
  }

  protected onLogout(): void {
    this.closeDropdown();
    this.notificationService.info('You have been signed out.');
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.stateSubject.value.dropdownOpen) return;
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.querySelector('.user-menu-container')?.contains(target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.snapshot.isCreateModalOpen) {
      this.closeCreateModal();
    } else if (this.snapshot.isLogTimeModalOpen) {
      this.closeLogTimeModal();
    } else if (this.snapshot.isBladeOpen) {
      this.closeBlade();
    } else {
      this.closeDropdown();
    }
  }

  private filterTasks(
    tasks: TaskResult[],
    query: string,
    status: TaskStatus | 'ALL',
    priority: Priority | 'ALL',
  ): TaskResult[] {
    const q = (query || '').toLowerCase().trim();
    return tasks.filter((t) => {
      const matchesQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q));

      const matchesStatus = status === 'ALL' || t.status === status;
      const matchesPriority = priority === 'ALL' || t.priority === priority;

      return matchesQuery && matchesStatus && matchesPriority;
    });
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

  private updateState(partial: Partial<DashboardState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial,
    });
  }
}
