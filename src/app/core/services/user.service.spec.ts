import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { UserService } from './user.service';
import { UserProfile, UpdateProfileRequest, ChangePasswordRequest } from '../models/user.models';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let httpTesting: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/api/v1/users`;

  const mockProfile: UserProfile = {
    id: 'user-123',
    userName: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    roles: ['User'],
    emailConfirmed: true,
    twoFactorEnabled: false,
    lockoutEnd: null,
    lockoutEnabled: false,
    accessFailedCount: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(UserService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getProfile should send GET request to user endpoint', (done) => {
    service.getProfile('user-123').subscribe((profile) => {
      expect(profile).toEqual(mockProfile);
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/user-123`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockProfile);
  });

  it('updateProfile should send PUT request with payload', (done) => {
    const updatePayload: UpdateProfileRequest = {
      fullName: 'Updated Name',
      userName: 'updated_user',
    };

    service.updateProfile('user-123', updatePayload).subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/user-123/profile`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatePayload);
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });

  it('changePassword should send PUT request with password payload', (done) => {
    const passwordPayload: ChangePasswordRequest = {
      currentPassword: 'oldPassword1!',
      newPassword: 'newPassword1!',
    };

    service.changePassword('user-123', passwordPayload).subscribe(() => {
      done();
    });

    const req = httpTesting.expectOne(`${baseUrl}/user-123/password`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(passwordPayload);
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null);
  });
});
