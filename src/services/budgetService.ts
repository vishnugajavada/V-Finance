import { database } from '../db/database';
import type { Budget, BudgetPeriod, CurrencyCode } from '../domain/models';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export interface BudgetInput {
  name: string;
  amountMinor: number;
  currency: CurrencyCode;
  categoryId?: string;
  startDate: string;
  endDate: string;
  period: BudgetPeriod;
  rollover: boolean;
}

function validate(input: BudgetInput): void {
  if (!input.name.trim()) throw new Error('Budget name is required');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Budget amount must be a positive safe integer in minor units');
  if (input.startDate > input.endDate) throw new Error('Budget dates are invalid');
}

export const budgetService = {
  async list(): Promise<Budget[]> { return database.budgets.orderBy('startDate').reverse().toArray(); },
  async create(input: BudgetInput): Promise<Budget> { validate(input); const timestamp = now(); const budget: Budget = { ...input, id: id(), active: true, createdAt: timestamp, updatedAt: timestamp }; await database.budgets.add(budget); return budget; },
  async update(budgetId: string, changes: Partial<BudgetInput>): Promise<void> { const existing = await database.budgets.get(budgetId); if (!existing) throw new Error('Budget not found'); const next = { ...existing, ...changes, updatedAt: now() }; validate(next); await database.budgets.put(next); },
  async remove(budgetId: string): Promise<void> { await database.budgets.delete(budgetId); },
  async duplicate(budgetId: string): Promise<Budget> { const existing = await database.budgets.get(budgetId); if (!existing) throw new Error('Budget not found'); const duplicate = { ...existing, id: id(), name: `${existing.name} copy`, createdAt: now(), updatedAt: now() }; await database.budgets.add(duplicate); return duplicate; },
  async setActive(budgetId: string, active: boolean): Promise<void> { const existing = await database.budgets.get(budgetId); if (!existing) throw new Error('Budget not found'); await database.budgets.put({ ...existing, active, updatedAt: now() }); }
};
