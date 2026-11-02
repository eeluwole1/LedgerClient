import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { authInterceptor } from './auth-interceptor';
import { ToastService } from '../services/toast';

function fakeJwt(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.signature`;
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  let toast: ToastService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('token', fakeJwt());

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('attaches the bearer token to outgoing requests', () => {
    http.get('http://api.test/api/Transactions/All').subscribe();

    const req = httpMock.expectOne('http://api.test/api/Transactions/All');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${localStorage.getItem('token')}`);
    req.flush([]);
  });

  it('logs out, redirects to /login and tells the user when a data call returns 401', () => {
    http.get('http://api.test/api/Transactions/All').subscribe({ error: () => undefined });

    httpMock
      .expectOne('http://api.test/api/Transactions/All')
      .flush('expired', { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toast.toasts()[0].message).toContain('session has expired');
  });

  it('does not treat a 401 from the Auth endpoints as an expired session', () => {
    http.post('http://api.test/api/Auth/Login', {}).subscribe({ error: () => undefined });

    httpMock
      .expectOne('http://api.test/api/Auth/Login')
      .flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('token')).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(toast.toasts()).toHaveLength(0);
  });

  it('leaves the session alone for non-401 errors', () => {
    http.get('http://api.test/api/Transactions/All').subscribe({ error: () => undefined });

    httpMock
      .expectOne('http://api.test/api/Transactions/All')
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(localStorage.getItem('token')).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logs out only once when several requests fail with 401 together', () => {
    http.get('http://api.test/api/Transactions/All').subscribe({ error: () => undefined });
    http.get('http://api.test/api/Transactions/Summary').subscribe({ error: () => undefined });

    httpMock.expectOne('http://api.test/api/Transactions/All').flush('x', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('http://api.test/api/Transactions/Summary').flush('x', { status: 401, statusText: 'Unauthorized' });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(toast.toasts()).toHaveLength(1);
  });

  it('still passes the original error on to the caller', () => {
    let status = 0;
    http.get('http://api.test/api/Transactions/All').subscribe({ error: (e) => (status = e.status) });

    httpMock.expectOne('http://api.test/api/Transactions/All').flush('x', { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
  });
});
