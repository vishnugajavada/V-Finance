import { database } from '../db/database';
import type { CurrencyCode, RecurrenceFrequency, RecurringTransaction } from '../domain/models';
import { transactionService } from './transactionService';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export interface RecurringInput { name: string; amountMinor: number; type: 'expense' | 'income'; accountId: string; categoryId?: string; currency: CurrencyCode; frequency: RecurrenceFrequency; interval: number; startDate: string; endDate?: string; nextOccurrence: string; notes: string; }
function validate(input: RecurringInput): void { if (!input.name.trim()) throw new Error('Recurring name is required'); if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Recurring amount must be a positive safe integer in minor units'); if (!Number.isSafeInteger(input.interval) || input.interval < 1) throw new Error('Recurring interval is invalid'); if (input.endDate && input.endDate < input.startDate) throw new Error('Recurring dates are invalid'); }
export function nextOccurrence(date: string, frequency: RecurrenceFrequency, interval = 1): string {
  const next = new Date(`${date}T00:00:00Z`);
  if (frequency === 'daily') next.setUTCDate(next.getUTCDate() + interval);
  if (frequency === 'weekly') next.setUTCDate(next.getUTCDate() + 7 * interval);
  if (frequency === 'monthly' || frequency === 'yearly') {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + (frequency === 'monthly' ? interval : 12 * interval));
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  }
  if (frequency === 'custom') next.setUTCDate(next.getUTCDate() + interval);
  return next.toISOString().slice(0, 10);
}
export const recurringService = { async list(): Promise<RecurringTransaction[]> { return database.recurring.orderBy('nextOccurrence').toArray(); }, async create(input: RecurringInput): Promise<RecurringTransaction> { validate(input); const timestamp = now(); const item: RecurringTransaction = { ...input, id: id(), active: true, createdAt: timestamp, updatedAt: timestamp }; await database.recurring.add(item); return item; }, async update(itemId: string, changes: Partial<RecurringInput>): Promise<void> { const existing = await database.recurring.get(itemId); if (!existing) throw new Error('Recurring transaction not found'); const next = { ...existing, ...changes, updatedAt: now() }; validate(next); await database.recurring.put(next); }, async setActive(itemId: string, active: boolean): Promise<void> { const existing = await database.recurring.get(itemId); if (!existing) throw new Error('Recurring transaction not found'); await database.recurring.put({ ...existing, active, updatedAt: now() }); }, async remove(itemId: string): Promise<void> { await database.recurring.delete(itemId); }, async generateDue(asOf = new Date().toISOString().slice(0, 10)): Promise<number> { const definitions = (await database.recurring.toArray()).filter((item) => item.active); let generated = 0; for (const item of definitions) { while (item.nextOccurrence <= asOf && (!item.endDate || item.nextOccurrence <= item.endDate)) { const existingAudit = await database.recurringAudit.where('[recurringId+scheduledDate]').equals([item.id, item.nextOccurrence]).first(); if (existingAudit?.status === 'generated') { item.nextOccurrence = nextOccurrence(item.nextOccurrence, item.frequency, item.interval); continue; } try { if (existingAudit) await database.recurringAudit.delete(existingAudit.id); const transaction = await transactionService.create({ accountId: item.accountId, amountMinor: item.amountMinor, currency: item.currency, type: item.type, categoryId: item.categoryId, merchant: item.name, notes: item.notes, recurringId: item.id, date: item.nextOccurrence }); await database.recurringAudit.add({ id: id(), recurringId: item.id, transactionId: transaction.id, scheduledDate: item.nextOccurrence, generatedAt: now(), status: 'generated' }); generated += 1; } catch (error) { if (existingAudit) await database.recurringAudit.put({ ...existingAudit, generatedAt: now(), status: 'failed', error: error instanceof Error ? error.message : 'Generation failed' }); else await database.recurringAudit.add({ id: id(), recurringId: item.id, scheduledDate: item.nextOccurrence, generatedAt: now(), status: 'failed', error: error instanceof Error ? error.message : 'Generation failed' }); break; } item.nextOccurrence = nextOccurrence(item.nextOccurrence, item.frequency, item.interval); } await database.recurring.put({ ...item, updatedAt: now() }); } return generated; } };
