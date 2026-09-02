import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Very light E.164-ish normalisation focused on French numbers. */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith('0')) return `+33${digits.slice(1)}`;
  if (digits.length === 9) return `+33${digits}`;
  return digits;
}

const EMAIL_RE = /^[^\s@,;<>()[\]\\]+@[^\s@.,;<>()[\]\\]+(\.[^\s@.,;<>()[\]\\]+)+$/;
export function isSyntacticallyValidEmail(email: string): boolean {
  const e = email.trim();
  return e.length >= 5 && e.length <= 254 && EMAIL_RE.test(e);
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'page';
}

export function pct(numerator: number, denominator: number, digits = 1): number {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(digits));
}

export function formatNumber(n: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function formatPercent(n: number, locale = 'fr-FR', digits = 1): string {
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(n)} %`;
}

export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function daysAgo(n: number): Date {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

export function ageFromBirthDate(d: Date | null | undefined): number | null {
  if (!d) return null;
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.2425 * 24 * 3600 * 1000));
  return age >= 0 && age < 130 ? age : null;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Escapes text for safe interpolation into HTML. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
