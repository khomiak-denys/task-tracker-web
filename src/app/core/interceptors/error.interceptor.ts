import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Functional HTTP interceptor that normalizes error responses
 * into a consistent shape for downstream consumers.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.status === 0) {
        message = 'Unable to connect to the server. Check your network connection.';
      } else if (error.error && typeof error.error === 'object') {
        message =
          error.error['detail'] ??
          error.error['title'] ??
          error.error['message'] ??
          error.message;
      } else if (typeof error.error === 'string') {
        message = error.error;
      } else {
        message = error.message;
      }

      const normalizedError = new HttpErrorResponse({
        error: { message, status: error.status, originalError: error.error },
        headers: error.headers,
        status: error.status,
        statusText: error.statusText,
        url: error.url ?? undefined,
      });

      return throwError(() => normalizedError);
    }),
  );
};
