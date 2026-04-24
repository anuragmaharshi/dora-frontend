// @smoke — AC-2: landing page shows API health status from live call to GET /api/v1/health
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HealthComponent } from './health.component';

describe('HealthComponent @smoke', () => {
  let fixture: ComponentFixture<HealthComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthComponent, HttpClientTestingModule]
    }).compileComponents();
    fixture = TestBed.createComponent(HealthComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('AC-2: shows loading state initially before HTTP response arrives', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Checking API...');
    // Flush so afterEach verify() passes
    httpMock.expectOne('/api/v1/health').flush({ status: 'healthy', version: '0.0.1', timestamp: '2026-04-24T10:00:00Z' });
  });

  it('AC-2: shows healthy state after a successful HTTP response', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/health').flush({ status: 'healthy', version: '0.0.1', timestamp: '2026-04-24T10:00:00Z' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('API: healthy');
  });

  it('AC-2: shows error state when the HTTP request fails', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/health').error(new ErrorEvent('network error'));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('API: unreachable');
  });
});
