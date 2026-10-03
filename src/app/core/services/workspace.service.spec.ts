import { TestBed } from '@angular/core/testing';
import { WorkspaceService } from './workspace.service';
import { MOCK_WORKSPACES, Workspace } from '../models/workspace.models';

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [WorkspaceService],
    });
    service = TestBed.inject(WorkspaceService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('InitialState_Should_ProvideMockWorkspacesAndDefaultSelection', (done) => {
    service.workspaces$.subscribe((workspaces) => {
      expect(workspaces.length).toBe(MOCK_WORKSPACES.length);
      expect(service.currentWorkspace.id).toBe(MOCK_WORKSPACES[0].id);
      done();
    });
  });

  it('SelectWorkspace_Should_UpdateCurrentWorkspaceAndEmitNewValue', (done) => {
    const targetWs = MOCK_WORKSPACES[1];

    service.selectedWorkspace$.subscribe((ws) => {
      if (ws.id === targetWs.id) {
        expect(ws.name).toBe(targetWs.name);
        expect(service.currentWorkspace.id).toBe(targetWs.id);
        done();
      }
    });

    service.selectWorkspace(targetWs);
  });

  it('SelectWorkspaceById_Should_SelectWorkspace_When_IdExists', () => {
    const targetWs = MOCK_WORKSPACES[2];
    const result = service.selectWorkspaceById(targetWs.id);

    expect(result).toBeTrue();
    expect(service.currentWorkspace.id).toBe(targetWs.id);
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
    const targetWs = MOCK_WORKSPACES[0];
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
    const targetWs = MOCK_WORKSPACES[3];
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
    const targetWs = MOCK_WORKSPACES[1];

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
