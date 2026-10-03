import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Workspace } from '../../core/models/workspace.models';

export interface WorkspacesState {
  readonly searchQuery: string;
  readonly isCreateModalOpen: boolean;
  readonly dropdownOpen: boolean;
  readonly userInitial: string;
}

const initialState: WorkspacesState = {
  searchQuery: '',
  isCreateModalOpen: false,
  dropdownOpen: false,
  userInitial: 'U',
};

const COLOR_OPTIONS = [
  '#0078D4', // Azure Blue
  '#107C10', // Forest Green
  '#5C2D91', // Purple
  '#D83B01', // Orange
  '#008272', // Teal
  '#E3008C', // Magenta
];

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './workspaces.html',
  styleUrl: './workspaces.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspacesComponent implements OnInit {
  private readonly workspaceService = inject(WorkspaceService);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly elementRef = inject(ElementRef);

  private readonly stateSubject = new BehaviorSubject<WorkspacesState>(initialState);
  readonly state$: Observable<WorkspacesState> = this.stateSubject.asObservable();

  readonly filteredWorkspaces$: Observable<Workspace[]> = combineLatest([
    this.workspaceService.memberWorkspaces$,
    this.state$.pipe(map((s) => s.searchQuery.trim().toLowerCase())),
  ]).pipe(
    map(([workspaces, query]) => {
      if (!query) return workspaces;
      return workspaces.filter(
        (w) =>
          w.name.toLowerCase().includes(query) ||
          w.code.toLowerCase().includes(query) ||
          w.description.toLowerCase().includes(query) ||
          w.role.toLowerCase().includes(query)
      );
    })
  );

  protected readonly createForm: FormGroup;
  protected readonly colorOptions = COLOR_OPTIONS;

  constructor() {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      code: [''],
      role: ['Owner'],
      color: [COLOR_OPTIONS[0]],
    });
  }

  ngOnInit(): void {
    this.updateState({ userInitial: this.calculateUserInitial() });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const userMenuContainer = this.elementRef.nativeElement.querySelector('.user-menu-container');

    if (this.stateSubject.value.dropdownOpen && userMenuContainer && !userMenuContainer.contains(target)) {
      this.updateState({ dropdownOpen: false });
    }
  }

  protected updateSearch(query: string): void {
    this.updateState({ searchQuery: query });
  }

  protected toggleDropdown(): void {
    this.updateState({ dropdownOpen: !this.stateSubject.value.dropdownOpen });
  }

  protected openCreateModal(): void {
    this.createForm.reset({
      name: '',
      description: '',
      code: '',
      role: 'Owner',
      color: COLOR_OPTIONS[0],
    });
    this.updateState({ isCreateModalOpen: true });
  }

  protected closeCreateModal(): void {
    this.updateState({ isCreateModalOpen: false });
  }

  protected submitCreateWorkspace(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const formVal = this.createForm.value;
    const generatedCode =
      formVal.code?.trim().toUpperCase() ||
      formVal.name
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase() ||
      'WS';

    const created = this.workspaceService.createWorkspace({
      name: formVal.name.trim(),
      code: generatedCode,
      description: formVal.description.trim(),
      role: formVal.role || 'Owner',
      color: formVal.color || COLOR_OPTIONS[0],
      memberCount: 1,
      taskCount: 0,
    });

    this.closeCreateModal();
    this.notificationService.success(`Workspace "${created.name}" created successfully!`);
    this.onSelectWorkspace(created);
  }

  protected onSelectWorkspace(workspace: Workspace): void {
    this.workspaceService.selectWorkspace(workspace);
    this.notificationService.info(`Switched to workspace: ${workspace.name}`);
    this.router.navigate(['/']);
  }

  protected onProfile(): void {
    this.updateState({ dropdownOpen: false });
    this.router.navigate(['/profile']);
  }

  protected onAdmin(): void {
    this.updateState({ dropdownOpen: false });
    this.router.navigate(['/admin']);
  }

  protected onLogout(): void {
    this.updateState({ dropdownOpen: false });
    this.authService.logout();
    this.notificationService.info('You have been signed out.');
  }

  private calculateUserInitial(): string {
    const user = this.authService.currentUser();
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.unique_name) return user.unique_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }

  private updateState(partial: Partial<WorkspacesState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...partial });
  }
}
