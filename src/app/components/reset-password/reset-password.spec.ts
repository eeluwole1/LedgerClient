import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ResetPassword } from './reset-password';
import { ToastService } from '../../services/toast';

describe('ResetPassword', () => {
  let httpMock: HttpTestingController;
  let toast: ToastService;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function create(fragment: string | null): Promise<{ fixture: ComponentFixture<ResetPassword>; component: ResetPassword }> {
    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(ResetPassword);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance };
  }

  afterEach(() => httpMock.verify());

  const text = (fixture: ComponentFixture<ResetPassword>) => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('explains that the email link is needed when the page is opened without a token', async () => {
    const { fixture, component } = await create(null);

    expect(component.linkProblem()).toBe('missing');
    expect(text(fixture)).toContain('needs the link from your reset email');
    expect(text(fixture)).toContain('Request a new link');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('reads the token from the URL fragment and removes it from the address bar', async () => {
    const { component } = await create('token=abc123');

    expect(component.linkProblem()).toBeNull();
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ fragment: undefined, replaceUrl: true }));
  });

  it('rejects a password under 8 characters and a mismatched confirmation', async () => {
    const { component } = await create('token=abc123');

    component.form.setValue({ password: 'short', confirmPassword: 'short' });
    expect(component.form.invalid).toBe(true);

    component.form.setValue({ password: 'LongEnough1!', confirmPassword: 'Different1!' });
    expect(component.form.hasError('passwordMismatch')).toBe(true);

    component.onSubmit();
    httpMock.expectNone((r) => r.url.endsWith('/Auth/ResetPassword'));
  });

  it('sends the token with the new password, then goes to the login page', async () => {
    const { component } = await create('token=abc123');
    component.form.setValue({ password: 'BrandNew456!', confirmPassword: 'BrandNew456!' });

    component.onSubmit();

    const req = httpMock.expectOne((r) => r.url.endsWith('/Auth/ResetPassword'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'abc123', newPassword: 'BrandNew456!' });
    req.flush({ message: 'Your password has been updated. You can now sign in.' });

    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toast.toasts()[0].message).toContain('Password updated');
  });

  it('shows the "invalid or expired" state when the API rejects the token', async () => {
    const { fixture, component } = await create('token=stale');
    component.form.setValue({ password: 'BrandNew456!', confirmPassword: 'BrandNew456!' });

    component.onSubmit();
    httpMock
      .expectOne((r) => r.url.endsWith('/Auth/ResetPassword'))
      .flush({ message: 'This reset link is invalid or has expired.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(component.linkProblem()).toBe('rejected');
    expect(text(fixture)).toContain('invalid or has expired');
    expect(fixture.nativeElement.querySelector('a[href="/forgot-password"]')).not.toBeNull();
  });

  it('keeps the form and shows a toast on a rate limit or server error', async () => {
    const { component } = await create('token=abc123');
    component.form.setValue({ password: 'BrandNew456!', confirmPassword: 'BrandNew456!' });

    component.onSubmit();
    httpMock
      .expectOne((r) => r.url.endsWith('/Auth/ResetPassword'))
      .flush('', { status: 429, statusText: 'Too Many Requests' });

    expect(component.linkProblem()).toBeNull();
    expect(component.loading()).toBe(false);
    expect(toast.toasts()[0].message).toContain('Too many attempts');
  });
});
