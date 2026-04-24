import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { env } from '../../../core/config/env';

interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

@Component({
  selector: 'app-health',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './health.component.html',
  styleUrl: './health.component.scss'
})
export class HealthComponent implements OnInit {
  private http = inject(HttpClient);
  state = signal<'loading' | 'healthy' | 'error'>('loading');
  version = signal<string>('');
  timestamp = signal<string>('');

  ngOnInit(): void {
    this.http.get<HealthResponse>(`${env.apiBaseUrl}/v1/health`).subscribe({
      next: (res) => {
        this.version.set(res.version);
        this.timestamp.set(res.timestamp);
        this.state.set('healthy');
      },
      error: () => this.state.set('error')
    });
  }
}
