import { Component, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from '../shared/button/button';
import { Card } from '../shared/card/card';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { trimmedEmail } from '../../utils/validators';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, NgClass, Button, Card],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  form: FormGroup;
  loading = signal(false);
  submittedTo = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
  ) {
    this.form = this.fb.group({
      email: ['', [trimmedEmail]],
    });
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.touched && control.hasError(errorName));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    const email = (this.form.value.email as string).trim();
    this.loading.set(true);
    this.authService.forgotPassword(email).subscribe({
      // The API answers the same way whether or not the address has an account, and so does this page.
      next: () => {
        this.loading.set(false);
        this.submittedTo.set(email);
      },
      error: (error) => {
        this.loading.set(false);
        this.toastService.error(
          error.status === 429
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : 'Something went wrong. Please try again.',
        );
      },
    });
  }

  tryAgain(): void {
    this.submittedTo.set(null);
  }
}
