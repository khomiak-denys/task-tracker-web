import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkspaceSelectorComponent } from './workspace-selector';
import { Workspace } from '../../../core/models/workspace.models';

describe('WorkspaceSelectorComponent', () => {
  let component: WorkspaceSelectorComponent;
  let fixture: ComponentFixture<WorkspaceSelectorComponent>;

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
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceSelectorComponent);
    component = fixture.componentInstance;
    component.workspaces = mockWorkspaces;
    component.selectedWorkspace = mockWorkspaces[0];
    fixture.detectChanges();
  });

  it('Create_Should_InitializeComponentSuccessfully', () => {
    expect(component).toBeTruthy();
  });

  it('Render_Should_DisplayActiveWorkspaceNameAndInitial', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nameEl = compiled.querySelector('#selected-workspace-name');
    const badgeEl = compiled.querySelector('.badge-code');

    expect(nameEl?.textContent).toContain('Architecture Lab Core');
    expect(badgeEl?.textContent).toContain('A');
  });

  it('OnSelectWorkspace_Should_EmitWorkspaceChange_When_NewWorkspaceClicked', () => {
    spyOn(component.workspaceChange, 'emit');

    const targetWorkspace = mockWorkspaces[1];
    const pills = fixture.nativeElement.querySelectorAll('.ws-pill-btn');
    expect(pills.length).toBeGreaterThan(1);

    (pills[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.workspaceChange.emit).toHaveBeenCalledWith(targetWorkspace);
  });

  it('ToggleDropdown_Should_OpenAndCloseDropdown_When_TriggerClicked', () => {
    const trigger = fixture.nativeElement.querySelector(
      '#ws-dropdown-trigger',
    ) as HTMLButtonElement;
    expect(trigger).toBeTruthy();

    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#ws-dropdown-menu')).toBeTruthy();

    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#ws-dropdown-menu')).toBeFalsy();
  });

  it('FilterWorkspaces_Should_FilterItems_When_SearchInputProvided', () => {
    const trigger = fixture.nativeElement.querySelector(
      '#ws-dropdown-trigger',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const searchInput = fixture.nativeElement.querySelector('#ws-search-input') as HTMLInputElement;
    searchInput.value = 'frontend';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.filteredWorkspaces.length).toBe(1);
    expect(component.filteredWorkspaces[0].code).toBe('WEB');
  });

  it('OnCreateWorkspace_Should_EmitCreateWorkspaceEvent_When_NewWorkspaceClicked', () => {
    spyOn(component.createWorkspace, 'emit');

    const trigger = fixture.nativeElement.querySelector(
      '#ws-dropdown-trigger',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const createBtn = fixture.nativeElement.querySelector(
      '#btn-create-workspace',
    ) as HTMLButtonElement;
    createBtn.click();

    expect(component.createWorkspace.emit).toHaveBeenCalled();
  });

  it('OnEscapePress_Should_CloseDropdown_When_EscapeKeyPressed', () => {
    const trigger = fixture.nativeElement.querySelector(
      '#ws-dropdown-trigger',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#ws-dropdown-menu')).toBeTruthy();

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#ws-dropdown-menu')).toBeFalsy();
  });
});
