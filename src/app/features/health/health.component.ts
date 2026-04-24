import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule],
  templateUrl: './health.component.html',
  styleUrl: './health.component.scss'
})
export class HealthComponent implements OnInit {
  state = signal<'loading' | 'healthy' | 'error'>('loading');
  version = signal<string>('');
  timestamp = signal<string>('');

  constructor(private http: HttpClient) {}

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
