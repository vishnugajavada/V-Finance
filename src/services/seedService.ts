import { database } from '../db/database';
import type { Account, Category } from '../domain/models';

export async function ensureStarterData(): Promise<void> {
  if (await database.accounts.count()) return;
  const now = new Date().toISOString();
  const accounts: Account[] = [
    { id: crypto.randomUUID(), name: 'Main account', type: 'bank', currency: 'INR', openingBalanceMinor: 0, active: true, createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), name: 'Cash wallet', type: 'cash', currency: 'INR', openingBalanceMinor: 0, active: true, createdAt: now, updatedAt: now }
  ];
  const categories: Category[] = [
    { id: crypto.randomUUID(), name: 'Food', color: '#e76f51', icon: 'utensils', active: true },
    { id: crypto.randomUUID(), name: 'Transport', color: '#2a9d8f', icon: 'car', active: true },
    { id: crypto.randomUUID(), name: 'Bills', color: '#457b9d', icon: 'receipt', active: true },
    { id: crypto.randomUUID(), name: 'Shopping', color: '#e9c46a', icon: 'shopping-bag', active: true },
    { id: crypto.randomUUID(), name: 'Salary', color: '#2a9d8f', icon: 'wallet', active: true },
    { id: crypto.randomUUID(), name: 'Freelance', color: '#457b9d', icon: 'briefcase', active: true },
    { id: crypto.randomUUID(), name: 'Interest', color: '#e9c46a', icon: 'percent', active: true },
    { id: crypto.randomUUID(), name: 'Other income', color: '#8ab17d', icon: 'plus-circle', active: true }
  ];
    await database.transaction('rw', database.accounts, database.categories, async () => {
      if ((await database.accounts.count()) === 0) await database.accounts.bulkAdd(accounts);
      if ((await database.categories.count()) === 0) await database.categories.bulkAdd(categories);
    });
}
