import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
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
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { UserProfile } from '../../core/models/user.models';
import { AutoTrimDirective } from '../../shared/directives/auto-trim.directive';
import { trimFormGroup } from '../../shared/utils/form.utils';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AutoTrimDirective],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  protected readonly loading = signal(true);
  protected readonly savingProfile = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly confirmingEmail = signal(false);

  protected readonly profileSuccessMessage = signal<string | null>(null);
  protected readonly profileErrorMessage = signal<string | null>(null);

  protected readonly passwordSuccessMessage = signal<string | null>(null);
  protected readonly passwordErrorMessage = signal<string | null>(null);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly routeUserId = signal<string | null>(null);

  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmNewPassword = signal(false);

  protected readonly expandedSections = signal<Record<string, boolean>>({
    personal: false,
    security: false,
    metadata: false,
  });

  protected readonly profileForm: FormGroup;
  protected readonly passwordForm: FormGroup;

  protected isSectionExpanded(section: string): boolean {
    return !!this.expandedSections()[section];
  }

  protected toggleSection(section: string): void {
    this.expandedSections.update((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  protected expandSection(section: string): void {
    this.expandedSections.update((prev) => ({
      ...prev,
      [section]: true,
    }));
  }

  protected readonly currentSessionUserId = computed(() => {
    const tokenUid = this.authService.currentUserId();
    if (tokenUid) return tokenUid;
    const tokenUser = this.authService.currentUser();
    if (!tokenUser) return '';
    return (
      tokenUser.sub ||
      (tokenUser['nameid'] as string) ||
      (tokenUser['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] as string) ||
      ''
    );
  });

  protected readonly targetUserId = computed(() => {
    return this.routeUserId() || this.currentSessionUserId();
  });

  protected readonly isOwnProfile = computed(() => {
    const target = this.targetUserId();
    const self = this.currentSessionUserId();
    return !target || target === self;
  });

  protected readonly userInitial = computed(() => {
    const prof = this.profile();
    if (prof) {
      const name = prof.fullName || prof.userName || prof.email;
      return name.trim().charAt(0).toUpperCase() || '?';
    }
    const tokenUser = this.authService.currentUser();
    if (tokenUser && this.isOwnProfile()) {
      const name = tokenUser.unique_name || tokenUser.email || '';
      return name.trim().charAt(0).toUpperCase() || '?';
    }
    return '?';
  });

  protected readonly userId = computed(() => {
    const current = this.profile();
    if (current?.id) return current.id;
    return this.targetUserId();
  });

  protected readonly userRoles = computed(() => {
    const prof = this.profile();
    if (prof?.roles?.length) {
      return prof.roles;
    }
    if (this.isOwnProfile()) {
      const roleClaim = this.authService.currentUser()?.role;
      if (Array.isArray(roleClaim)) return roleClaim;
      if (typeof roleClaim === 'string' && roleClaim) return [roleClaim];
    }
    return ['User'];
  });

  protected readonly tokenIssuedAt = computed(() => {
    const iat = this.authService.currentUser()?.iat;
    return iat ? new Date(iat * 1000).toLocaleString() : 'N/A';
  });

  protected readonly tokenExpiresAt = computed(() => {
    const exp = this.authService.currentUser()?.exp;
    return exp ? new Date(exp * 1000).toLocaleString() : 'N/A';
  });

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
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.routeUserId.set(id);
      this.loadProfile();
    });
  }

  protected loadProfile(): void {
    const uid = this.targetUserId();
    if (!uid) {
      this.loading.set(false);
      this.profileErrorMessage.set('No user ID found in session. Please sign in again.');
      return;
    }

    this.loading.set(true);
    this.profileErrorMessage.set(null);
    this.userService.getProfile(uid).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.profileForm.patchValue({
          email: data.email,
          userName: data.userName,
          fullName: data.fullName ?? '',
        });
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 403) {
          this.profileErrorMessage.set(
            err.error?.detail ??
              err.error?.message ??
              'Access denied: You do not have permission to view this user profile.',
          );
        } else if (err.status === 404) {
          this.profileErrorMessage.set('User profile not found.');
        } else {
          this.profileErrorMessage.set(
            err.error?.detail ??
              err.error?.message ??
              `Failed to load profile (status ${err.status || 'network error'}).`,
          );
        }
      },
    });
  }

  protected onConfirmEmailMock(): void {
    if (this.confirmingEmail()) return;
    this.confirmingEmail.set(true);
    this.profileErrorMessage.set(null);
    this.profileSuccessMessage.set(null);

    setTimeout(() => {
      this.confirmingEmail.set(false);
      this.profile.update((prev) => (prev ? { ...prev, emailConfirmed: true } : prev));
      this.profileSuccessMessage.set('Email confirmed successfully! (Mocked)');
      this.notificationService.success('Email confirmed successfully! (Mocked)');
      this.expandSection('personal');
    }, 700);
  }

  protected onSaveProfile(): void {
    this.profileSuccessMessage.set(null);
    this.profileErrorMessage.set(null);

    trimFormGroup(this.profileForm);

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.expandSection('personal');
      return;
    }

    const uid = this.userId();
    if (!uid) return;

    this.savingProfile.set(true);
    const { userName, fullName } = this.profileForm.getRawValue();
    const cleanUserName = typeof userName === 'string' ? userName.trim() : userName;
    const cleanFullName = typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null;

    this.userService.updateProfile(uid, { userName: cleanUserName, fullName: cleanFullName }).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.profileSuccessMessage.set('Profile updated successfully.');
        this.notificationService.success('Profile updated successfully.');
        this.expandSection('personal');
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, userName: cleanUserName, fullName: cleanFullName });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.savingProfile.set(false);
        this.profileErrorMessage.set(
          err.error?.message ?? 'Failed to update profile. Please try again.',
        );
        this.expandSection('personal');
      },
    });
  }

  protected onChangePassword(): void {
    this.passwordSuccessMessage.set(null);
    this.passwordErrorMessage.set(null);

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.expandSection('security');
      return;
    }

    const uid = this.userId();
    if (!uid) return;

    this.changingPassword.set(true);
    const { currentPassword, newPassword } = this.passwordForm.value;

    this.userService.changePassword(uid, { currentPassword, newPassword }).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordSuccessMessage.set('Password changed successfully.');
        this.notificationService.success('Password changed successfully.');
        this.expandSection('security');
        this.passwordForm.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.changingPassword.set(false);
        this.passwordErrorMessage.set(
          err.error?.message ?? 'Failed to change password. Verify your current password.',
        );
        this.expandSection('security');
      },
    });
  }

  protected onDiscardProfile(): void {
    const prof = this.profile();
    this.profileForm.reset({
      email: prof?.email ?? '',
      userName: prof?.userName ?? '',
      fullName: prof?.fullName ?? '',
    });
    this.profileErrorMessage.set(null);
    this.profileSuccessMessage.set(null);
    this.expandedSections.update((prev) => ({ ...prev, personal: false }));
  }

  protected onDiscardPassword(): void {
    this.passwordForm.reset();
    this.passwordErrorMessage.set(null);
    this.passwordSuccessMessage.set(null);
    this.expandedSections.update((prev) => ({ ...prev, security: false }));
  }

  protected onLogout(): void {
    this.notificationService.info('You have been signed out.');
    this.authService.logout();
  }

  protected toggleCurrentPassword(): void {
    this.showCurrentPassword.update((v) => !v);
  }

  protected toggleNewPassword(): void {
    this.showNewPassword.update((v) => !v);
  }

  protected toggleConfirmNewPassword(): void {
    this.showConfirmNewPassword.update((v) => !v);
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
