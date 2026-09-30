import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    service.clear();
  });

  it('should display at most 3 popups simultaneously and queue the rest', fakeAsync(() => {
    // Add 3 toasts with 3000ms duration
    service.error('Error 1');
    service.error('Error 2');
    service.error('Error 3');
    // Add 2 queued toasts
    service.error('Error 4');
    service.error('Error 5');

    // Only 3 should be visible initially
    expect(service.notifications().length).toBe(3);
    expect(service.notifications().map((n) => n.message)).toEqual([
      'Error 1',
      'Error 2',
      'Error 3',
    ]);

    // Manually dismiss Error 1: Error 4 should be promoted immediately
    const firstId = service.notifications()[0].id;
    service.dismiss(firstId);

    expect(service.notifications().length).toBe(3);
    expect(service.notifications().map((n) => n.message)).toEqual([
      'Error 2',
      'Error 3',
      'Error 4',
    ]);

    // Manually dismiss Error 2: Error 5 should be promoted immediately
    const secondId = service.notifications()[0].id;
    service.dismiss(secondId);

    expect(service.notifications().length).toBe(3);
    expect(service.notifications().map((n) => n.message)).toEqual([
      'Error 3',
      'Error 4',
      'Error 5',
    ]);

    // After 3000ms, Error 3, 4, 5 (started at t=0, t=0, t=0) expire
    tick(3000);
    expect(service.notifications().length).toBe(0);
  }));

  it('should promote queued toast when an active toast timer expires', fakeAsync(() => {
    // Toast 1 has 1000ms duration
    service.show('Toast 1', 'error', { durationMs: 1000 });
    // Toasts 2 and 3 have 3000ms duration
    service.show('Toast 2', 'error', { durationMs: 3000 });
    service.show('Toast 3', 'error', { durationMs: 3000 });
    // Toast 4 is queued
    service.show('Toast 4', 'info', { durationMs: 3000 });

    expect(service.notifications().length).toBe(3);
    expect(service.notifications().map((n) => n.message)).toEqual([
      'Toast 1',
      'Toast 2',
      'Toast 3',
    ]);

    // At 1000ms, only Toast 1 expires, promoting Toast 4
    tick(1000);
    expect(service.notifications().length).toBe(3);
    expect(service.notifications().map((n) => n.message)).toEqual([
      'Toast 2',
      'Toast 3',
      'Toast 4',
    ]);

    // At 3000ms total (+2000ms), Toast 2 and 3 expire
    tick(2000);
    expect(service.notifications().length).toBe(1);
    expect(service.notifications().map((n) => n.message)).toEqual(['Toast 4']);

    // At 4000ms total (+1000ms), Toast 4 expires (1000ms + 3000ms duration = 4000ms)
    tick(1000);
    expect(service.notifications().length).toBe(0);
  }));

  it('should clear both active and queued toasts when clear is called', () => {
    service.error('E1');
    service.error('E2');
    service.error('E3');
    service.error('E4');
    service.error('E5');

    expect(service.notifications().length).toBe(3);
    service.clear();
    expect(service.notifications().length).toBe(0);
  });
});
