import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ settings: undefined as { id: 'preferences'; primaryCurrency: 'INR' | 'USD' | 'EUR' | 'GBP'; financialYearStartMonth: number; dateFormat: 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd'; theme: 'light' | 'dark' | 'system'; hideBalances: boolean; privacyMode: boolean; updatedAt: string } | undefined }));
const databaseMock = vi.hoisted(() => ({
  settings: { get: vi.fn(async () => state.settings), put: vi.fn(async (value: typeof state.settings) => { state.settings = value; }) },
  accounts: { toArray: vi.fn(async () => []) },
  categories: { toArray: vi.fn(async () => []) },
  transactions: { toArray: vi.fn(async () => []) },
  transaction: vi.fn(async (_mode: string, _a: unknown, _c: unknown, _t: unknown, _s: unknown, callback: () => Promise<void>) => callback())
}));
vi.mock('../db/database', () => ({ database: databaseMock }));

import { settingsService } from '../services/settingsService';

describe('settings persistence', () => {
  beforeEach(() => { state.settings = undefined; });
  it('creates defaults and persists currency and balance privacy preferences', async () => {
    const initial = await settingsService.get();
    expect(initial.primaryCurrency).toBe('INR');
    const updated = await settingsService.update({ primaryCurrency: 'USD', hideBalances: true, theme: 'dark' });
    expect(updated.primaryCurrency).toBe('USD');
    expect(updated.hideBalances).toBe(true);
    expect((await settingsService.get()).theme).toBe('dark');
  });

  it('rejects an invalid financial year month', async () => {
    await expect(settingsService.update({ financialYearStartMonth: 13 })).rejects.toThrow('invalid');
  });
});
