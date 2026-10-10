import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { BehaviorSubject, Observable, catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import {
  Workspace,
  WORKSPACE_COLOR_PALETTE,
  generateWorkspaceCode,
} from '../../core/models/workspace.models';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

export interface WorkspacesState {
  readonly searchQuery: string;
  readonly isCreateModalOpen: boolean;
  readonly loading: boolean;
  readonly submitting: boolean;
  readonly dropdownOpen: boolean;
  readonly userInitial: string;
}

const initialState: WorkspacesState = {
  searchQuery: '',
  isCreateModalOpen: false,
  loading: true,
  submitting: false,
  dropdownOpen: false,
  userInitial: 'U',
};

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SkeletonComponent],
  templateUrl: './workspaces.html',
  styleUrl: './workspaces.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspacesComponent implements OnInit {
  protected readonly workspaceService = inject(WorkspaceService);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stateSubject = new BehaviorSubject<WorkspacesState>(initialState);
  readonly state$: Observable<WorkspacesState> = this.stateSubject.asObservable();

  readonly filteredWorkspaces$: Observable<Workspace[]> = combineLatest([
    this.workspaceService.workspaces$,
    this.state$.pipe(map((s) => s.searchQuery.trim().toLowerCase())),
  ]).pipe(
    map(([workspaces, query]) => {
      if (!query) return workspaces;
      return workspaces.filter(
        (w) =>
          w.name.toLowerCase().includes(query) ||
          w.code.toLowerCase().includes(query) ||
          w.description.toLowerCase().includes(query) ||
          w.role.toLowerCase().includes(query),
      );
    }),
  );

  protected readonly createForm: FormGroup;
  protected readonly colorOptions = WORKSPACE_COLOR_PALETTE;

  constructor() {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.minLength(3)]],
      code: [''],
      role: ['Owner'],
      color: [WORKSPACE_COLOR_PALETTE[0]],
    });
  }

  ngOnInit(): void {
    this.updateState({ userInitial: this.calculateUserInitial() });
    this.refreshWorkspaces();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const userMenuContainer = this.elementRef.nativeElement.querySelector('.user-menu-container');

    if (
      this.stateSubject.value.dropdownOpen &&
      userMenuContainer &&
      !userMenuContainer.contains(target)
    ) {
      this.updateState({ dropdownOpen: false });
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.stateSubject.value.isCreateModalOpen) {
      this.closeCreateModal();
    } else {
      this.updateState({ dropdownOpen: false });
    }
  }

  protected refreshWorkspaces(): void {
    this.updateState({ loading: true });
    this.workspaceService
      .loadWorkspaces()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.updateState({ loading: false });
      });
  }

  protected updateSearch(query: string): void {
    this.updateState({ searchQuery: query });
  }

  protected toggleDropdown(): void {
    this.updateState({ dropdownOpen: !this.stateSubject.value.dropdownOpen });
  }

  // ==========================================
  // CREATE WORKSPACE
  // ==========================================
  protected openCreateModal(): void {
    this.createForm.reset({
      name: '',
      description: '',
      code: '',
      role: 'Owner',
      color: WORKSPACE_COLOR_PALETTE[0],
    });
    this.updateState({ isCreateModalOpen: true });
  }

  protected closeCreateModal(): void {
    this.updateState({ isCreateModalOpen: false, submitting: false });
  }

  protected submitCreateWorkspace(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const formVal = this.createForm.value;
    const name = formVal.name.trim();
    const description = formVal.description?.trim() || null;
    const code = formVal.code?.trim().toUpperCase() || generateWorkspaceCode(name);

    this.updateState({ submitting: true });

    this.workspaceService
      .create({ name, description })
      .pipe(
        catchError((err) => {
          // If error 403, notify Manager role is required
          const status = err?.status;
          if (status === 403) {
            this.notificationService.error(
              'Permission denied: Only users with the Manager role can create workspaces. Assign Manager role in Admin Console.',
            );
          } else {
            this.notificationService.error(
              err?.error?.detail || err?.error?.title || 'Failed to create workspace.',
            );
          }
          this.updateState({ submitting: false });
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((createdId) => {
        this.updateState({ submitting: false });
        if (createdId) {
          this.closeCreateModal();
          this.notificationService.success(`Workspace "${name}" created successfully!`);
          this.workspaceService
            .loadWorkspaces()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((workspaces) => {
              const matched = workspaces.find((w) => w.id === createdId);
              if (matched) {
                this.onSelectWorkspace(matched);
              }
            });
        }
      });
  }

  // ==========================================
  // SELECTION & DEFAULT
  // ==========================================
  protected onSelectWorkspace(workspace: Workspace): void {
    this.workspaceService.selectWorkspace(workspace);
    this.notificationService.info(`Switched to workspace: ${workspace.name}`);
    this.router.navigate(['/']);
  }

  protected onSetDefault(workspace: Workspace, event?: Event): void {
    event?.stopPropagation();
    this.workspaceService.setDefaultWorkspace(workspace.id);
    this.notificationService.success(`"${workspace.name}" set as your default workspace.`);
  }

  protected isCurrentActive(workspace: Workspace): boolean {
    return this.workspaceService.currentWorkspace?.id === workspace.id;
  }

  // ==========================================
  // NAVIGATION & PROFILE
  // ==========================================
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

  protected getWorkspaceInitial(name: string | null | undefined): string {
    if (!name) return 'W';
    const trimmed = name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'W';
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
