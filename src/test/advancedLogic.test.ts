import { describe, expect, it } from 'vitest';
import { amortizationSchedule, investmentReturn } from '../services/financialServices';
import { filterTransactions, sortTransactions } from '../services/filterService';
import { forecastMonth, healthScore } from '../services/insightService';
import type { Account, Transaction } from '../domain/models';

const transaction = (id: string, amountMinor: number, date: string, type: Transaction['type'] = 'expense'): Transaction => ({ id, accountId: 'a', amountMinor, currency: 'INR', type, merchant: id, notes: '', tags: [], date, createdAt: date, updatedAt: date });
const account: Account = { id: 'base', name: 'Base', type: 'bank', currency: 'INR', openingBalanceMinor: 0, active: true, createdAt: '', updatedAt: '' };
describe('advanced financial logic', () => {
  it('amortizes zero-interest loans and adjusts the final principal', () => { const rows = amortizationSchedule(10000, 0, 3, '2026-01-01'); expect(rows.map((row) => row.principalMinor)).toEqual([3333, 3333, 3334]); expect(rows.at(-1)?.remainingPrincipalMinor).toBe(0); });
  it('calculates investment gain and percentage', () => { expect(investmentReturn({ id: 'i', name: 'Fund', type: 'mutual-fund', units: 1, purchasePriceMinor: 10000, investedMinor: 10000, currentValueMinor: 12500, currency: 'INR', date: '2026-01-01', createdAt: '', updatedAt: '' })).toEqual({ gainMinor: 2500, gainPercent: 0.25 }); });
  it('combines filters and does not mutate sorting input', () => { const items = [transaction('a', 1000, '2026-09-01'), transaction('b', 3000, '2026-09-02')]; const filtered = filterTransactions(items, { minAmountMinor: 2000 }); expect(filtered.map((item) => item.id)).toEqual(['b']); expect(sortTransactions(items, 'highest').map((item) => item.id)).toEqual(['b', 'a']); expect(items[0].id).toBe('a'); });
  it('handles insufficient forecast data and scores savings transparently', () => { expect(forecastMonth([transaction('a', 1000, '2026-09-01')], 10000, new Date('2026-09-02')).reliable).toBe(false); expect(healthScore([transaction('income', 10000, '2026-09-01', 'income'), transaction('expense', 1000, '2026-09-01')], []).score).toBeGreaterThan(0); });
});
import { calculateNetWorth } from '../services/financialServices';
import { parseCsvMatrix } from '../services/csvService';

describe('data safety extensions', () => {
  it('treats credit-card debt as a liability in net worth', () => {
    const bank: Account = { ...account, id: 'bank', name: 'Bank' };
    const card: Account = { ...account, id: 'card', name: 'Card', type: 'credit-card', creditLimitMinor: 100000 };
    const tx = [transaction('card-expense', 20000, '2026-09-11') as Transaction]; tx[0].accountId = 'card';
    const result = calculateNetWorth([bank, card], tx, [], []);
    expect(result.assetsMinor).toBe(0);
    expect(result.liabilitiesMinor).toBe(20000);
    expect(result.netWorthMinor).toBe(-20000);
  });
  it('parses quoted CSV fields containing commas', () => {
    expect(parseCsvMatrix('Date,Merchant,Amount\n2026-09-11,"Store, Hyderabad",450').at(1)?.[1]).toBe('Store, Hyderabad');
  });
});
