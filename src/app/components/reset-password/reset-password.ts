import { Component, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from '../shared/button/button';
import { Card } from '../shared/card/card';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { PasswordStrength, computePasswordStrength } from '../../utils/password-strength';

// Matches the API's rules for a password (8 to 128 characters).
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, NgClass, Button, Card],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  form: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  loading = signal(false);
  passwordStrength = signal<PasswordStrength | null>(null);

  // 'missing': the page was opened without a token. 'rejected': the API said the link is used or expired.
  linkProblem = signal<'missing' | 'rejected' | null>(null);
  private token = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(MIN_LENGTH), Validators.maxLength(MAX_LENGTH)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );

    this.form.get('password')!.valueChanges.subscribe((value: string) => {
      this.passwordStrength.set(computePasswordStrength(value ?? ''));
    });
  }

  ngOnInit(): void {
    // The emailed link looks like /reset-password#token=...  The token is in the fragment so it is never
    // sent to a server or in a Referer header. Read it once, then take it out of the address bar and history.
    const fragment = this.route.snapshot.fragment ?? '';
    this.token = new URLSearchParams(fragment).get('token') ?? '';

    if (!this.token) {
      this.linkProblem.set('missing');
      return;
    }

    this.router.navigate([], { relativeTo: this.route, fragment: undefined, replaceUrl: true });
  }

  private passwordMatchValidator(fg: AbstractControl): ValidationErrors | null {
    const password = fg.get('password')?.value;
    const confirmPassword = fg.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.touched && control.hasError(errorName));
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token) {
      return;
    }

    this.loading.set(true);
    this.authService.resetPassword(this.token, this.form.value.password).subscribe({
      next: () => {
        this.toastService.success('Password updated. Sign in with your new password.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.loading.set(false);
        if (error.status === 400 && error.error?.message) {
          this.linkProblem.set('rejected');
        } else if (error.status === 429) {
          this.toastService.error('Too many attempts. Please wait a few minutes and try again.');
        } else {
          this.toastService.error('Something went wrong. Please try again.');
        }
      },
    });
  }
}
