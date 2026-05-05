// @smoke — AC-1: PLATFORM_ADMIN can view and edit tenant configuration
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { TenantConfigComponent } from './tenant-config.component';
import { AdminService } from '../services/admin.service';
import { TenantConfig } from '../models/admin.view-model';

const MOCK_CONFIG: TenantConfig = {
  id: 'tenant-1',
  legalName: 'Nexus Bank',
  lei: 'NEXUSBANK1234567890A', // 20 chars, valid LEI format (uppercase alphanum)
  ncaName: 'BaFin',
  ncaEmail: 'nca@bafin.de',
  jurisdictionIso: 'DE',
  primaryComplianceContactId: 'user-123',
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

describe('AC-1 — TenantConfigComponent @smoke', () => {
  let fixture: ComponentFixture<TenantConfigComponent>;
  let component: TenantConfigComponent;
  let adminService: jasmine.SpyObj<AdminService>;

  beforeEach(async () => {
    adminService = buildAdminServiceSpy();
    adminService.getTenant.and.returnValue(of(MOCK_CONFIG));

    await TestBed.configureTestingModule({
      imports: [TenantConfigComponent, ReactiveFormsModule],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantConfigComponent);
    component = fixture.componentInstance;
  });

  it('AC-1: shows loading state before HTTP response arrives', () => {
    // Do not trigger ngOnInit yet — check initial signal value.
    expect(component.loadState()).toBe('loading');
  });

  it('AC-1: populates form with tenant config on init', () => {
    fixture.detectChanges(); // triggers ngOnInit
    expect(component.loadState()).toBe('loaded');
    expect(component.form.value['legalName']).toBe('Nexus Bank');
    expect(component.form.value['lei']).toBe('NEXUSBANK1234567890A');
    expect(component.form.value['ncaEmail']).toBe('nca@bafin.de');
  });

  it('AC-1: renders form fields after config loads', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#legalName')).toBeTruthy();
    expect(el.querySelector('#lei')).toBeTruthy();
    expect(el.querySelector('#ncaEmail')).toBeTruthy();
    expect(el.querySelector('#jurisdictionIso')).toBeTruthy();
  });

  it('AC-1: calls getTenant on init', () => {
    fixture.detectChanges();
    expect(adminService.getTenant).toHaveBeenCalledTimes(1);
  });

  it('AC-1: shows error state when getTenant fails', () => {
    adminService.getTenant.and.returnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    expect(component.loadState()).toBe('error');
    expect(component.errorMessage()).toBe('Network error');
  });

  it('AC-1: marks form invalid when legalName is empty and submitted', () => {
    fixture.detectChanges();
    component.form.patchValue({ legalName: '' });
    component.onSubmit();
    expect(component.form.invalid).toBeTrue();
    expect(adminService.updateTenant).not.toHaveBeenCalled();
  });

  it('AC-1: calls updateTenant with correct payload on valid submit', () => {
    adminService.updateTenant.and.returnValue(of(MOCK_CONFIG));
    fixture.detectChanges();
    component.form.patchValue({
      legalName: 'Nexus Bank',
      lei: 'NEXUSBANK1234567890A', // 20-char uppercase alphanum — passes LEI validator
      ncaName: 'BaFin',
      ncaEmail: 'nca@bafin.de',
      jurisdictionIso: 'DE',
      primaryComplianceContactId: 'user-123',
    });
    component.onSubmit();
    expect(adminService.updateTenant).toHaveBeenCalledOnceWith({
      legalName: 'Nexus Bank',
      lei: 'NEXUSBANK1234567890A',
      ncaName: 'BaFin',
      ncaEmail: 'nca@bafin.de',
      jurisdictionIso: 'DE',
      primaryComplianceContactId: 'user-123',
    });
  });

  it('AC-1: shows saved state after successful update', () => {
    adminService.updateTenant.and.returnValue(of(MOCK_CONFIG));
    fixture.detectChanges();
    // Ensure form is valid
    component.form.patchValue({ legalName: 'Nexus Bank', lei: '', ncaName: '', ncaEmail: '', jurisdictionIso: '', primaryComplianceContactId: '' });
    component.onSubmit();
    expect(component.saveState()).toBe('saved');
  });

  it('AC-1: shows save error state when updateTenant fails', () => {
    adminService.updateTenant.and.returnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();
    component.form.patchValue({ legalName: 'Test Bank', lei: '', ncaName: '', ncaEmail: '', jurisdictionIso: '', primaryComplianceContactId: '' });
    component.onSubmit();
    expect(component.saveState()).toBe('error');
    expect(component.saveError()).toBe('Server error');
  });

  it('AC-1: rejects LEI with invalid pattern', () => {
    fixture.detectChanges();
    component.form.patchValue({ lei: 'INVALID' });
    component.form.get('lei')?.markAsTouched();
    expect(component.form.get('lei')?.errors?.['pattern']).toBeTruthy();
  });

  it('AC-1: accepts LEI with valid 20-char uppercase alphanumeric', () => {
    fixture.detectChanges();
    component.form.patchValue({ lei: 'ABCDEF1234ABCDEF1234' }); // exactly 20 chars
    expect(component.form.get('lei')?.errors).toBeNull();
  });

  it('AC-8: submit button is disabled while saving', () => {
    adminService.updateTenant.and.returnValue(of(MOCK_CONFIG));
    fixture.detectChanges();
    component.saveState.set('saving');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
  });
});
