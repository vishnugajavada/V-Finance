import type { CurrencyCode } from './models';

export const currencySymbols: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$', JPY: '¥', OTHER: ''
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in currencySymbols;
}

export function toMinorUnits(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0 || amount * 100 > Number.MAX_SAFE_INTEGER) throw new Error('Amount must be a non-negative safe finite number');
  const minor = Math.round(amount * 100);
  if (!Number.isSafeInteger(minor)) throw new Error('Amount exceeds the supported precision');
  return minor;
}

export function fromMinorUnits(amountMinor: number): number {
  return amountMinor / 100;
}

export function formatMoney(amountMinor: number, currency: CurrencyCode = 'INR'): string {
  if (currency === 'OTHER') return fromMinorUnits(amountMinor).toFixed(2);
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(fromMinorUnits(amountMinor));
}
