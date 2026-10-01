import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  protected readonly dropdownOpen = signal(false);

  protected readonly userInitial = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return '?';
    const name =
      user.unique_name ||
      user['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      user.name ||
      user.email ||
      '';
    const trimmed = typeof name === 'string' ? name.trim() : '';
    return trimmed.charAt(0).toUpperCase() || '?';
  });

  constructor(
    protected readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly elementRef: ElementRef,
    private readonly router: Router,
  ) {}

  protected toggleDropdown(): void {
    this.dropdownOpen.update((v) => !v);
  }

  protected closeDropdown(): void {
    this.dropdownOpen.set(false);
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
    if (!this.dropdownOpen()) return;
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.querySelector('.user-menu-container')?.contains(target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeDropdown();
  }
}