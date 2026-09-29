import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ accounts: [] as unknown[], categories: [] as unknown[] }));
const databaseMock = vi.hoisted(() => ({
  accounts: { count: vi.fn(async () => state.accounts.length), bulkAdd: vi.fn(async (items: unknown[]) => { state.accounts.push(...items); }) },
  categories: { count: vi.fn(async () => state.categories.length), bulkAdd: vi.fn(async (items: unknown[]) => { state.categories.push(...items); }) },
  transaction: vi.fn(async (_mode: string, _accounts: unknown, _categories: unknown, callback: () => Promise<void>) => callback())
}));
vi.mock('../db/database', () => ({ database: databaseMock }));

import { ensureStarterData } from '../services/seedService';

describe('starter data', () => {
  beforeEach(() => { state.accounts.length = 0; state.categories.length = 0; });
  it('does not duplicate defaults when initialized more than once', async () => {
    await ensureStarterData();
    await ensureStarterData();
    expect(state.accounts).toHaveLength(2);
    expect(state.categories).toHaveLength(8);
  });
});
