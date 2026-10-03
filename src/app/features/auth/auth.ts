import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { AutoTrimDirective } from '../../shared/directives/auto-trim.directive';
import { trimFormGroup } from '../../shared/utils/form.utils';

export type AuthMode = 'login' | 'register';

export interface AuthState {
  readonly mode: AuthMode;
  readonly loading: boolean;
  readonly showPassword: boolean;
  readonly showConfirmPassword: boolean;
}

const initialState: AuthState = {
  mode: 'login',
  loading: false,
  showPassword: false,
  showConfirmPassword: false,
};

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AutoTrimDirective],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
  private readonly stateSubject = new BehaviorSubject<AuthState>(initialState);
  readonly state$: Observable<AuthState> = this.stateSubject.asObservable();

  readonly mode$: Observable<AuthMode> = this.state$.pipe(
    map((state) => state.mode),
    distinctUntilChanged(),
  );

  readonly loading$: Observable<boolean> = this.state$.pipe(
    map((state) => state.loading),
    distinctUntilChanged(),
  );

  readonly showPassword$: Observable<boolean> = this.state$.pipe(
    map((state) => state.showPassword),
    distinctUntilChanged(),
  );

  readonly showConfirmPassword$: Observable<boolean> = this.state$.pipe(
    map((state) => state.showConfirmPassword),
    distinctUntilChanged(),
  );

  get snapshot(): AuthState {
    return this.stateSubject.value;
  }

  protected readonly loginForm: FormGroup;
  protected readonly registerForm: FormGroup;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly notificationService: NotificationService,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        userName: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
  }

  protected switchMode(newMode: AuthMode): void {
    this.updateState({ mode: newMode });
  }

  protected togglePasswordVisibility(): void {
    this.updateState({ showPassword: !this.stateSubject.value.showPassword });
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.updateState({ showConfirmPassword: !this.stateSubject.value.showConfirmPassword });
  }

  protected onSubmit(): void {
    if (this.stateSubject.value.mode === 'login') {
      trimFormGroup(this.loginForm);
      this.handleLogin();
    } else {
      trimFormGroup(this.registerForm);
      this.handleRegister();
    }
  }

  private handleLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.updateState({ loading: true });
    const rawEmail = this.loginForm.value.email;
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail;
    const password = this.loginForm.value.password;

    this.authService
      .login({ email, password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.updateState({ loading: false });
          this.notificationService.success('Welcome back! You have successfully signed in.');
          if (this.authService.isAdmin()) {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/workspaces']);
          }
        },
        error: () => {
          this.updateState({ loading: false });
          // Highlight fields with red border and cleanup data in that fields
          this.loginForm.reset({ email: '', password: '' });
          this.loginForm.get('email')?.setErrors({ serverError: true });
          this.loginForm.get('email')?.markAsTouched();
          this.loginForm.get('password')?.setErrors({ serverError: true });
          this.loginForm.get('password')?.markAsTouched();
        },
      });
  }

  private handleRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.updateState({ loading: true });
    const rawEmail = this.registerForm.value.email;
    const rawUserName = this.registerForm.value.userName;
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail;
    const userName = typeof rawUserName === 'string' ? rawUserName.trim() : rawUserName;
    const password = this.registerForm.value.password;

    this.authService
      .register({ email, userName, password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.updateState({ loading: false });
          this.notificationService.success('Account created successfully! Welcome aboard.');
          if (this.authService.isAdmin()) {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/workspaces']);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.updateState({ loading: false });
          const errPayload = err?.error;
          let matchedField = false;

          if (errPayload && typeof errPayload === 'object' && errPayload.errors) {
            const errorsObj = errPayload.errors as Record<string, unknown>;
            for (const key of Object.keys(errorsObj)) {
              const lower = key.toLowerCase();
              if (lower.includes('username')) {
                const ctrl = this.registerForm.get('userName');
                ctrl?.setValue('');
                ctrl?.setErrors({ serverError: true });
                ctrl?.markAsTouched();
                matchedField = true;
              }
              if (lower.includes('email')) {
                const ctrl = this.registerForm.get('email');
                ctrl?.setValue('');
                ctrl?.setErrors({ serverError: true });
                ctrl?.markAsTouched();
                matchedField = true;
              }
              if (lower.includes('password')) {
                ['password', 'confirmPassword'].forEach((f) => {
                  const ctrl = this.registerForm.get(f);
                  ctrl?.setValue('');
                  ctrl?.setErrors({ serverError: true });
                  ctrl?.markAsTouched();
                });
                matchedField = true;
              }
            }
          }

          if (!matchedField) {
            ['email', 'userName', 'password', 'confirmPassword'].forEach((f) => {
              const ctrl = this.registerForm.get(f);
              ctrl?.setValue('');
              ctrl?.setErrors({ serverError: true });
              ctrl?.markAsTouched();
            });
          }
        },
      });
  }

  private updateState(partialState: Partial<AuthState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partialState,
    });
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }
}
