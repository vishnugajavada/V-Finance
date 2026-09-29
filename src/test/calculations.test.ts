import { describe, expect, it } from 'vitest';
import { calculateTotals, calculateTotalsByCurrency } from '../domain/calculations';
import type { Account, Transaction } from '../domain/models';

const account: Account = { id: 'a1', name: 'Bank', type: 'bank', currency: 'INR', openingBalanceMinor: 100000, active: true, createdAt: '', updatedAt: '' };
const transaction = (type: Transaction['type'], amountMinor: number, accountId = 'a1'): Transaction => ({ id: crypto.randomUUID(), accountId, amountMinor, currency: 'INR', type, merchant: '', notes: '', tags: [], date: '2026-09-11', createdAt: '', updatedAt: '' });

describe('financial calculations', () => {
  it('calculates income, expenses, net savings, and balance in minor units', () => {
    const result = calculateTotals([transaction('income', 25000), transaction('expense', 1250)], [account]);
    expect(result).toEqual({ incomeMinor: 25000, expenseMinor: 1250, netMinor: 23750, balanceMinor: 123750 });
  });

  it('does not count transfers as income or expense', () => {
    const result = calculateTotals([{ ...transaction('transfer', 5000), transferDirection: 'out' }], [account]);
    expect(result.incomeMinor).toBe(0);
    expect(result.expenseMinor).toBe(0);
    expect(result.balanceMinor).toBe(95000);
  });

  it('keeps the final financial-integrity scenario balanced after edits and deletion', () => {
    const accountA: Account = { ...account, openingBalanceMinor: 5_000_000 };
    const accountB: Account = { ...account, id: 'a2', name: 'Wallet', openingBalanceMinor: 0 };
    const income = transaction('income', 4_000_000);
    const transferOut = { ...transaction('transfer', 200_000), transferDirection: 'out' as const };
    const transferIn = { ...transaction('transfer', 200_000, 'a2'), transferDirection: 'in' as const };
    const expense = transaction('expense', 500_000);
    expect(calculateTotals([income, expense, transferOut, transferIn], [accountA, accountB])).toEqual({ incomeMinor: 4_000_000, expenseMinor: 500_000, netMinor: 3_500_000, balanceMinor: 8_500_000 });
    expect(calculateTotals([income, { ...expense, amountMinor: 600_000 }, transferOut, transferIn], [accountA, accountB]).expenseMinor).toBe(600_000);
    expect(calculateTotals([income, transferOut, transferIn], [accountA, accountB])).toEqual({ incomeMinor: 4_000_000, expenseMinor: 0, netMinor: 4_000_000, balanceMinor: 9_000_000 });
  });

  it('groups, rather than adds, balances in different currencies', () => {
    const usd: Account = { ...account, id: 'usd', currency: 'USD', openingBalanceMinor: 10_000 };
    const grouped = calculateTotalsByCurrency([transaction('income', 5_000), { ...transaction('income', 2_500, 'usd'), currency: 'USD' }], [account, usd]);
    expect(grouped.INR?.balanceMinor).toBe(105_000);
    expect(grouped.USD?.balanceMinor).toBe(12_500);
  });
});
