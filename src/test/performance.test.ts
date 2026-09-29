import { describe, expect, it } from 'vitest';
import { summarizeAnalytics } from '../services/analyticsService';
import { filterTransactions, sortTransactions } from '../services/filterService';
import type { Account, Transaction } from '../domain/models';

const account: Account = { id: 'a', name: 'Main', type: 'bank', currency: 'INR', openingBalanceMinor: 0, active: true, createdAt: '', updatedAt: '' };
const records: Transaction[] = Array.from({ length: 5000 }, (_, index) => ({ id: `t-${index}`, accountId: 'a', amountMinor: (index % 100 + 1) * 100, currency: 'INR', type: index % 5 === 0 ? 'income' : 'expense', merchant: `Merchant ${index % 50}`, notes: '', tags: [], date: `2026-09-${String(index % 28 + 1).padStart(2, '0')}`, createdAt: '', updatedAt: '' }));

describe('large transaction dataset', () => {
  it('filters, sorts, and summarizes 5000 records within a practical test budget', () => { const start = performance.now(); const filtered = filterTransactions(records, { minAmountMinor: 5000 }); const sorted = sortTransactions(filtered, 'highest'); const summary = summarizeAnalytics(records, [account], []); const elapsed = performance.now() - start; expect(filtered.length).toBeGreaterThan(0); expect(sorted[0].amountMinor).toBeGreaterThanOrEqual(sorted.at(-1)!.amountMinor); expect(summary.expenseMinor).toBeGreaterThan(0); expect(elapsed).toBeLessThan(1000); });
});
