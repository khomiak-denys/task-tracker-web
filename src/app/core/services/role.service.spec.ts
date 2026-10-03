import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { RoleService } from './role.service';
import { environment } from '../../../environments/environment';

describe('RoleService', () => {
  let service: RoleService;
  let httpTesting: HttpTestingController;
  const rolesUrl = `${environment.apiBaseUrl}/api/v1/roles`;
  const usersUrl = `${environment.apiBaseUrl}/api/v1/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RoleService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(RoleService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('getAll_Should_ReturnRolesList_When_Invoked', (done) => {
    const mockRoles = ['Admin', 'Manager', 'User'];

    service.getAll().subscribe((roles) => {
      expect(roles).toEqual(mockRoles);
      done();
    });

    const req = httpTesting.expectOne(rolesUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockRoles);
  });

  it('getForUser_Should_ReturnUserRoles_When_UserIdProvided', (done) => {
    const mockRoles = ['User'];

    service.getForUser('user-123').subscribe((roles) => {
      expect(roles).toEqual(mockRoles);
      done();
    });

    const req = httpTesting.expectOne(`${usersUrl}/user-123/roles`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockRoles);
  });

  it('assignRole_Should_SendPostRequest_When_Invoked', (done) => {
    service.assignRole('user-123', 'Manager').subscribe(() => {
      expect().nothing();
      done();
    });

    const req = httpTesting.expectOne(`${usersUrl}/user-123/roles/Manager`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('removeRole_Should_SendDeleteRequest_When_Invoked', (done) => {
    service.removeRole('user-123', 'Manager').subscribe(() => {
      expect().nothing();
      done();
    });

    const req = httpTesting.expectOne(`${usersUrl}/user-123/roles/Manager`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });
});
