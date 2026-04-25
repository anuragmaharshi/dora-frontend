import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * ForbiddenComponent — displayed when a user hits a route they do not
 * have the required role to access (HTTP 403 equivalent in the SPA).
 */
@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="forbidden-page" aria-labelledby="forbidden-heading">
      <h1 id="forbidden-heading">Access denied</h1>
      <p>You do not have permission to view this page.</p>
      <a routerLink="/" aria-label="Go to home page">Go home</a>
    </main>
  `,
  styles: [
    `
      .forbidden-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        gap: 1rem;
        font-family: sans-serif;
        text-align: center;
        padding: 1rem;
      }

      h1 {
        font-size: 2rem;
        color: #b00020;
        margin: 0;
      }

      p {
        color: #555;
        margin: 0;
      }

      a {
        color: #1976d2;
        text-decoration: underline;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenComponent {}
