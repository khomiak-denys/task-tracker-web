import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
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

  const testWorkspaces: Workspace[] = [
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
      ['selectWorkspace', 'createWorkspace'],
      {
        memberWorkspaces$: of(testWorkspaces),
        workspaces$: of(testWorkspaces),
        selectedWorkspace$: of(testWorkspaces[0]),
        isNotFound$: of(false),
      }
    );

    authServiceSpy = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['currentUser', 'isAdmin', 'logout']
    );
    authServiceSpy.currentUser.and.returnValue({
      sub: 'usr-1',
      email: 'john@example.com',
      unique_name: 'john_doe',
      name: 'John Doe',
      role: 'User',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });
    authServiceSpy.isAdmin.and.returnValue(false);

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    notificationServiceSpy = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['info', 'success', 'error']
    );

    await TestBed.configureTestingModule({
      imports: [WorkspacesComponent],
      providers: [
        { provide: WorkspaceService, useValue: workspaceServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: NotificationService, useValue: notificationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspacesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('OnInit_Should_SetUserInitialFromCurrentUsername', () => {
    component.state$.subscribe((state) => {
      expect(state.userInitial).toBe('J');
    });
  });

  it('Render_Should_DisplayAllMemberWorkspaces', () => {
    const cards = fixture.nativeElement.querySelectorAll('.workspace-card');
    expect(cards.length).toBe(testWorkspaces.length);

    const firstCardTitle = fixture.nativeElement.querySelector('.workspace-card-title');
    expect(firstCardTitle.textContent).toContain(testWorkspaces[0].name);
  });

  it('OnSelectWorkspace_Should_SetSelectedWorkspaceAndNavigateToDashboard', () => {
    const targetWs = testWorkspaces[1];
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

  it('CreateWorkspace_Should_CallServiceAndNavigate_When_FormIsValid', () => {
    const newWs: Workspace = {
      id: 'ws-new',
      name: 'New Platform',
      code: 'NEWP',
      description: 'Platform workspace for testing',
      role: 'Owner',
      memberCount: 1,
      taskCount: 0,
      color: '#0078D4',
    };
    workspaceServiceSpy.createWorkspace.and.returnValue(newWs);

    component['openCreateModal']();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.azure-modal')).toBeTruthy();

    component['createForm'].patchValue({
      name: 'New Platform',
      code: 'NEWP',
      description: 'Platform workspace for testing',
      role: 'Owner',
      color: '#0078D4',
    });

    component['submitCreateWorkspace']();

    expect(workspaceServiceSpy.createWorkspace).toHaveBeenCalled();
    expect(notificationServiceSpy.success).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
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

  it('EmptyWorkspace_Should_Display_When_WorkspacesResponseIs404', () => {
    (component as unknown as { isNotFound$: unknown }).isNotFound$ = of(true);
    fixture.detectChanges();

    const emptyContainer = fixture.nativeElement.querySelector('app-empty-workspace');
    expect(emptyContainer).toBeTruthy();

    const btn = fixture.nativeElement.querySelector('#btn-create-first-workspace');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Create First Workspace');
  });

  it('CreateFirstWorkspace_Should_OpenCreateModal_When_EmptyWorkspaceButtonClicked', () => {
    (component as unknown as { isNotFound$: unknown }).isNotFound$ = of(true);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('#btn-create-first-workspace');
    expect(btn).toBeTruthy();

    btn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.azure-modal')).toBeTruthy();
  });
});
