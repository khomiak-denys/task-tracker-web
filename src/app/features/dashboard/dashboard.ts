import { ChangeDetectionStrategy, Component, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

export interface DashboardState {
  readonly dropdownOpen: boolean;
  readonly userInitial: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly stateSubject = new BehaviorSubject<DashboardState>({
    dropdownOpen: false,
    userInitial: this.calculateUserInitial(),
  });

  readonly state$: Observable<DashboardState> = this.stateSubject.asObservable();

  readonly dropdownOpen$: Observable<boolean> = this.state$.pipe(
    map((s) => s.dropdownOpen),
    distinctUntilChanged(),
  );

  readonly userInitial$: Observable<string> = this.state$.pipe(
    map((s) => s.userInitial),
    distinctUntilChanged(),
  );

  get snapshot(): DashboardState {
    return this.stateSubject.value;
  }

  constructor(
    protected readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly elementRef: ElementRef,
    private readonly router: Router,
  ) {
    this.updateState({ userInitial: this.calculateUserInitial() });
  }

  protected toggleDropdown(): void {
    this.updateState({ dropdownOpen: !this.stateSubject.value.dropdownOpen });
  }

  protected closeDropdown(): void {
    this.updateState({ dropdownOpen: false });
  }

  protected onProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/profile']);
  }

  protected onLogout(): void {
    this.closeDropdown();
    this.notificationService.info('You have been signed out.');
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.stateSubject.value.dropdownOpen) return;
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.querySelector('.user-menu-container')?.contains(target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeDropdown();
  }

  private calculateUserInitial(): string {
    const user = typeof this.authService?.currentUser === 'function'
      ? this.authService.currentUser()
      : null;
    if (!user) return '?';
    const name =
      user.unique_name ||
      user['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      user.name ||
      user.email ||
      '';
    const trimmed = typeof name === 'string' ? name.trim() : '';
    return trimmed.charAt(0).toUpperCase() || '?';
  }

  private updateState(partial: Partial<DashboardState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial,
    });
  }
}