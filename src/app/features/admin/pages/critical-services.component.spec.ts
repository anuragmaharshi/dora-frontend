// @smoke — AC-2: PLATFORM_ADMIN can list, add, and archive critical services
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { CriticalServicesComponent } from './critical-services.component';
import { AdminService } from '../services/admin.service';
import { CriticalService } from '../models/admin.view-model';

const MOCK_SERVICES: CriticalService[] = [
  {
    id: 'svc-1',
    tenantId: 'tenant-1',
    name: 'Online Banking',
    description: 'Retail online banking portal',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'svc-2',
    tenantId: 'tenant-1',
    name: 'Payment Processing',
    description: null,
    active: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'svc-3',
    tenantId: 'tenant-1',
    name: 'Archived Service',
    description: null,
    active: false, // should not appear in the active-only list
    createdAt: '2025-12-01T00:00:00Z',
  },
];

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

describe('AC-2 — CriticalServicesComponent @smoke', () => {
  let fixture: ComponentFixture<CriticalServicesComponent>;
  let component: CriticalServicesComponent;
  let adminService: jasmine.SpyObj<AdminService>;

  beforeEach(async () => {
    adminService = buildAdminServiceSpy();
    adminService.listCriticalServices.and.returnValue(of(MOCK_SERVICES));

    await TestBed.configureTestingModule({
      imports: [CriticalServicesComponent, ReactiveFormsModule],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CriticalServicesComponent);
    component = fixture.componentInstance;
  });

  it('AC-2: shows loading state before HTTP response arrives', () => {
    expect(component.loadState()).toBe('loading');
  });

  it('AC-2: lists only active services on init', () => {
    fixture.detectChanges();
    expect(component.loadState()).toBe('loaded');
    // Only 2 active services; archived one is filtered out.
    expect(component.services().length).toBe(2);
    const names = component.services().map((s) => s.name);
    expect(names).toContain('Online Banking');
    expect(names).toContain('Payment Processing');
    expect(names).not.toContain('Archived Service');
  });

  it('AC-2: renders service rows in the table', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('AC-2: shows error state when list fails', () => {
    adminService.listCriticalServices.and.returnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    expect(component.loadState()).toBe('error');
    expect(component.errorMessage()).toBe('Network error');
  });

  it('AC-2: archive button calls archiveCriticalService with correct id', () => {
    adminService.archiveCriticalService.and.returnValue(of(undefined));
    fixture.detectChanges();
    component.onArchive(MOCK_SERVICES[0]);
    expect(adminService.archiveCriticalService).toHaveBeenCalledOnceWith('svc-1');
  });

  it('AC-2: archive button reloads service list on success', () => {
    adminService.archiveCriticalService.and.returnValue(of(undefined));
    fixture.detectChanges();
    adminService.listCriticalServices.calls.reset();
    component.onArchive(MOCK_SERVICES[0]);
    // listCriticalServices called once more after archive succeeds.
    expect(adminService.listCriticalServices).toHaveBeenCalledTimes(1);
  });

  it('AC-2: add form requires name field', () => {
    fixture.detectChanges();
    component.addForm.patchValue({ name: '' });
    component.onAdd();
    expect(component.addForm.invalid).toBeTrue();
    expect(adminService.createCriticalService).not.toHaveBeenCalled();
  });

  it('AC-2: onAdd calls createCriticalService with correct payload', () => {
    adminService.createCriticalService.and.returnValue(
      of(MOCK_SERVICES[0])
    );
    fixture.detectChanges();
    component.addForm.patchValue({ name: 'Core Banking', description: 'Core ledger' });
    component.onAdd();
    expect(adminService.createCriticalService).toHaveBeenCalledOnceWith({
      name: 'Core Banking',
      description: 'Core ledger',
    });
  });

  it('AC-2: form resets and list reloads after successful add', () => {
    adminService.createCriticalService.and.returnValue(of(MOCK_SERVICES[0]));
    fixture.detectChanges();
    component.addForm.patchValue({ name: 'New Service', description: '' });
    adminService.listCriticalServices.calls.reset();
    component.onAdd();
    expect(component.addForm.value['name']).toBeFalsy();
    expect(adminService.listCriticalServices).toHaveBeenCalledTimes(1);
  });

  it('AC-2: archive buttons render with correct aria-label', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.btn-archive') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].getAttribute('aria-label')).toBe('Archive Online Banking');
    expect(buttons[1].getAttribute('aria-label')).toBe('Archive Payment Processing');
  });

  it('AC-8: add mutation goes through service (spy is called)', () => {
    adminService.createCriticalService.and.returnValue(of(MOCK_SERVICES[0]));
    fixture.detectChanges();
    component.addForm.patchValue({ name: 'Test', description: null });
    component.onAdd();
    expect(adminService.createCriticalService).toHaveBeenCalledTimes(1);
  });
});
