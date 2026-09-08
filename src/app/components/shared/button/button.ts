import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ButtonVariant = 'primary' | 'outline' | 'icon' | 'icon-danger' | 'ghost';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
})
export class Button {
  @Input() type: 'button' | 'submit' = 'button';
  @Input() variant: ButtonVariant = 'primary';
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() ariaLabel: string | null = null;
  @Output() clicked = new EventEmitter<void>();

  readonly variantClasses: Record<ButtonVariant, string> = {
    primary: 'px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300',
    outline: 'px-4 py-2 border border-white text-white hover:bg-white hover:text-blue-600',
    icon: 'p-2 border border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-500',
    'icon-danger': 'p-2 border border-gray-300 text-gray-600 hover:border-red-500 hover:text-red-500',
    ghost: 'px-4 py-2 text-gray-700 hover:bg-gray-100',
  };

  onClick(): void {
    if (!this.disabled) {
      this.clicked.emit();
    }
  }
}
