import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForgotPassword } from './forgot-password';
import { ToastService } from '../../services/toast';

describe('ForgotPassword', () => {
  let fixture: ComponentFixture<ForgotPassword>;
  let component: ForgotPassword;
  let httpMock: HttpTestingController;
  let toast: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('does not call the API for a missing, blank or malformed email', () => {
    component.onSubmit();
    expect(component.form.get('email')!.hasError('required')).toBe(true);

    for (const value of ['', '   ', 'not-an-email', 'two words@test.local']) {
      component.form.setValue({ email: value });
      expect(component.form.invalid).toBe(true);
      component.onSubmit();
    }

    httpMock.expectNone((r) => r.url.endsWith('/Auth/ForgotPassword'));
  });

  it('accepts an email pasted with surrounding spaces', () => {
    component.form.setValue({ email: '  me@test.local  ' });

    expect(component.form.valid).toBe(true);
  });

  it('posts the trimmed email and then shows the confirmation', async () => {
    component.form.setValue({ email: '  me@test.local ' });
    component.onSubmit();

    const req = httpMock.expectOne((r) => r.url.endsWith('/Auth/ForgotPassword'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'me@test.local' });
    req.flush({ message: 'If that email is registered, a reset link is on its way.' });
    await fixture.whenStable();

    expect(component.submittedTo()).toBe('me@test.local');
    expect(text()).toContain('a reset link is on its way');
    expect(text()).toContain('me@test.local');
    expect(component.loading()).toBe(false);
  });

  it('lets the user go back and try a different email', async () => {
    component.form.setValue({ email: 'me@test.local' });
    component.onSubmit();
    httpMock.expectOne((r) => r.url.endsWith('/Auth/ForgotPassword')).flush({});
    await fixture.whenStable();

    component.tryAgain();
    await fixture.whenStable();

    expect(component.submittedTo()).toBeNull();
    expect(text()).toContain('Send reset link');
  });

  it('tells the user to wait when the API answers 429', () => {
    component.form.setValue({ email: 'me@test.local' });
    component.onSubmit();

    httpMock
      .expectOne((r) => r.url.endsWith('/Auth/ForgotPassword'))
      .flush('', { status: 429, statusText: 'Too Many Requests' });

    expect(component.submittedTo()).toBeNull();
    expect(component.loading()).toBe(false);
    expect(toast.toasts()[0].message).toContain('Too many attempts');
  });

  it('shows a generic error for any other failure', () => {
    component.form.setValue({ email: 'me@test.local' });
    component.onSubmit();

    httpMock
      .expectOne((r) => r.url.endsWith('/Auth/ForgotPassword'))
      .flush('', { status: 500, statusText: 'Server Error' });

    expect(toast.toasts()[0].message).toContain('Something went wrong');
  });
});
