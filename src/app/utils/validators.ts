import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

// Pasted or autofilled emails often carry a leading or trailing space, which Validators.email rejects.
// This checks the trimmed value instead; the caller is responsible for trimming before sending it.
export function trimmedEmail(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return { required: true };
  }
  return Validators.email({ value } as AbstractControl);
}
