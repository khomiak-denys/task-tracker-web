import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Route guard that only permits users with the 'Admin' role.
 * Redirects non-admins to the dashboard with an error notification.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  notificationService.error('Access denied. Administrator privileges are required.');
  return router.createUrlTree(['/']);
};
