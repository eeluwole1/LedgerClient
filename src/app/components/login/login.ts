import { Component, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../shared/button/button';
import { Card } from '../shared/card/card';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, NgClass, Button, Card],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm: FormGroup;
  showPassword = signal(false);
  loading = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [true],
    });
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!(control && control.touched && control.hasError(errorName));
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  onForgotPassword(): void {
    this.toastService.info("Password reset isn't available yet. Contact support if you're locked out.");
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    const { email, password, rememberMe } = this.loginForm.value;
    this.authService.login({ email, password }, rememberMe).subscribe({
      next: () => {
        this.toastService.success('Welcome back!');
        this.router.navigate(['/transactions']);
      },
      error: (error) => {
        this.loading.set(false);
        this.toastService.error(error.error?.message ?? 'An error occurred during login. Please try again.');
      },
    });
  }
}
