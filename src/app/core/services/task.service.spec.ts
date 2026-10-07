import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TaskService } from './task.service';
import {
  TaskResult,
  TaskDetailsResult,
  PaginationResult,
  CreateTaskRequest,
  UpdateTaskRequest,
  ChangeStatusRequest,
  LogTimeRequest,
} from '../models/task.models';
import { environment } from '../../../environments/environment';

describe('TaskService', () => {
  let service: TaskService;
  let httpTesting: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/api/v1/tasks`;

  const mockTask: TaskResult = {
    id: 'task-1',
    title: 'Design Dashboard Schema',
    description: 'Create Azure styled dashboard representation for tasks',
    status: 'InProgress',
    priority: 'High',
    deadline: '2026-10-15T00:00:00Z',
    assigneeId: 'user-1',
    tags: ['Frontend', 'Azure', 'UI'],
  };

  const mockTaskDetails: TaskDetailsResult = {
    ...mockTask,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null,
    createdBy: {
      id: 'user-2',
      email: 'creator@example.com',
      userName: 'creator_user',
      fullName: 'Creator User',
    },
    assignee: {
      id: 'user-1',
      email: 'assignee@example.com',
      userName: 'assignee_user',
      fullName: 'Assignee User',
    },
    timeLogs: [
      {
        id: 'log-1',
        userId: 'user-1',
        minutesSpent: 90,
        description: 'Initial schema layout',
        loggedDate: '2026-10-01',
        createdAt: '2026-10-01T12:00:00Z',
      },
    ],
  };

  const mockPagedTasks: PaginationResult<TaskResult> = {
    items: [mockTask],
    page: 1,
    pageSize: 10,
    totalCount: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TaskService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(TaskService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('getAll_Should_SendGetRequestWithPaginationParams_When_Called', (done) => {
    service.getAll(2, 20).subscribe((result) => {
      expect(result).toEqual(mockPagedTasks);
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}?page=2&pageSize=20`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockPagedTasks);
  });

  it('getAll_Should_SendGetRequestWithFilterParams_When_ParamsObjectProvided', (done) => {
    service
      .getAll({
        page: 1,
        pageSize: 15,
        search: 'auth',
        status: 'InProgress',
        priority: 'High',
        tag: 'backend',
      })
      .subscribe((result) => {
        expect(result).toEqual(mockPagedTasks);
        done();
      });

    const req = httpTesting.expectOne(
      `${baseUrl}?page=1&pageSize=15&search=auth&status=InProgress&priority=High&tag=backend`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockPagedTasks);
  });

  it('getAll_Should_SendGetRequestWithWorkspaceId_When_WorkspaceIdProvided', (done) => {
    service.getAll(1, 10, null, null, null, 'ws-123').subscribe((result) => {
      expect(result).toEqual(mockPagedTasks);
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}?page=1&pageSize=10&workspaceId=ws-123`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockPagedTasks);
  });

  it('getMy_Should_SendGetRequestWithFilters_When_Called', (done) => {
    service.getMy('assigned', 1, 10).subscribe((result) => {
      expect(result).toEqual(mockPagedTasks);
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/my?page=1&pageSize=10&type=assigned`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockPagedTasks);
  });

  it('getMy_Should_SendGetRequestWithFilterParams_When_ParamsObjectProvided', (done) => {
    service
      .getMy({
        type: 'all',
        page: 2,
        pageSize: 25,
        search: 'ui',
        status: 'Todo',
        priority: 'Medium',
      })
      .subscribe((result) => {
        expect(result).toEqual(mockPagedTasks);
        done();
      });

    const req = httpTesting.expectOne(
      `${baseUrl}/my?page=2&pageSize=25&type=all&search=ui&status=Todo&priority=Medium`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockPagedTasks);
  });

  it('getById_Should_SendGetRequestToIdEndpoint_When_Called', (done) => {
    service.getById('task-1').subscribe((details) => {
      expect(details).toEqual(mockTaskDetails);
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/task-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockTaskDetails);
  });

  it('create_Should_SendPostRequestWithPayload_When_Called', (done) => {
    const payload: CreateTaskRequest = {
      title: 'New Task',
      description: 'Description',
      priority: 'High',
      deadline: '2026-10-20T00:00:00Z',
      tags: ['Backend'],
    };

    service.create(payload).subscribe((id) => {
      expect(id).toBe('new-task-id');
      done();
    });

    const req = httpTesting.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBeTrue();
    req.flush('new-task-id');
  });

  it('update_Should_SendPutRequestWithPayload_When_Called', (done) => {
    const payload: UpdateTaskRequest = {
      title: 'Updated Task',
      priority: 'Critical',
    };

    service.update('task-1', payload).subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/task-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('assign_Should_SendPutRequestToAssignEndpoint_When_Called', (done) => {
    service.assign('task-1', 'user-456').subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/task-1/assign/user-456`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('changeStatus_Should_SendPatchRequestWithStatusPayload_When_Called', (done) => {
    const payload: ChangeStatusRequest = { status: 'Done' };

    service.changeStatus('task-1', payload).subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/task-1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('logTime_Should_SendPostRequestWithLogPayload_When_Called', (done) => {
    const payload: LogTimeRequest = {
      minutesSpent: 45,
      description: 'Code review',
      loggedDate: '2026-10-01',
    };

    service.logTime('task-1', payload).subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/task-1/time-logs`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('complete_Should_SendPostRequestToCompleteEndpoint_When_Called', (done) => {
    service.complete('task-1').subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/task-1/complete`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('cancel_Should_SendDeleteRequestToIdEndpoint_When_Called', (done) => {
    service.cancel('task-1').subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/task-1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });
});
