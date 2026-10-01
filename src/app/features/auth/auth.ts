import { Component, signal } from '@angular/core';
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
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { AutoTrimDirective } from '../../shared/directives/auto-trim.directive';
import { trimFormGroup } from '../../shared/utils/form.utils';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AutoTrimDirective],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class AuthComponent {
  protected readonly mode = signal<AuthMode>('login');
  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  protected readonly loginForm: FormGroup;
  protected readonly registerForm: FormGroup;

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
    this.mode.set(newMode);
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  protected onSubmit(): void {
    if (this.mode() === 'login') {
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

    this.loading.set(true);
    const rawEmail = this.loginForm.value.email;
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail;
    const password = this.loginForm.value.password;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.notificationService.success('Welcome back! You have successfully signed in.');
        this.router.navigate(['/']);
      },
      error: () => {
        this.loading.set(false);
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

    this.loading.set(true);
    const rawEmail = this.registerForm.value.email;
    const rawUserName = this.registerForm.value.userName;
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail;
    const userName = typeof rawUserName === 'string' ? rawUserName.trim() : rawUserName;
    const password = this.registerForm.value.password;

    this.authService.register({ email, userName, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.notificationService.success('Account created successfully! Welcome aboard.');
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
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

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }
}
