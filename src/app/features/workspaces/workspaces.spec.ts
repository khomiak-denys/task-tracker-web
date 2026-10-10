import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { WorkspacesComponent } from './workspaces';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Workspace } from '../../core/models/workspace.models';

describe('WorkspacesComponent', () => {
  let component: WorkspacesComponent;
  let fixture: ComponentFixture<WorkspacesComponent>;
  let workspaceServiceSpy: jasmine.SpyObj<WorkspaceService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  const mockWorkspaces: Workspace[] = [
    {
      id: 'ws-arch-core',
      name: 'Architecture Lab Core',
      code: 'ARCH',
      description: 'Clean architecture microservices, domain events & Aspire orchestrator',
      role: 'Owner',
      memberCount: 8,
      taskCount: 6,
      color: '#0078D4',
      isDefault: true,
    },
    {
      id: 'ws-frontend-web',
      name: 'Frontend Web Portal',
      code: 'WEB',
      description: 'Angular 20 OnPush client, Azure DevOps board & design system',
      role: 'Admin',
      memberCount: 12,
      taskCount: 14,
      color: '#107C10',
    },
    {
      id: 'ws-gateway-security',
      name: 'API Gateway & Security',
      code: 'GW',
      description: 'YARP reverse proxy, JWT refresh rotation & policy enforcements',
      role: 'Contributor',
      memberCount: 5,
      taskCount: 4,
      color: '#5C2D91',
    },
    {
      id: 'ws-infra-devops',
      name: 'DevOps & Telemetry',
      code: 'OPS',
      description: 'Docker compose, OpenTelemetry distributed traces & CI/CD',
      role: 'Reader',
      memberCount: 4,
      taskCount: 3,
      color: '#D83B01',
    },
  ];

  beforeEach(async () => {
    workspaceServiceSpy = jasmine.createSpyObj<WorkspaceService>(
      'WorkspaceService',
      ['selectWorkspace', 'createWorkspace', 'loadWorkspaces', 'create', 'setDefaultWorkspace'],
      {
        memberWorkspaces$: of(mockWorkspaces),
        workspaces$: of(mockWorkspaces),
        selectedWorkspace$: of(mockWorkspaces[0]),
        currentWorkspace: mockWorkspaces[0],
      },
    );
    workspaceServiceSpy.loadWorkspaces.and.returnValue(of(mockWorkspaces));
    workspaceServiceSpy.create.and.returnValue(of('new-id'));

    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'currentUser',
      'isAdmin',
      'isManager',
      'currentUserId',
      'logout',
    ]);
    authServiceSpy.currentUser.and.returnValue({
      sub: 'usr-1',
      email: 'john@example.com',
      unique_name: 'john_doe',
      name: 'John Doe',
      role: 'Manager',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });
    authServiceSpy.currentUserId.and.returnValue('usr-1');
    authServiceSpy.isAdmin.and.returnValue(true);
    authServiceSpy.isManager.and.returnValue(true);

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    notificationServiceSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'info',
      'success',
      'error',
    ]);

    await TestBed.configureTestingModule({
      imports: [WorkspacesComponent],
      providers: [
        { provide: WorkspaceService, useValue: workspaceServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspacesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('OnInit_Should_SetUserInitialAndRefreshWorkspaces', () => {
    component.state$.subscribe((state) => {
      expect(state.userInitial).toBe('J');
    });
    expect(workspaceServiceSpy.loadWorkspaces).toHaveBeenCalled();
  });

  it('Render_Should_DisplayAllMemberWorkspaces', () => {
    const cards = fixture.nativeElement.querySelectorAll('.workspace-card');
    expect(cards.length).toBe(mockWorkspaces.length);

    const firstCardTitle = fixture.nativeElement.querySelector('.workspace-card-title');
    expect(firstCardTitle.textContent).toContain(mockWorkspaces[0].name);

    const firstBadge = fixture.nativeElement.querySelector('.workspace-badge .badge-code');
    expect(firstBadge.textContent.trim()).toBe('A');

    const metaBtns = fixture.nativeElement.querySelectorAll('.card-meta-btn');
    expect(metaBtns.length).toBe(0);

    const firstMetaItem = fixture.nativeElement.querySelector('.card-meta-row .card-meta-item');
    expect(firstMetaItem.textContent).toContain('8 members');

    expect(fixture.nativeElement.querySelector('#btn-members-' + mockWorkspaces[0].id)).toBeNull();
    expect(fixture.nativeElement.querySelector('#btn-edit-' + mockWorkspaces[0].id)).toBeNull();
    expect(fixture.nativeElement.querySelector('#btn-delete-' + mockWorkspaces[0].id)).toBeNull();
  });

  it('Loading_Should_DisplaySkeletonCards_When_LoadingIsTrue', () => {
    component['updateState']({ loading: true });
    fixture.detectChanges();

    const skeletons = fixture.nativeElement.querySelectorAll('.skeleton-workspace-card');
    expect(skeletons.length).toBe(6);
  });

  it('GetWorkspaceInitial_Should_ReturnFirstLetterUppercase', () => {
    expect(component['getWorkspaceInitial']('second workspace')).toBe('S');
    expect(component['getWorkspaceInitial'](' Architecture ')).toBe('A');
    expect(component['getWorkspaceInitial']('')).toBe('W');
    expect(component['getWorkspaceInitial'](null)).toBe('W');
  });

  it('OnSelectWorkspace_Should_SetSelectedWorkspaceAndNavigateToDashboard', () => {
    const targetWs = mockWorkspaces[1];
    component['onSelectWorkspace'](targetWs);

    expect(workspaceServiceSpy.selectWorkspace).toHaveBeenCalledWith(targetWs);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    expect(notificationServiceSpy.info).toHaveBeenCalled();
  });

  it('FilterWorkspaces_Should_ReduceVisibleCards_When_SearchApplied', (done) => {
    component['updateSearch']('Web');
    fixture.detectChanges();

    component.filteredWorkspaces$.subscribe((filtered) => {
      expect(filtered.length).toBe(1);
      expect(filtered[0].code).toBe('WEB');
      done();
    });
  });

  it('CreateWorkspace_Should_CallApiAndReload_When_FormIsValid', () => {
    component['openCreateModal']();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.azure-modal')).toBeTruthy();

    component['createForm'].patchValue({
      name: 'New Platform',
      description: 'Platform workspace for testing',
    });

    component['submitCreateWorkspace']();

    expect(workspaceServiceSpy.create).toHaveBeenCalledWith({
      name: 'New Platform',
      description: 'Platform workspace for testing',
    });
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('OnSetDefault_Should_CallServiceSetDefaultWorkspaceAndNotify', () => {
    const target = mockWorkspaces[1];
    component['onSetDefault'](target);

    expect(workspaceServiceSpy.setDefaultWorkspace).toHaveBeenCalledWith(target.id);
    expect(notificationServiceSpy.success).toHaveBeenCalled();
  });

  it('ToggleDropdown_Should_InvertDropdownState', (done) => {
    component['toggleDropdown']();
    component.state$.subscribe((state) => {
      expect(state.dropdownOpen).toBeTrue();
      done();
    });
  });

  it('OnLogout_Should_CallAuthLogoutAndNotify', () => {
    component['onLogout']();

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(notificationServiceSpy.info).toHaveBeenCalledWith('You have been signed out.');
  });

  it('OnAdmin_Should_NavigateToAdminConsole', () => {
    component['onAdmin']();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('OnEscape_Should_CloseAnyOpenModal', () => {
    component['openCreateModal']();
    expect(component['stateSubject'].value.isCreateModalOpen).toBeTrue();

    component.onEscape();
    expect(component['stateSubject'].value.isCreateModalOpen).toBeFalse();
  });
});
