import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkspaceService } from './workspace.service';
import { AuthService } from './auth.service';
import {
  Workspace,
  WorkspaceResult,
  WorkspaceDetailsResult,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  AddWorkspaceMemberRequest,
} from '../models/workspace.models';
import { PaginationResult } from '../models/task.models';
import { environment } from '../../../environments/environment';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let httpTesting: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  const baseUrl = `${environment.apiBaseUrl}/api/v1/workspaces`;

  const mockWorkspaces: Workspace[] = [
    {
      id: 'ws-1',
      name: 'Architecture Lab Core',
      code: 'ARCH',
      description: 'Clean architecture microservices',
      role: 'Owner',
      memberCount: 8,
      taskCount: 6,
      color: '#0078D4',
      isDefault: true,
    },
    {
      id: 'ws-2',
      name: 'Frontend Web Portal',
      code: 'WEB',
      description: 'Angular web client',
      role: 'Admin',
      memberCount: 12,
      taskCount: 14,
      color: '#107C10',
    },
    {
      id: 'ws-3',
      name: 'API Gateway & Security',
      code: 'GW',
      description: 'Reverse proxy and auth',
      role: 'Contributor',
      memberCount: 5,
      taskCount: 4,
      color: '#5C2D91',
    },
    {
      id: 'ws-4',
      name: 'DevOps & Telemetry',
      code: 'OPS',
      description: 'CI/CD and monitoring',
      role: 'Reader',
      memberCount: 4,
      taskCount: 3,
      color: '#D83B01',
    },
  ];

  const mockWorkspaceResult: WorkspaceResult = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Backend Core',
    ownerId: 'usr-1',
    description: 'Core backend microservices',
    memberCount: 3,
    taskCount: 5,
    createdAt: '2026-10-01T12:00:00Z',
    updatedAt: null,
  };

  const mockPagedWorkspaces: PaginationResult<WorkspaceResult> = {
    items: [mockWorkspaceResult],
    page: 1,
    pageSize: 10,
    totalCount: 1,
  };

  const mockDetailsResult: WorkspaceDetailsResult = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Backend Core',
    ownerId: 'usr-1',
    description: 'Core backend microservices',
    memberIds: ['usr-1', 'usr-2'],
    createdAt: '2026-10-01T12:00:00Z',
    updatedAt: null,
  };

  beforeEach(() => {
    localStorage.clear();

    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'currentUserId',
      'isAdmin',
      'isAuthenticated',
    ]);
    authServiceSpy.currentUserId.and.returnValue('usr-1');
    authServiceSpy.isAdmin.and.returnValue(true);
    authServiceSpy.isAuthenticated.and.returnValue(true);

    TestBed.configureTestingModule({
      providers: [
        WorkspaceService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(WorkspaceService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    httpTesting.verify();
  });

  it('InitialState_Should_ProvideEmptyWorkspacesAndNullSelection', (done) => {
    service.workspaces$.subscribe((workspaces) => {
      expect(workspaces.length).toBe(0);
      expect(service.currentWorkspace).toBeNull();
      done();
    });
  });

  it('getAll_Should_SendGetRequestWithPaginationAndFilter_When_Called', (done) => {
    service.getAll('Core', 1, 10).subscribe((result) => {
      expect(result).toEqual(mockPagedWorkspaces);
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}?page=1&pageSize=10&name=Core`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockPagedWorkspaces);
  });

  it('getById_Should_SendGetRequestToIdEndpoint_When_Called', (done) => {
    service.getById('11111111-1111-1111-1111-111111111111').subscribe((details) => {
      expect(details).toEqual(mockDetailsResult);
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/11111111-1111-1111-1111-111111111111`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockDetailsResult);
  });

  it('create_Should_SendPostRequestWithPayload_When_Called', (done) => {
    const payload: CreateWorkspaceRequest = {
      name: 'New Workspace',
      description: 'New Description',
    };

    service.create(payload).subscribe((id) => {
      expect(id).toBe('new-ws-id');
      done();
    });

    const req = httpTesting.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBeTrue();
    req.flush('new-ws-id');
  });

  it('update_Should_SendPutRequestWithPayload_When_Called', (done) => {
    const payload: UpdateWorkspaceRequest = {
      name: 'Updated Name',
      description: 'Updated Description',
    };

    service.update('11111111-1111-1111-1111-111111111111', payload).subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/11111111-1111-1111-1111-111111111111`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('delete_Should_SendDeleteRequestToIdEndpoint_When_Called', (done) => {
    service.delete('11111111-1111-1111-1111-111111111111').subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/11111111-1111-1111-1111-111111111111`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('addMember_Should_SendPostRequestToMembersEndpoint_When_Called', (done) => {
    const payload: AddWorkspaceMemberRequest = { userId: 'usr-99' };

    service.addMember('11111111-1111-1111-1111-111111111111', payload).subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/11111111-1111-1111-1111-111111111111/members`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('removeMember_Should_SendDeleteRequestToMemberEndpoint_When_Called', (done) => {
    service.removeMember('11111111-1111-1111-1111-111111111111', 'usr-99').subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(
      `${baseUrl}/11111111-1111-1111-1111-111111111111/members/usr-99`,
    );
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('loadWorkspaces_Should_MapResultsAndUpdateWorkspacesSubject', (done) => {
    service.loadWorkspaces().subscribe((workspaces) => {
      expect(workspaces.length).toBe(1);
      expect(workspaces[0].name).toBe('Backend Core');
      expect(workspaces[0].role).toBe('Owner');
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}?page=1&pageSize=10`);
    req.flush(mockPagedWorkspaces);
  });

  it('SelectWorkspace_Should_UpdateCurrentWorkspaceAndEmitNewValue', (done) => {
    service['workspacesSubject'].next([...mockWorkspaces]);
    const targetWs = mockWorkspaces[1];

    service.selectedWorkspace$.subscribe((ws) => {
      if (ws?.id === targetWs.id) {
        expect(ws.name).toBe(targetWs.name);
        expect(service.currentWorkspace?.id).toBe(targetWs.id);
        done();
      }
    });

    service.selectWorkspace(targetWs);
  });

  it('SelectWorkspaceById_Should_SelectWorkspace_When_IdExists', () => {
    service['workspacesSubject'].next([...mockWorkspaces]);
    const targetWs = mockWorkspaces[2];
    const result = service.selectWorkspaceById(targetWs.id);

    expect(result).toBeTrue();
    expect(service.currentWorkspace?.id).toBe(targetWs.id);
  });

  it('SelectWorkspaceById_Should_ReturnFalse_When_IdDoesNotExist', () => {
    service['workspacesSubject'].next([...mockWorkspaces]);
    const result = service.selectWorkspaceById('non-existent-id');

    expect(result).toBeFalse();
  });

  it('CreateWorkspace_Should_AppendNewWorkspaceAndEmitUpdate', (done) => {
    const newWsData: Omit<Workspace, 'id'> = {
      name: 'Custom Team Workspace',
      code: 'CTW',
      description: 'Brand new created workspace',
      role: 'Owner',
      memberCount: 1,
      taskCount: 0,
      color: '#00B294',
    };

    const initialLength = service.allWorkspaces.length;
    const created = service.createWorkspace(newWsData);

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Custom Team Workspace');

    service.workspaces$.subscribe((workspaces) => {
      expect(workspaces.length).toBe(initialLength + 1);
      expect(workspaces.some((w) => w.name === 'Custom Team Workspace')).toBeTrue();
      done();
    });
  });

  it('UpdateWorkspace_Should_ModifyExistingWorkspaceAndEmitUpdate', (done) => {
    service['workspacesSubject'].next([...mockWorkspaces]);
    const targetWs = mockWorkspaces[0];
    const updated = service.updateWorkspace(targetWs.id, {
      name: 'Renamed Core Lab',
      description: 'Updated description',
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Renamed Core Lab');

    service.workspaces$.subscribe((workspaces) => {
      const found = workspaces.find((w) => w.id === targetWs.id);
      expect(found?.name).toBe('Renamed Core Lab');
      expect(found?.description).toBe('Updated description');
      done();
    });
  });

  it('DeleteWorkspace_Should_RemoveWorkspaceAndEmitUpdate', (done) => {
    service['workspacesSubject'].next([...mockWorkspaces]);
    const targetWs = mockWorkspaces[3];
    const initialCount = service.allWorkspaces.length;

    const result = service.deleteWorkspace(targetWs.id);
    expect(result).toBeTrue();

    service.workspaces$.subscribe((workspaces) => {
      expect(workspaces.length).toBe(initialCount - 1);
      expect(workspaces.some((w) => w.id === targetWs.id)).toBeFalse();
      done();
    });
  });

  it('SetDefaultWorkspace_Should_DesignateOnlyTargetWorkspaceAsDefault', (done) => {
    service['workspacesSubject'].next([...mockWorkspaces]);
    const targetWs = mockWorkspaces[1];

    service.setDefaultWorkspace(targetWs.id);

    service.workspaces$.subscribe((workspaces) => {
      const target = workspaces.find((w) => w.id === targetWs.id);
      const others = workspaces.filter((w) => w.id !== targetWs.id);

      expect(target?.isDefault).toBeTrue();
      expect(others.every((w) => !w.isDefault)).toBeTrue();
      done();
    });
  });
});
