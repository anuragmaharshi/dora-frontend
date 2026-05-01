// @smoke — AC-3: PLATFORM_ADMIN can set client base count and view history
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ClientBaseComponent } from './client-base.component';
import { AdminService } from '../services/admin.service';
import { ClientBaseEntry, ClientBaseHistory } from '../models/admin.view-model';

const MOCK_ENTRY: ClientBaseEntry = {
  id: 'entry-1',
  tenantId: 'tenant-1',
  clientCount: 1200000,
  effectiveFrom: '2026-01-01T00:00:00Z',
  setBy: 'user-123',
  createdAt: '2026-01-01T08:00:00Z',
};

const MOCK_HISTORY: ClientBaseHistory = {
  entries: [MOCK_ENTRY],
};

function buildAdminServiceSpy(): jasmine.SpyObj<AdminService> {
  return jasmine.createSpyObj<AdminService>('AdminService', [
    'getTenant',
    'updateTenant',
    'listCriticalServices',
    'createCriticalService',
    'archiveCriticalService',
    'getClientBaseHistory',
    'setClientBase',
    'getNcaEmailConfig',
    'updateNcaEmailConfig',
  ]);
}

describe('AC-3 — ClientBaseComponent @smoke', () => {
  let fixture: ComponentFixture<ClientBaseComponent>;
  let component: ClientBaseComponent;
  let adminService: jasmine.SpyObj<AdminService>;

  beforeEach(async () => {
    adminService = buildAdminServiceSpy();
    adminService.getClientBaseHistory.and.returnValue(of(MOCK_HISTORY));

    await TestBed.configureTestingModule({
      imports: [ClientBaseComponent, ReactiveFormsModule],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientBaseComponent);
    component = fixture.componentInstance;
  });

  it('AC-3: shows loading state before HTTP response arrives', () => {
    expect(component.loadState()).toBe('loading');
  });

  it('AC-3: loads and displays history on init', () => {
    fixture.detectChanges();
    expect(component.loadState()).toBe('loaded');
    expect(component.entries().length).toBe(1);
    expect(component.entries()[0].clientCount).toBe(1200000);
  });

  it('AC-3: renders history table rows', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
  });

  it('AC-3: shows error state when history fetch fails', () => {
    adminService.getClientBaseHistory.and.returnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();
    expect(component.loadState()).toBe('error');
    expect(component.errorMessage()).toBe('Server error');
  });

  it('AC-3: form requires clientCount and effectiveFrom', () => {
    fixture.detectChanges();
    component.form.patchValue({ clientCount: null, effectiveFrom: '' });
    component.onSubmit();
    expect(component.form.invalid).toBeTrue();
    expect(adminService.setClientBase).not.toHaveBeenCalled();
  });

  it('AC-3: rejects negative clientCount', () => {
    fixture.detectChanges();
    component.form.patchValue({ clientCount: -1, effectiveFrom: '2026-01-01' });
    component.form.get('clientCount')?.markAsTouched();
    expect(component.form.get('clientCount')?.errors?.['min']).toBeTruthy();
  });

  it('AC-3: calls setClientBase with correct payload on valid submit', () => {
    adminService.setClientBase.and.returnValue(of(MOCK_ENTRY));
    fixture.detectChanges();
    component.form.patchValue({ clientCount: 1200000, effectiveFrom: '2026-01-01' });
    component.onSubmit();
    expect(adminService.setClientBase).toHaveBeenCalledOnceWith({
      clientCount: 1200000,
      effectiveFrom: '2026-01-01',
    });
  });

  it('AC-3: reloads history after successful submission', () => {
    adminService.setClientBase.and.returnValue(of(MOCK_ENTRY));
    fixture.detectChanges();
    adminService.getClientBaseHistory.calls.reset();
    component.form.patchValue({ clientCount: 500000, effectiveFrom: '2026-06-01' });
    component.onSubmit();
    expect(adminService.getClientBaseHistory).toHaveBeenCalledTimes(1);
  });

  it('AC-3: shows saved state after successful submission', () => {
    adminService.setClientBase.and.returnValue(of(MOCK_ENTRY));
    fixture.detectChanges();
    component.form.patchValue({ clientCount: 500000, effectiveFrom: '2026-06-01' });
    component.onSubmit();
    expect(component.saveState()).toBe('saved');
  });

  it('AC-3: shows save error when setClientBase fails', () => {
    adminService.setClientBase.and.returnValue(throwError(() => new Error('Conflict')));
    fixture.detectChanges();
    component.form.patchValue({ clientCount: 500000, effectiveFrom: '2026-06-01' });
    component.onSubmit();
    expect(component.saveState()).toBe('error');
    expect(component.saveError()).toBe('Conflict');
  });

  it('AC-3: accepts zero as valid clientCount', () => {
    fixture.detectChanges();
    component.form.patchValue({ clientCount: 0, effectiveFrom: '2026-01-01' });
    expect(component.form.get('clientCount')?.errors).toBeNull();
  });

  it('AC-8: mutation goes through service (setClientBase spy is called)', () => {
    adminService.setClientBase.and.returnValue(of(MOCK_ENTRY));
    fixture.detectChanges();
    component.form.patchValue({ clientCount: 100, effectiveFrom: '2026-01-01' });
    component.onSubmit();
    expect(adminService.setClientBase).toHaveBeenCalledTimes(1);
  });
});
