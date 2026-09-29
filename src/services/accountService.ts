import { database } from '../db/database';
import { isCurrencyCode } from '../domain/money';
import type { Account, AccountType, CurrencyCode } from '../domain/models';

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

export interface AccountInput {
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalanceMinor: number;
  creditLimitMinor?: number;
}

function validate(input: AccountInput): void {
  if (!input.name.trim()) throw new Error('Account name is required');
  if (!isCurrencyCode(input.currency)) throw new Error('Unsupported currency');
  if (!Number.isSafeInteger(input.openingBalanceMinor)) throw new Error('Opening balance must be a safe integer in minor units');
  if (input.creditLimitMinor !== undefined && (!Number.isSafeInteger(input.creditLimitMinor) || input.creditLimitMinor < 0)) throw new Error('Credit limit must be a safe integer zero or greater');
}

export const accountService = {
  async list(includeInactive = false): Promise<Account[]> {
    const accounts = await database.accounts.toArray();
    return includeInactive ? accounts : accounts.filter((account) => account.active);
  },

  async create(input: AccountInput): Promise<Account> {
    validate(input);
    const timestamp = now();
    const account: Account = { ...input, id: newId(), active: true, createdAt: timestamp, updatedAt: timestamp };
    await database.accounts.add(account);
    return account;
  },

  async update(id: string, changes: Partial<AccountInput>): Promise<Account> {
    const existing = await database.accounts.get(id);
    if (!existing) throw new Error('Account not found');
    const next = { ...existing, ...changes, updatedAt: now() };
    validate(next);
    await database.accounts.put(next);
    return next;
  },

  async deactivate(id: string): Promise<void> {
    const account = await database.accounts.get(id);
    if (!account) throw new Error('Account not found');
    await database.accounts.put({ ...account, active: false, updatedAt: now() });
  },

  async remove(id: string): Promise<void> {
    const account = await database.accounts.get(id);
    if (!account) throw new Error('Account not found');
    const transactionCount = await database.transactions.where('accountId').equals(id).count();
    const incomingTransferCount = await database.transactions.where('transferAccountId').equals(id).count();
    if (transactionCount > 0 || incomingTransferCount > 0) throw new Error('Account has transaction history; deactivate it instead');
    await database.accounts.delete(id);
  },

  fromMajorUnits(input: Omit<AccountInput, 'openingBalanceMinor' | 'creditLimitMinor'> & { openingBalance: number; creditLimit?: number }): AccountInput {
    return { ...input, openingBalanceMinor: Math.round(input.openingBalance * 100), creditLimitMinor: input.creditLimit === undefined ? undefined : Math.round(input.creditLimit * 100) };
  }
};
