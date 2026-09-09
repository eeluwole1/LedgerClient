import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { ToastService, ToastType } from '../../../services/toast';

@Component({
  selector: 'app-toast-container',
  imports: [NgClass],
  templateUrl: './toast-container.html',
})
export class ToastContainer {
  constructor(protected toastService: ToastService) {}

  containerClass(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800';
      case 'error':
        return 'border-rose-200 bg-rose-50 text-rose-800';
      default:
        return 'border-indigo-200 bg-indigo-50 text-indigo-800';
    }
  }

  iconClass(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill text-emerald-500';
      case 'error':
        return 'bi-exclamation-circle-fill text-rose-500';
      default:
        return 'bi-info-circle-fill text-indigo-500';
    }
  }
}
