import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { apiInterceptor } from '../core/http/api.interceptor';
import { authInterceptor } from '../core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // authInterceptor attaches Bearer token to all requests except /auth/login (AC-7).
    // apiInterceptor handles base URL rewriting (from LLD-01).
    provideHttpClient(withInterceptors([authInterceptor, apiInterceptor])),
  ],
};
