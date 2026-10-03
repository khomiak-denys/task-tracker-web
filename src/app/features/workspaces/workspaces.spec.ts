import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { WorkspacesComponent } from './workspaces';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { MOCK_WORKSPACES, Workspace } from '../../core/models/workspace.models';

describe('WorkspacesComponent', () => {
  let component: WorkspacesComponent;
  let fixture: ComponentFixture<WorkspacesComponent>;
  let workspaceServiceSpy: jasmine.SpyObj<WorkspaceService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    workspaceServiceSpy = jasmine.createSpyObj<WorkspaceService>(
      'WorkspaceService',
      ['selectWorkspace', 'createWorkspace'],
      {
        memberWorkspaces$: of(MOCK_WORKSPACES),
        workspaces$: of(MOCK_WORKSPACES),
        selectedWorkspace$: of(MOCK_WORKSPACES[0]),
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
    expect(cards.length).toBe(MOCK_WORKSPACES.length);

    const firstCardTitle = fixture.nativeElement.querySelector('.workspace-card-title');
    expect(firstCardTitle.textContent).toContain(MOCK_WORKSPACES[0].name);
  });

  it('OnSelectWorkspace_Should_SetSelectedWorkspaceAndNavigateToDashboard', () => {
    const targetWs = MOCK_WORKSPACES[1];
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
});
