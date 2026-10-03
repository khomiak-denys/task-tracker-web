import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { UserProfile } from '../../core/models/user.models';
import { AutoTrimDirective } from '../../shared/directives/auto-trim.directive';
import { trimFormGroup } from '../../shared/utils/form.utils';

export interface ProfileState {
  readonly loading: boolean;
  readonly savingProfile: boolean;
  readonly changingPassword: boolean;
  readonly confirmingEmail: boolean;
  readonly profileSuccessMessage: string | null;
  readonly profileErrorMessage: string | null;
  readonly passwordSuccessMessage: string | null;
  readonly passwordErrorMessage: string | null;
  readonly profile: UserProfile | null;
  readonly routeUserId: string | null;
  readonly showCurrentPassword: boolean;
  readonly showNewPassword: boolean;
  readonly showConfirmNewPassword: boolean;
  readonly expandedSections: Record<string, boolean>;
}

export interface ProfileViewState extends ProfileState {
  readonly currentSessionUserId: string;
  readonly targetUserId: string;
  readonly isOwnProfile: boolean;
  readonly userInitial: string;
  readonly userId: string;
  readonly userRoles: string[];
  readonly lockoutEndFormatted: string;
}

const initialProfileState: ProfileState = {
  loading: true,
  savingProfile: false,
  changingPassword: false,
  confirmingEmail: false,
  profileSuccessMessage: null,
  profileErrorMessage: null,
  passwordSuccessMessage: null,
  passwordErrorMessage: null,
  profile: null,
  routeUserId: null,
  showCurrentPassword: false,
  showNewPassword: false,
  showConfirmNewPassword: false,
  expandedSections: {
    personal: false,
    security: false,
    metadata: false,
  },
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AutoTrimDirective],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  @Input() set userId(value: string | undefined | null) {
    if (value !== undefined) {
      this.updateState({ routeUserId: value });
      this.loadProfile();
    }
  }

  @Input() embedded = false;

  @Output() readonly profileUpdated = new EventEmitter<UserProfile>();
  @Output() readonly closeRequested = new EventEmitter<void>();

  private readonly stateSubject = new BehaviorSubject<ProfileState>(initialProfileState);
  readonly state$: Observable<ProfileState> = this.stateSubject.asObservable();
  readonly vm$: Observable<ProfileViewState> = this.state$.pipe(
    map((state) => this.computeViewState(state)),
  );

  get snapshot(): ProfileViewState {
    return this.computeViewState(this.stateSubject.value);
  }

  protected readonly profileForm: FormGroup;
  protected readonly passwordForm: FormGroup;

  private readonly destroyRef = inject(DestroyRef);


  constructor(
    protected readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly notificationService: NotificationService,
  ) {
    this.profileForm = this.fb.group({
      email: [{ value: '', disabled: true }],
      userName: ['', [Validators.required, Validators.minLength(3)]],
      fullName: [''],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmNewPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
  }

  ngOnInit(): void {
    if (!this.embedded) {
      this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
        const id = params.get('id');
        this.updateState({ routeUserId: id });
        this.loadProfile();
      });
    } else if (this.stateSubject.value.routeUserId) {
      this.loadProfile();
    }
  }

  protected isSectionExpanded(section: string): boolean {
    return !!this.stateSubject.value.expandedSections[section];
  }

  protected toggleSection(section: string): void {
    const prev = this.stateSubject.value.expandedSections;
    this.updateState({
      expandedSections: {
        ...prev,
        [section]: !prev[section],
      },
    });
  }

  protected expandSection(section: string): void {
    const prev = this.stateSubject.value.expandedSections;
    this.updateState({
      expandedSections: {
        ...prev,
        [section]: true,
      },
    });
  }

  protected loadProfile(): void {
    const uid = this.snapshot.targetUserId;
    if (!uid) {
      this.updateState({
        loading: false,
        profileErrorMessage: 'No user ID found in session. Please sign in again.',
      });
      return;
    }

    this.updateState({ loading: true, profileErrorMessage: null });
    this.userService
      .getProfile(uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.updateState({
            profile: data,
            loading: false,
          });
          this.profileForm.patchValue({
            email: data.email,
            userName: data.userName,
            fullName: data.fullName ?? '',
          });
        },
        error: (err: HttpErrorResponse) => {
          let errorMsg = `Failed to load profile (status ${err.status || 'network error'}).`;
          if (err.status === 403) {
            errorMsg =
              err.error?.detail ??
              err.error?.message ??
              'Access denied: You do not have permission to view this user profile.';
          } else if (err.status === 404) {
            errorMsg = 'User profile not found.';
          } else if (err.error?.detail || err.error?.message) {
            errorMsg = err.error?.detail ?? err.error?.message;
          }
          this.updateState({
            loading: false,
            profileErrorMessage: errorMsg,
          });
        },
      });
  }

  protected onConfirmEmailMock(): void {
    if (this.stateSubject.value.confirmingEmail) return;
    this.updateState({
      confirmingEmail: true,
      profileErrorMessage: null,
      profileSuccessMessage: null,
    });

    setTimeout(() => {
      const current = this.stateSubject.value.profile;
      this.updateState({
        confirmingEmail: false,
        profile: current ? { ...current, emailConfirmed: true } : current,
        profileSuccessMessage: 'Email confirmed successfully! (Mocked)',
      });
      this.notificationService.success('Email confirmed successfully! (Mocked)');
      this.expandSection('personal');
    }, 700);
  }

  protected onSaveProfile(): void {
    this.updateState({
      profileSuccessMessage: null,
      profileErrorMessage: null,
    });

    trimFormGroup(this.profileForm);

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.expandSection('personal');
      return;
    }

    const uid = this.snapshot.userId;
    if (!uid) return;

    const { userName, fullName } = this.profileForm.getRawValue();
    const cleanUserName = typeof userName === 'string' ? userName.trim() : userName;
    const cleanFullName = typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null;

    const current = this.stateSubject.value.profile;
    const currentUserName = current?.userName?.trim() ?? '';
    const currentFullName = current?.fullName?.trim() ? current.fullName.trim() : null;

    if (cleanUserName === currentUserName && cleanFullName === currentFullName) {
      this.notificationService.info('No changes were made.');
      return;
    }

    this.updateState({ savingProfile: true });

    this.userService
      .updateProfile(uid, { userName: cleanUserName, fullName: cleanFullName })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const current = this.stateSubject.value.profile;
          const updated = current ? { ...current, userName: cleanUserName, fullName: cleanFullName } : null;
          this.updateState({
            savingProfile: false,
            profileSuccessMessage: 'Profile updated successfully.',
            profile: updated,
          });
          this.notificationService.success('Profile updated successfully.');
          this.expandSection('personal');
          if (updated) {
            this.profileUpdated.emit(updated);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.updateState({
            savingProfile: false,
            profileErrorMessage:
              err.error?.message ?? 'Failed to update profile. Please try again.',
          });
          this.expandSection('personal');
        },
      });
  }

  protected onChangePassword(): void {
    this.updateState({
      passwordSuccessMessage: null,
      passwordErrorMessage: null,
    });

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.expandSection('security');
      return;
    }

    const uid = this.snapshot.userId;
    if (!uid) return;

    this.updateState({ changingPassword: true });
    const { currentPassword, newPassword } = this.passwordForm.value;

    this.userService
      .changePassword(uid, { currentPassword, newPassword })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.updateState({
            changingPassword: false,
            passwordSuccessMessage: 'Password changed successfully.',
          });
          this.notificationService.success('Password changed successfully.');
          this.expandSection('security');
          this.passwordForm.reset();
        },
        error: (err: HttpErrorResponse) => {
          this.updateState({
            changingPassword: false,
            passwordErrorMessage:
              err.error?.message ?? 'Failed to change password. Verify your current password.',
          });
          this.expandSection('security');
        },
      });
  }

  protected onDiscardProfile(): void {
    const prof = this.stateSubject.value.profile;
    this.profileForm.reset({
      email: prof?.email ?? '',
      userName: prof?.userName ?? '',
      fullName: prof?.fullName ?? '',
    });
    const prevSections = this.stateSubject.value.expandedSections;
    this.updateState({
      profileErrorMessage: null,
      profileSuccessMessage: null,
      expandedSections: { ...prevSections, personal: false },
    });
  }

  protected onDiscardPassword(): void {
    this.passwordForm.reset();
    const prevSections = this.stateSubject.value.expandedSections;
    this.updateState({
      passwordErrorMessage: null,
      passwordSuccessMessage: null,
      expandedSections: { ...prevSections, security: false },
    });
  }

  protected onLogout(): void {
    this.notificationService.info('You have been signed out.');
    this.authService.logout();
  }

  protected toggleCurrentPassword(): void {
    this.updateState({ showCurrentPassword: !this.stateSubject.value.showCurrentPassword });
  }

  protected toggleNewPassword(): void {
    this.updateState({ showNewPassword: !this.stateSubject.value.showNewPassword });
  }

  protected toggleConfirmNewPassword(): void {
    this.updateState({ showConfirmNewPassword: !this.stateSubject.value.showConfirmNewPassword });
  }

  private computeViewState(state: ProfileState): ProfileViewState {
    const tokenUser =
      typeof this.authService?.currentUser === 'function' ? this.authService.currentUser() : null;
    const tokenUid =
      typeof this.authService?.currentUserId === 'function' ? this.authService.currentUserId() : null;

    const currentSessionUserId =
      tokenUid ||
      tokenUser?.sub ||
      (tokenUser?.['nameid'] as string) ||
      (tokenUser?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] as string) ||
      '';

    const targetUserId = state.routeUserId || currentSessionUserId;
    const isOwnProfile = !targetUserId || targetUserId === currentSessionUserId;

    let userInitial = '?';
    if (state.profile) {
      const name = state.profile.fullName || state.profile.userName || state.profile.email;
      userInitial = name.trim().charAt(0).toUpperCase() || '?';
    } else if (tokenUser && isOwnProfile) {
      const name = tokenUser.unique_name || tokenUser.email || '';
      userInitial = name.trim().charAt(0).toUpperCase() || '?';
    }

    const userId = state.profile?.id || targetUserId;

    let userRoles: string[] = ['User'];
    if (state.profile?.roles?.length) {
      userRoles = state.profile.roles;
    } else if (isOwnProfile && tokenUser) {
      const roleClaim = tokenUser.role;
      if (Array.isArray(roleClaim)) {
        userRoles = roleClaim;
      } else if (typeof roleClaim === 'string' && roleClaim) {
        userRoles = [roleClaim];
      }
    }

    const lockoutEnd = state.profile?.lockoutEnd;
    const lockoutEndFormatted = lockoutEnd
      ? new Date(lockoutEnd).toLocaleString()
      : 'None (Active)';

    return {
      ...state,
      currentSessionUserId,
      targetUserId,
      isOwnProfile,
      userInitial,
      userId,
      userRoles,
      lockoutEndFormatted,
    };
  }

  private updateState(partial: Partial<ProfileState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial,
    });
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmNewPassword = control.get('confirmNewPassword')?.value;

    if (!newPassword || !confirmNewPassword) {
      return null;
    }

    return newPassword === confirmNewPassword ? null : { passwordMismatch: true };
  }
}
