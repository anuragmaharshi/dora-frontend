// @smoke — AC-4: PLATFORM_ADMIN can configure NCA email settings
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { NcaEmailComponent } from './nca-email.component';
import { AdminService } from '../services/admin.service';
import { NcaEmailConfig } from '../models/admin.view-model';

const MOCK_CONFIG: NcaEmailConfig = {
  tenantId: 'tenant-1',
  sender: 'noreply@dora.local',
  recipient: 'nca@bafin.de',
  subjectTemplate: '[DORA][{{incidentId}}] Initial Notification',
  updatedAt: '2026-01-01T00:00:00Z',
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

describe('AC-4 — NcaEmailComponent @smoke', () => {
  let fixture: ComponentFixture<NcaEmailComponent>;
  let component: NcaEmailComponent;
  let adminService: jasmine.SpyObj<AdminService>;

  beforeEach(async () => {
    adminService = buildAdminServiceSpy();
    adminService.getNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));

    await TestBed.configureTestingModule({
      imports: [NcaEmailComponent, ReactiveFormsModule],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compileComponents();

    fixture = TestBed.createComponent(NcaEmailComponent);
    component = fixture.componentInstance;
  });

  it('AC-4: shows loading state before HTTP response arrives', () => {
    expect(component.loadState()).toBe('loading');
  });

  it('AC-4: populates form with NCA email config on init', () => {
    fixture.detectChanges();
    expect(component.loadState()).toBe('loaded');
    expect(component.form.value['sender']).toBe('noreply@dora.local');
    expect(component.form.value['recipient']).toBe('nca@bafin.de');
    expect(component.form.value['subjectTemplate']).toBe('[DORA][{{incidentId}}] Initial Notification');
  });

  it('AC-4: calls getNcaEmailConfig on init', () => {
    fixture.detectChanges();
    expect(adminService.getNcaEmailConfig).toHaveBeenCalledTimes(1);
  });

  it('AC-4: shows error state when getNcaEmailConfig fails', () => {
    adminService.getNcaEmailConfig.and.returnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    expect(component.loadState()).toBe('error');
    expect(component.errorMessage()).toBe('Network error');
  });

  it('AC-4: requires sender email', () => {
    fixture.detectChanges();
    component.form.patchValue({ sender: '' });
    component.onSubmit();
    expect(component.form.invalid).toBeTrue();
    expect(adminService.updateNcaEmailConfig).not.toHaveBeenCalled();
  });

  it('AC-4: rejects invalid sender email address', () => {
    fixture.detectChanges();
    component.form.patchValue({ sender: 'not-an-email' });
    component.form.get('sender')?.markAsTouched();
    expect(component.form.get('sender')?.errors?.['email']).toBeTruthy();
  });

  it('AC-4: rejects invalid recipient email address', () => {
    fixture.detectChanges();
    component.form.patchValue({ recipient: 'not-an-email' });
    component.form.get('recipient')?.markAsTouched();
    expect(component.form.get('recipient')?.errors?.['email']).toBeTruthy();
  });

  it('AC-4: rejects subjectTemplate exceeding 500 chars', () => {
    fixture.detectChanges();
    const longStr = 'x'.repeat(501);
    component.form.patchValue({ subjectTemplate: longStr });
    component.form.get('subjectTemplate')?.markAsTouched();
    expect(component.form.get('subjectTemplate')?.errors?.['maxlength']).toBeTruthy();
  });

  it('AC-4: calls updateNcaEmailConfig with correct payload on valid submit', () => {
    adminService.updateNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
    fixture.detectChanges();
    component.form.patchValue({
      sender: 'noreply@dora.local',
      recipient: 'nca@bafin.de',
      subjectTemplate: '[DORA] Test',
    });
    component.onSubmit();
    expect(adminService.updateNcaEmailConfig).toHaveBeenCalledOnceWith({
      sender: 'noreply@dora.local',
      recipient: 'nca@bafin.de',
      subjectTemplate: '[DORA] Test',
    });
  });

  it('AC-4: shows saved state after successful update', () => {
    adminService.updateNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
    fixture.detectChanges();
    component.form.patchValue({
      sender: 'noreply@dora.local',
      recipient: 'nca@authority.example',
      subjectTemplate: '[DORA] Subject',
    });
    component.onSubmit();
    expect(component.saveState()).toBe('saved');
  });

  it('AC-4: shows save error when updateNcaEmailConfig fails', () => {
    adminService.updateNcaEmailConfig.and.returnValue(throwError(() => new Error('Permission denied')));
    fixture.detectChanges();
    component.form.patchValue({
      sender: 'noreply@dora.local',
      recipient: 'nca@authority.example',
      subjectTemplate: '[DORA] Subject',
    });
    component.onSubmit();
    expect(component.saveState()).toBe('error');
    expect(component.saveError()).toBe('Permission denied');
  });

  it('AC-8: mutation goes through service (updateNcaEmailConfig spy is called)', () => {
    adminService.updateNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
    fixture.detectChanges();
    component.form.patchValue({
      sender: 'noreply@dora.local',
      recipient: 'nca@authority.example',
      subjectTemplate: '[DORA] Subject',
    });
    component.onSubmit();
    expect(adminService.updateNcaEmailConfig).toHaveBeenCalledTimes(1);
  });
});
