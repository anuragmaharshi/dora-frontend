// @thorough — LLD-01 W5: extended specs covering loading, success, error, accessibility, interceptor, and route wiring.
// AC-2: landing page displays API health status sourced from GET /api/v1/health.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HealthComponent } from './health.component';
import { HttpInterceptorFn } from '@angular/common/http';
import { routes } from '../../app.routes';
import { apiInterceptor } from '../../../core/http/api.interceptor';

// The component calls env.apiBaseUrl + '/v1/health'. env.apiBaseUrl = '/api' in test env.
const HEALTH_URL = '/api/v1/health';

const HEALTHY_RESPONSE = { status: 'healthy', version: 'abc1234', timestamp: '2026-04-23T10:00:00Z' };

describe('HealthComponent — thorough', () => {
  let fixture: ComponentFixture<HealthComponent>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HealthComponent);
    httpMock = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => httpMock.verify());

  // ---------------------------------------------------------------------------
  // AC-2 — Loading state
  // ---------------------------------------------------------------------------
  describe('AC-2 — loading state (before HTTP response arrives)', () => {
    it('renders "Checking API..." in the DOM before the response arrives', () => {
      fixture.detectChanges();
      expect(el.textContent).toContain('Checking API...');
      // Flush pending request so afterEach verify() passes.
      httpMock.expectOne(HEALTH_URL).flush(HEALTHY_RESPONSE);
    });

    it('does NOT render the healthy message while in loading state', () => {
      fixture.detectChanges();
      expect(el.textContent).not.toContain('API: healthy');
      httpMock.expectOne(HEALTH_URL).flush(HEALTHY_RESPONSE);
    });

    it('does NOT render the error message while in loading state', () => {
      fixture.detectChanges();
      expect(el.textContent).not.toContain('API: unreachable');
      httpMock.expectOne(HEALTH_URL).flush(HEALTHY_RESPONSE);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2 — Success state
  // ---------------------------------------------------------------------------
  describe('AC-2 — success state (after healthy HTTP response)', () => {
    beforeEach(() => {
      fixture.detectChanges();
      httpMock.expectOne(HEALTH_URL).flush(HEALTHY_RESPONSE);
      fixture.detectChanges();
    });

    it('renders the version string from the API response', () => {
      expect(el.textContent).toContain(HEALTHY_RESPONSE.version);
    });

    it('renders the timestamp from the API response', () => {
      expect(el.textContent).toContain(HEALTHY_RESPONSE.timestamp);
    });

    it('renders "API: healthy" after a successful response', () => {
      expect(el.textContent).toContain('API: healthy');
    });

    it('removes the loading message after a successful response', () => {
      expect(el.textContent).not.toContain('Checking API...');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2 — Error state
  // ---------------------------------------------------------------------------
  describe('AC-2 — error state', () => {
    it('shows error message on 500 Server Error', () => {
      fixture.detectChanges();
      httpMock
        .expectOne(HEALTH_URL)
        .flush(null, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(el.textContent).toContain('API: unreachable');
    });

    it('shows error message on 404 Not Found', () => {
      fixture.detectChanges();
      httpMock
        .expectOne(HEALTH_URL)
        .flush(null, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();
      expect(el.textContent).toContain('API: unreachable');
    });

    it('shows error message on network timeout', () => {
      fixture.detectChanges();
      httpMock
        .expectOne(HEALTH_URL)
        .error(new ProgressEvent('timeout'));
      fixture.detectChanges();
      expect(el.textContent).toContain('API: unreachable');
    });

    it('does NOT render the healthy message in error state', () => {
      fixture.detectChanges();
      httpMock
        .expectOne(HEALTH_URL)
        .flush(null, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(el.textContent).not.toContain('API: healthy');
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------
  describe('accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
      // Leave the request pending so we can inspect loading state too,
      // but flush after each assertion to keep httpMock clean.
    });

    it('contains a landmark element (<main> or role="main") in the host', () => {
      const mainEl =
        el.querySelector('main') ?? el.querySelector('[role="main"]');
      expect(mainEl).not.toBeNull();
      // Flush pending request.
      httpMock.expectOne(HEALTH_URL).flush(HEALTHY_RESPONSE);
    });

    it('landmark element carries a non-empty accessible name (aria-label or aria-labelledby)', () => {
      const mainEl =
        (el.querySelector('main') ?? el.querySelector('[role="main"]')) as HTMLElement | null;
      expect(mainEl).not.toBeNull();
      const label = mainEl!.getAttribute('aria-label') ?? mainEl!.getAttribute('aria-labelledby');
      expect(label).toBeTruthy();
      httpMock.expectOne(HEALTH_URL).flush(HEALTHY_RESPONSE);
    });

    it('has no tabindex="-1" on interactive content (no keyboard trap)', () => {
      const trapped = el.querySelectorAll('[tabindex="-1"]');
      // Loading state has no interactive elements — the list must be empty.
      expect(trapped.length).toBe(0);
      httpMock.expectOne(HEALTH_URL).flush(HEALTHY_RESPONSE);
    });
  });
});

// ---------------------------------------------------------------------------
// Interceptor — importability and type check
// ---------------------------------------------------------------------------
describe('apiInterceptor — thorough', () => {
  it('is importable and is typed as HttpInterceptorFn (function)', () => {
    // Compile-time: the import would fail if the export did not exist.
    // Runtime: verify the value is a function — the shape Angular requires for HttpInterceptorFn.
    const interceptor: HttpInterceptorFn = apiInterceptor;
    expect(typeof interceptor).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Route wiring
// ---------------------------------------------------------------------------
describe('app routes — thorough', () => {
  it('AC-2 — root path "" maps to HealthComponent', () => {
    const rootRoute = routes.find((r) => r.path === '');
    expect(rootRoute).toBeDefined();
    expect(rootRoute!.component).toBe(HealthComponent);
  });

  it('wildcard "**" route exists and has a redirectTo target', () => {
    const wildcardRoute = routes.find((r) => r.path === '**');
    expect(wildcardRoute).toBeDefined();
    expect(wildcardRoute!.redirectTo).toBeDefined();
    // redirectTo must be a non-empty string (e.g. '' or '/').
    expect(typeof wildcardRoute!.redirectTo).toBe('string');
  });
});
