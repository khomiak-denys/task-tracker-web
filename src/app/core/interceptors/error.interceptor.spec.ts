import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { NotificationService } from '../services/notification.service';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
    spyOn(notificationService, 'error').and.callThrough();
  });

  afterEach(() => {
    httpMock.verify();
    notificationService.clear();
  });

  it('should extract individual errors from 400 ValidationProblemDetails errors field and create popups without headers', () => {
    http.post('/api/test', {}).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/api/test');
    req.flush(
      {
        type: 'https://httpstatuses.io/400',
        title: 'Validation Error',
        status: 400,
        errors: {
          NewPassword: [
            "The length of 'New Password' must be at least 8 characters. You entered 7 characters.",
          ],
          ConfirmPassword: ['Passwords must match.'],
        },
        traceId: '00-339a20b556a2d16bc2fd4f6ad897716b-37979df923ac02ed-01',
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(notificationService.error).toHaveBeenCalledTimes(2);
    expect(notificationService.error).toHaveBeenCalledWith(
      "The length of 'New Password' must be at least 8 characters. You entered 7 characters.",
    );
    expect(notificationService.error).toHaveBeenCalledWith(
      'Passwords must match.',
    );
  });

  it('should use detail field directly without header for 401 Unauthorized errors', () => {
    http.get('/api/protected').subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush(
      {
        type: 'https://httpstatuses.io/401',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid email or password',
        traceId: '00-54089db01de398ca438080440803be1f-4db315076e1f145c-01',
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(notificationService.error).toHaveBeenCalledTimes(1);
    expect(notificationService.error).toHaveBeenCalledWith(
      'Invalid email or password',
    );
  });
});
