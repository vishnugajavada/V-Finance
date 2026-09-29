import { describe, expect, it } from 'vitest';
import { summarizeAnalytics } from '../services/analyticsService';
import { parseNaturalLanguage } from '../services/naturalLanguageService';
import { nextOccurrence } from '../services/recurringService';
import type { Account, Category, Transaction } from '../domain/models';

const account: Account = { id: 'a', name: 'HDFC Savings', type: 'bank', currency: 'INR', openingBalanceMinor: 0, active: true, createdAt: '', updatedAt: '' };
const category: Category = { id: 'food', name: 'Food', icon: 'tag', color: '#e76f51', active: true };
const transaction = (type: Transaction['type'], amountMinor: number): Transaction => ({ id: crypto.randomUUID(), accountId: 'a', amountMinor, currency: 'INR', type, categoryId: type === 'transfer' ? undefined : 'food', merchant: 'Swiggy', notes: 'dinner', tags: ['work'], date: '2026-09-11', createdAt: '', updatedAt: '' });

describe('feature logic', () => {
  it('parses deterministic natural language entries', () => { const result = parseNaturalLanguage('450 swiggy dinner', [account], [category]); expect(result.amountMinor).toBe(45000); expect(result.merchant).toBe('swiggy'); expect(result.notes).toBe('dinner'); });
  it('calculates analytics without counting transfers as expenses', () => { const result = summarizeAnalytics([transaction('income', 100000), transaction('expense', 25000), transaction('transfer', 50000)], [account], [category]); expect(result.incomeMinor).toBe(100000); expect(result.expenseMinor).toBe(25000); expect(result.byCategory[0].amountMinor).toBe(25000); });
  it('advances recurring dates without month-end drift', () => { expect(nextOccurrence('2026-01-31', 'monthly')).toBe('2026-02-28'); expect(nextOccurrence('2024-01-31', 'monthly')).toBe('2024-02-29'); expect(nextOccurrence('2026-09-11', 'weekly')).toBe('2026-09-18'); });
});
