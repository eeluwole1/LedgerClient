import { Component, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../shared/button/button';
import { Card } from '../shared/card/card';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';

interface PasswordStrength {
  label: string;
  percent: number;
  barClass: string;
  textClass: string;
}

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink, NgClass, Button, Card],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  signupForm: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  loading = signal(false);
  passwordStrength = signal<PasswordStrength | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
  ) {
    this.signupForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
      },
      { validators: this.passwordMatchValidator },
    );

    this.signupForm.get('password')!.valueChanges.subscribe((value: string) => {
      this.passwordStrength.set(this.computePasswordStrength(value ?? ''));
    });
  }

  private computePasswordStrength(password: string): PasswordStrength | null {
    if (!password) {
      return null;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) {
      return { label: 'Weak', percent: 33, barClass: 'bg-rose-500', textClass: 'text-rose-600' };
    }
    if (score === 2) {
      return { label: 'Medium', percent: 66, barClass: 'bg-amber-500', textClass: 'text-amber-600' };
    }
    return { label: 'Strong', percent: 100, barClass: 'bg-emerald-500', textClass: 'text-emerald-600' };
  }

  private passwordMatchValidator(fg: AbstractControl): ValidationErrors | null {
    const password = fg.get('password')?.value;
    const confirmPassword = fg.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.signupForm.get(controlName);
    return !!(control && control.touched && control.hasError(errorName));
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      return;
    }

    this.loading.set(true);
    const { email, password } = this.signupForm.value;
    this.authService.register({ email, password }).subscribe({
      next: () => {
        this.toastService.success('Account created! Welcome to LedgerApp.');
        this.router.navigate(['/transactions']);
      },
      error: (error) => {
        this.loading.set(false);
        this.toastService.error(error.error?.message ?? 'An error occurred during signup. Please try again.');
      },
    });
  }
}
