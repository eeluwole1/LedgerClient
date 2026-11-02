import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { ToastService } from '../services/toast';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const token = authService.getToken();

  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // A 401 from the Auth endpoints just means wrong credentials, so only treat it as an
      // expired session on other calls. Checking the token again means several in-flight
      // requests that all fail with 401 log the user out (and show the toast) only once.
      const isAuthCall = request.url.includes('/Auth/');
      if (error.status === 401 && !isAuthCall && authService.getToken()) {
        authService.logout();
        toastService.info('Your session has expired. Please sign in again.');
      }
      return throwError(() => error);
    }),
  );
};
