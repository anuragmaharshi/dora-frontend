import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styleUrl: './app.scss',
  // OnPush: the root component delegates all rendering to routed children;
  // it has no state of its own that requires Default CD.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
