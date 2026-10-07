import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { of } from 'rxjs';
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

  const testWorkspaces: Workspace[] = [
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
      description: 'Angular client',
      role: 'Admin',
      memberCount: 12,
      taskCount: 14,
      color: '#107C10',
    },
    {
      id: 'ws-3',
      name: 'API Gateway & Security',
      code: 'GW',
      description: 'YARP reverse proxy',
      role: 'Contributor',
      memberCount: 5,
      taskCount: 4,
      color: '#5C2D91',
    },
    {
      id: 'ws-4',
      name: 'DevOps & Telemetry',
      code: 'OPS',
      description: 'Docker compose',
      role: 'Reader',
      memberCount: 4,
      taskCount: 3,
      color: '#D83B01',
    },
  ];

  const mockWorkspaceResult: WorkspaceResult = {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    name: 'Backend Core',
    description: 'Core microservices and clean architecture',
    ownerId: 'user-guid-1',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: null,
    memberCount: 3,
    membersCount: 3,
    taskCount: 7,
  };

  const mockPagedWorkspaces: PaginationResult<WorkspaceResult> = {
    items: [mockWorkspaceResult],
    page: 1,
    pageSize: 10,
    totalCount: 1,
  };

  const mockDetails: WorkspaceDetailsResult = {
    ...mockWorkspaceResult,
    members: [
      {
        id: 'member-1',
        userId: 'user-guid-1',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    authServiceSpy = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['getStoredToken', 'currentUser', 'isAdmin'],
      {
        isAuthenticated$: of(false),
      }
    );
    authServiceSpy.getStoredToken.and.returnValue(null);
    authServiceSpy.currentUser.and.returnValue(null);
    authServiceSpy.isAdmin.and.returnValue(false);

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
    httpTesting.verify();
    localStorage.clear();
  });

  it('InitialState_Should_ProvideEmptyWorkspacesAndNullSelection', (done) => {
    service.workspaces$.subscribe((workspaces) => {
      expect(workspaces.length).toBe(0);
      expect(service.currentWorkspace).toBeNull();
      done();
    });
  });

  it('SelectWorkspace_Should_UpdateCurrentWorkspaceAndEmitNewValue', (done) => {
    const targetWs = testWorkspaces[1];

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
    const created = service.createWorkspace(testWorkspaces[0]);
    const result = service.selectWorkspaceById(created.id);

    expect(result).toBeTrue();
    expect(service.currentWorkspace?.id).toBe(created.id);
  });

  it('SelectWorkspaceById_Should_ReturnFalse_When_IdDoesNotExist', () => {
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
    const created = service.createWorkspace(testWorkspaces[0]);
    const updated = service.updateWorkspace(created.id, {
      name: 'Renamed Core Lab',
      description: 'Updated description',
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Renamed Core Lab');

    service.workspaces$.subscribe((workspaces) => {
      const found = workspaces.find((w) => w.id === created.id);
      expect(found?.name).toBe('Renamed Core Lab');
      expect(found?.description).toBe('Updated description');
      done();
    });
  });

  it('DeleteWorkspace_Should_RemoveWorkspaceAndEmitUpdate', (done) => {
    const created = service.createWorkspace(testWorkspaces[0]);
    const initialCount = service.allWorkspaces.length;

    const result = service.deleteWorkspace(created.id);
    expect(result).toBeTrue();

    service.workspaces$.subscribe((workspaces) => {
      expect(workspaces.length).toBe(initialCount - 1);
      expect(workspaces.some((w) => w.id === created.id)).toBeFalse();
      done();
    });
  });

  it('SetDefaultWorkspace_Should_DesignateOnlyTargetWorkspaceAsDefault', (done) => {
    const ws1 = service.createWorkspace(testWorkspaces[0]);
    const ws2 = service.createWorkspace(testWorkspaces[1]);

    service.setDefaultWorkspace(ws2.id);

    service.workspaces$.subscribe((workspaces) => {
      const target = workspaces.find((w) => w.id === ws2.id);
      const others = workspaces.filter((w) => w.id !== ws2.id);

      expect(target?.isDefault).toBeTrue();
      expect(others.every((w) => !w.isDefault)).toBeTrue();
      done();
    });
  });

  // -------------------------------------------------------------
  // HTTP API Tests
  // -------------------------------------------------------------

  it('GetAll_Should_FetchWorkspacesFromApiWithQueryParams', (done) => {
    service.getAll(1, 10, 'Backend').subscribe((res) => {
      expect(res.items.length).toBe(1);
      expect(res.items[0].name).toBe('Backend Core');
      done();
    });

    const req = httpTesting.expectOne((r) =>
      r.url === baseUrl &&
      r.params.get('page') === '1' &&
      r.params.get('pageSize') === '10' &&
      r.params.get('name') === 'Backend'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPagedWorkspaces);
  });

  it('GetById_Should_FetchWorkspaceDetailsFromApi', (done) => {
    service.getById('3fa85f64-5717-4562-b3fc-2c963f66afa6').subscribe((res) => {
      expect(res.id).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
      expect(res.members?.length).toBe(1);
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/3fa85f64-5717-4562-b3fc-2c963f66afa6`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDetails);
  });

  it('Create_Should_PostToApiAndReturnCreatedId', (done) => {
    const request: CreateWorkspaceRequest = {
      name: 'New Workspace',
      description: 'Test description',
    };

    service.create(request).subscribe((id) => {
      expect(id).toBe('new-ws-guid');
      done();
    });

    const req = httpTesting.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush('new-ws-guid');
  });

  it('Update_Should_PutToApi', (done) => {
    const request: UpdateWorkspaceRequest = {
      name: 'Updated Name',
      description: 'Updated description',
    };

    service.update('ws-1', request).subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/ws-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(null);
  });

  it('Delete_Should_DeleteFromApi', (done) => {
    service.delete('ws-1').subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/ws-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('AddMember_Should_PostToMembersApi', (done) => {
    const request: AddWorkspaceMemberRequest = {
      userId: 'user-to-add',
    };

    service.addMember('ws-1', request).subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/ws-1/members`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(null);
  });

  it('RemoveMember_Should_DeleteFromMembersApi', (done) => {
    service.removeMember('ws-1', 'user-to-remove').subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/ws-1/members/user-to-remove`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('LoadWorkspaces_Should_FetchFromApiAndEmitUpdatedWorkspaces', (done) => {
    authServiceSpy.currentUser.and.returnValue({
      sub: 'user-guid-1',
      email: 'owner@example.com',
      unique_name: 'owner_user',
      role: 'User',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    service.loadWorkspaces(1, 10).subscribe((workspaces) => {
      expect(workspaces.length).toBe(1);
      expect(workspaces[0].name).toBe('Backend Core');
      expect(workspaces[0].role).toBe('Owner');
      expect(workspaces[0].taskCount).toBe(7);
      done();
    });

    const req = httpTesting.expectOne((r) => r.url === baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockPagedWorkspaces);
  });

  it('LoadWorkspaces_Should_SetIsNotFoundToTrue_When_ResponseIs404', (done) => {
    service.loadWorkspaces(1, 10).subscribe((workspaces) => {
      expect(workspaces.length).toBe(0);
      expect(service.isNotFound).toBeTrue();
      expect(service.currentWorkspace).toBeNull();
      done();
    });

    const req = httpTesting.expectOne((r) => r.url === baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('CreateWorkspace_Should_ResetIsNotFoundToFalse', () => {
    service.setIsNotFound(true);
    expect(service.isNotFound).toBeTrue();

    service.createWorkspace({
      name: 'New WS',
      code: 'NWS',
      description: 'New workspace description',
      role: 'Owner',
      color: '#0078D4',
      memberCount: 1,
      taskCount: 0,
    });

    expect(service.isNotFound).toBeFalse();
  });
});
