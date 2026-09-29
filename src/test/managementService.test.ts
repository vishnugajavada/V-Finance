import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Category } from '../domain/models';

const state = vi.hoisted(() => ({ accounts: new Map<string, Account>(), categories: new Map<string, Category>(), transactions: new Map<string, { id: string; accountId: string; categoryId?: string; transferAccountId?: string }>() }));
function whereFor<T>(source: Map<string, T>, field: string) {
  return { equals: (value: string) => ({ count: async () => [...source.values()].filter((item) => (item as Record<string, unknown>)[field] === value).length, delete: async () => { for (const [key, item] of source) if ((item as Record<string, unknown>)[field] === value) source.delete(key); } }) };
}
const databaseMock = vi.hoisted(() => ({
  accounts: { get: vi.fn(async (id: string) => state.accounts.get(id)), add: vi.fn(async (item: Account) => { state.accounts.set(item.id, item); }), put: vi.fn(async (item: Account) => { state.accounts.set(item.id, item); }), delete: vi.fn(async (id: string) => { state.accounts.delete(id); }), toArray: vi.fn(async () => [...state.accounts.values()]), where: vi.fn((field: keyof Account) => whereFor(state.accounts, field)) },
  categories: { get: vi.fn(async (id: string) => state.categories.get(id)), add: vi.fn(async (item: Category) => { state.categories.set(item.id, item); }), put: vi.fn(async (item: Category) => { state.categories.set(item.id, item); }), delete: vi.fn(async (id: string) => { state.categories.delete(id); }), toArray: vi.fn(async () => [...state.categories.values()]), where: vi.fn((field: keyof Category) => whereFor(state.categories, field)) },
  transactions: { where: vi.fn((field: 'accountId' | 'categoryId' | 'transferAccountId') => whereFor(state.transactions, field)), count: vi.fn(async () => state.transactions.size) },
  transaction: vi.fn(async (_mode: string, _accounts: unknown, _categories: unknown, callback: () => Promise<void>) => callback())
}));
vi.mock('../db/database', () => ({ database: databaseMock }));

import { accountService } from '../services/accountService';
import { categoryService } from '../services/categoryService';

describe('account and category management', () => {
  beforeEach(() => { state.accounts.clear(); state.categories.clear(); state.transactions.clear(); });

  it('creates, edits, and deactivates an account', async () => {
    const account = await accountService.create({ name: 'Savings', type: 'bank', currency: 'INR', openingBalanceMinor: 10000 });
    expect(account.name).toBe('Savings');
    const updated = await accountService.update(account.id, { name: 'Main savings' });
    expect(updated.name).toBe('Main savings');
    await accountService.deactivate(account.id);
    expect((await accountService.list(true))[0].active).toBe(false);
  });

  it('blocks deleting an account referenced by a transaction', async () => {
    const account = await accountService.create({ name: 'Cash', type: 'cash', currency: 'INR', openingBalanceMinor: 0 });
    state.transactions.set('t1', { id: 't1', accountId: account.id });
    await expect(accountService.remove(account.id)).rejects.toThrow('deactivate');
  });

  it('creates, edits, and safely deactivates a category', async () => {
    const category = await categoryService.create({ name: 'Food', icon: 'utensils', color: '#e76f51' });
    const updated = await categoryService.update(category.id, { name: 'Dining' });
    expect(updated.name).toBe('Dining');
    state.transactions.set('t1', { id: 't1', accountId: 'a1', categoryId: category.id });
    await expect(categoryService.remove(category.id)).rejects.toThrow('reassign');
    await categoryService.deactivate(category.id);
    expect((await categoryService.list(true))[0].active).toBe(false);
  });

  it('supports parent categories and rejects self-parenting', async () => {
    const parent = await categoryService.create({ name: 'Travel', icon: 'car', color: '#2a9d8f' });
    const child = await categoryService.create({ name: 'Fuel', parentId: parent.id, icon: 'fuel', color: '#457b9d' });
    expect(child.parentId).toBe(parent.id);
    await expect(categoryService.update(parent.id, { parentId: parent.id })).rejects.toThrow('own parent');
  });
});
