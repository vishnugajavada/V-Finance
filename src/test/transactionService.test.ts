import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Category, Transaction } from '../domain/models';
import { calculateTotals } from '../domain/calculations';

const state = vi.hoisted(() => ({ accounts: new Map<string, Account>(), categories: new Map<string, Category>(), transactions: new Map<string, Transaction>(), attachments: new Map<string, { id: string; transactionId: string }>() }));
function query(field: keyof Transaction, value: string) { const matches = () => [...state.transactions.values()].filter((item) => item[field] === value); return { first: async () => matches()[0], delete: async () => { for (const item of matches()) state.transactions.delete(item.id); }, and: (predicate: (item: Transaction) => boolean) => ({ first: async () => matches().find(predicate) }) }; }
const databaseMock = vi.hoisted(() => ({
  accounts: { get: vi.fn(async (id: string) => state.accounts.get(id)) },
  categories: { get: vi.fn(async (id: string) => state.categories.get(id)) },
  attachments: { where: vi.fn((_field: string) => ({ equals: (transactionId: string) => ({ delete: async () => { for (const [id, attachment] of state.attachments) if (attachment.transactionId === transactionId) state.attachments.delete(id); } }) })) },
  transactions: { add: vi.fn(async (item: Transaction) => { state.transactions.set(item.id, item); }), bulkAdd: vi.fn(async (items: Transaction[]) => { items.forEach((item) => state.transactions.set(item.id, item)); }), get: vi.fn(async (id: string) => state.transactions.get(id)), put: vi.fn(async (item: Transaction) => { state.transactions.set(item.id, item); }), delete: vi.fn(async (id: string) => { state.transactions.delete(id); }), where: vi.fn((field: keyof Transaction) => ({ equals: (value: string) => query(field, value) })) },
  transaction: vi.fn(async (_mode: string, ...tablesAndCallback: unknown[]) => (tablesAndCallback.at(-1) as () => Promise<void>)())
}));
vi.mock('../db/database', () => ({ database: databaseMock }));

import { transactionService } from '../services/transactionService';

const account = (id: string): Account => ({ id, name: id, type: 'bank', currency: 'INR', openingBalanceMinor: 0, active: true, createdAt: '', updatedAt: '' });
const category: Category = { id: 'food', name: 'Food', color: '#e76f51', icon: 'utensils', active: true };
const input = (type: Transaction['type']) => ({ accountId: 'a1', amountMinor: 45000, currency: 'INR' as const, type, transferAccountId: type === 'transfer' ? 'a2' : undefined, categoryId: type === 'transfer' ? undefined : 'food', merchant: 'Test', date: '2026-09-11' });

describe('transaction service', () => {
  beforeEach(() => { state.accounts.clear(); state.categories.clear(); state.transactions.clear(); state.attachments.clear(); state.accounts.set('a1', account('a1')); state.accounts.set('a2', account('a2')); state.categories.set(category.id, category); });
  it('creates expenses and income and rejects invalid references', async () => { await transactionService.create(input('expense')); await transactionService.create(input('income')); expect(state.transactions.size).toBe(2); await expect(transactionService.create({ ...input('expense'), amountMinor: 0 })).rejects.toThrow('greater than zero'); await expect(transactionService.create({ ...input('expense'), accountId: 'missing' })).rejects.toThrow('Account not found'); await expect(transactionService.create({ ...input('expense'), categoryId: 'missing' })).rejects.toThrow('Category not found'); });
  it('creates transfers as two ledger entries and excludes them from totals', async () => { const created = await transactionService.create(input('transfer')); expect(state.transactions.size).toBe(2); expect(created.transferDirection).toBe('out'); expect([...state.transactions.values()].some((item) => item.transferDirection === 'in')).toBe(true); });
  it('edits and deletes an expense', async () => { const created = await transactionService.create(input('expense')); await transactionService.update(created.id, { amountMinor: 50000, merchant: 'Updated' }); expect((await databaseMock.transactions.get(created.id))?.amountMinor).toBe(50000); await transactionService.remove(created.id); expect(state.transactions.size).toBe(0); });
  it('deletes attachments along with a deleted transaction', async () => { const created = await transactionService.create(input('expense')); state.attachments.set('file', { id: 'file', transactionId: created.id }); await transactionService.remove(created.id); expect(state.attachments.size).toBe(0); });
  it('edits and deletes both sides of a transfer', async () => { const created = await transactionService.create(input('transfer')); await transactionService.update(created.id, { amountMinor: 60000 }); expect([...state.transactions.values()].every((item) => item.amountMinor === 60000)).toBe(true); await transactionService.remove(created.id); expect(state.transactions.size).toBe(0); });
  it('duplicates a transfer as a new paired transfer', async () => { const created = await transactionService.create(input('transfer')); const duplicate = await transactionService.duplicate(created.id); expect(state.transactions.size).toBe(4); const duplicatePair = [...state.transactions.values()].find((item) => item.transferId === duplicate.transferId && item.id !== duplicate.id); expect(duplicatePair).toBeTruthy(); expect(duplicate.transferId).not.toBe(created.transferId); });
  it('rejects invalid transfers', async () => { await expect(transactionService.create({ ...input('transfer'), transferAccountId: 'a1' })).rejects.toThrow('different'); await expect(transactionService.create({ ...input('transfer'), transferAccountId: 'missing' })).rejects.toThrow('Destination account'); });
  it('rejects impossible calendar dates and currency mismatches', async () => { await expect(transactionService.create({ ...input('expense'), date: '2026-02-30' })).rejects.toThrow('date is invalid'); state.accounts.set('usd', { ...account('usd'), currency: 'USD' }); await expect(transactionService.create({ ...input('expense'), accountId: 'usd' })).rejects.toThrow('currency'); });
  it('runs the requested income, expense, transfer, edit, and delete ledger scenario', async () => {
    const main = { ...account('a1'), openingBalanceMinor: 5_000_000 };
    const savings = account('a2');
    state.accounts.set(main.id, main); state.accounts.set(savings.id, savings);
    const income = await transactionService.create({ ...input('income'), amountMinor: 4_000_000 });
    const expense = await transactionService.create({ ...input('expense'), amountMinor: 500_000 });
    await transactionService.create({ ...input('transfer'), amountMinor: 200_000 });
    const totals = () => calculateTotals([...state.transactions.values()], [main, savings]);
    expect(totals()).toEqual({ incomeMinor: 4_000_000, expenseMinor: 500_000, netMinor: 3_500_000, balanceMinor: 8_500_000 });
    expect(calculateTotals([...state.transactions.values()], [main]).balanceMinor).toBe(8_300_000);
    expect(calculateTotals([...state.transactions.values()], [savings]).balanceMinor).toBe(200_000);
    await transactionService.update(expense.id, { amountMinor: 600_000 });
    expect(totals()).toEqual({ incomeMinor: 4_000_000, expenseMinor: 600_000, netMinor: 3_400_000, balanceMinor: 8_400_000 });
    await transactionService.remove(expense.id);
    expect(totals()).toEqual({ incomeMinor: 4_000_000, expenseMinor: 0, netMinor: 4_000_000, balanceMinor: 9_000_000 });
    expect(calculateTotals([...state.transactions.values()], [main]).balanceMinor).toBe(8_800_000);
    expect(calculateTotals([...state.transactions.values()], [savings]).balanceMinor).toBe(200_000);
    expect([...state.transactions.values()].filter((item) => item.type === 'transfer')).toHaveLength(2);
  });
});
