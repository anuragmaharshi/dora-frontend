import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * LogoutComponent — stateless route component.
 *
 * Immediately invokes AuthService.logout() on init, which clears sessionStorage
 * and navigates to /login. No template is needed; the component never renders
 * visible content because the navigation happens synchronously in ngOnInit.
 */
@Component({
  selector: 'app-logout',
  standalone: true,
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.logout();
  }
}
