import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * Extracts individual error messages from various API error formats,
 * including ASP.NET Core ValidationProblemDetails (RFC 7807/9457)
 * and ASP.NET Core IdentityError collections.
 */
function extractValidationErrors(errors: unknown): string[] {
  if (!errors) return [];

  const results: string[] = [];

  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed) results.push(trimmed);
      } else if (item && typeof item === 'object') {
        const candidate =
          (item as Record<string, unknown>)['description'] ??
          (item as Record<string, unknown>)['message'] ??
          (item as Record<string, unknown>)['errorMessage'];
        if (typeof candidate === 'string' && candidate.trim()) {
          results.push(candidate.trim());
        }
      }
    }
    return results;
  }

  if (typeof errors === 'object') {
    for (const key of Object.keys(errors as Record<string, unknown>)) {
      const val = (errors as Record<string, unknown>)[key];
      if (Array.isArray(val)) {
        for (const msg of val) {
          if (typeof msg === 'string') {
            const trimmed = msg.trim();
            if (trimmed) results.push(trimmed);
          } else if (msg && typeof msg === 'object') {
            const candidate =
              (msg as Record<string, unknown>)['description'] ??
              (msg as Record<string, unknown>)['message'] ??
              (msg as Record<string, unknown>)['errorMessage'];
            if (typeof candidate === 'string' && candidate.trim()) {
              results.push(candidate.trim());
            }
          }
        }
      } else if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed) results.push(trimmed);
      }
    }
  }

  return results;
}

/**
 * Functional HTTP interceptor that normalizes error responses
 * and displays toast notifications for unexpected network and API errors.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Avoid duplicate or intrusive toasts for silent background token refresh
      const isSilentRefresh = req.url.includes('/api/v1/auth/refresh');

      const errPayload = error.error;
      const isProblemDetails = errPayload && typeof errPayload === 'object';

      // 1. Check for Validation errors in the `errors` field (e.g., 400 Bad Request)
      const validationErrors = isProblemDetails ? extractValidationErrors(errPayload.errors) : [];

      let primaryMessage = 'An unexpected error occurred';

      if (error.status === 0) {
        primaryMessage = 'Unable to connect to the server. Check your network connection.';
      } else if (validationErrors.length > 0) {
        primaryMessage = validationErrors[0];
      } else if (isProblemDetails) {
        // Prioritize `detail` field (standard for 401 Unauthorized and ProblemDetails)
        primaryMessage =
          errPayload.detail ||
          errPayload.message ||
          errPayload.title ||
          (error.status === 401 ? 'Invalid email or password' : error.message);
      } else if (typeof errPayload === 'string' && errPayload.trim()) {
        primaryMessage = errPayload.trim();
      } else {
        primaryMessage = error.message;
      }

      if (!isSilentRefresh) {
        if (validationErrors.length > 0) {
          // If multiple errors, trigger a separate popup for each error message
          for (const validationMsg of validationErrors) {
            notificationService.error(validationMsg);
          }
        } else {
          notificationService.error(primaryMessage);
        }
      }

      const normalizedError = new HttpErrorResponse({
        error: isProblemDetails
          ? { ...errPayload, message: primaryMessage }
          : { message: primaryMessage, originalError: errPayload },
        headers: error.headers,
        status: error.status,
        statusText: error.statusText,
        url: error.url ?? undefined,
      });

      return throwError(() => normalizedError);
    }),
  );
};
