export interface PasswordStrength {
  label: string;
  percent: number;
  barClass: string;
  textClass: string;
}

export function computePasswordStrength(password: string): PasswordStrength | null {
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
