import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { apiInterceptor } from '../core/http/api.interceptor';
import { authInterceptor } from '../core/auth/auth.interceptor';
import { BASE_PATH } from '../generated/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // authInterceptor attaches Bearer token to all requests except /auth/login (AC-7).
    // apiInterceptor handles base URL rewriting (from LLD-01).
    provideHttpClient(withInterceptors([authInterceptor, apiInterceptor])),
    // Override the generated client's default basePath ('http://localhost:8080') so
    // all API calls use relative URLs and are routed through the Angular dev-server
    // proxy (proxy.conf.*.json). Without this, the browser hits the API directly
    // and Spring rejects the cross-origin preflight with 403.
    { provide: BASE_PATH, useValue: '' },
  ],
};
