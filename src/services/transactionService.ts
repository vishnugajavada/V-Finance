import { database } from '../db/database';
import { isCurrencyCode } from '../domain/money';
import type { NewTransaction, Transaction } from '../domain/models';

function timestamp(): string { return new Date().toISOString(); }
function id(): string { return crypto.randomUUID(); }

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

async function validateInput(input: NewTransaction): Promise<void> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Transaction amount must be greater than zero and a safe integer in minor units');
  if (!isCurrencyCode(input.currency)) throw new Error('Unsupported currency');
  if (!validDate(input.date)) throw new Error('Transaction date is invalid');
  const account = await database.accounts.get(input.accountId);
  if (!account) throw new Error('Account not found');
  if (!account.active) throw new Error('Account is inactive');
  if (account.currency !== input.currency) throw new Error('Transaction currency must match the account currency');
  if (input.type !== 'transfer' && input.categoryId) {
    const category = await database.categories.get(input.categoryId);
    if (!category || !category.active) throw new Error('Category not found');
  }
  if (input.type === 'transfer') {
    if (!input.transferAccountId) throw new Error('Transfers require a destination account');
    if (input.transferAccountId === input.accountId) throw new Error('Transfer accounts must be different');
    const destination = await database.accounts.get(input.transferAccountId);
    if (!destination) throw new Error('Destination account not found');
    if (!destination.active) throw new Error('Destination account is inactive');
    if (destination.currency !== input.currency) throw new Error('Transfers require accounts with the same currency');
  }
}

export const transactionService = {
  async create(input: NewTransaction): Promise<Transaction> {
    await validateInput(input);
    const now = timestamp();
    const transaction: Transaction = { ...input, id: id(), notes: input.notes ?? '', tags: input.tags ?? [], createdAt: now, updatedAt: now };
    if (input.type !== 'transfer') {
      await database.transactions.add(transaction);
      return transaction;
    }
    const pairedTransaction: Transaction = {
      ...transaction,
      id: id(),
      transferId: transaction.id,
      accountId: input.transferAccountId!,
      transferAccountId: input.accountId,
      transferDirection: 'in'
    };
    transaction.transferId = transaction.id;
    transaction.transferDirection = 'out';
    await database.transaction('rw', database.transactions, async () => {
      await database.transactions.bulkAdd([transaction, pairedTransaction]);
    });
    return transaction;
  },

  async update(transactionId: string, changes: Partial<NewTransaction>): Promise<void> {
    let existing = await database.transactions.get(transactionId);
    if (!existing) throw new Error('Transaction not found');
    if (existing.type === 'transfer' && existing.transferDirection === 'in' && existing.transferId) {
      const outgoing = await database.transactions.where('transferId').equals(existing.transferId).and((item) => item.transferDirection === 'out').first();
      if (outgoing) { existing = outgoing; transactionId = outgoing.id; }
    }
    const next = { ...existing, ...changes, updatedAt: timestamp() };
    await validateInput(next);
    await database.transaction('rw', database.transactions, async () => {
      if (existing.type === 'transfer' && next.type !== 'transfer' && existing.transferId) {
        await database.transactions.where('transferId').equals(existing.transferId).delete();
        delete next.transferId;
        delete next.transferAccountId;
        delete next.transferDirection;
      }
      if (existing.type !== 'transfer' && next.type === 'transfer') {
        const transferId = next.transferId ?? transactionId;
        const paired: Transaction = { ...next, id: id(), transferId, accountId: next.transferAccountId!, transferAccountId: next.accountId, transferDirection: 'in' };
        next.transferId = transferId;
        next.transferDirection = 'out';
        await database.transactions.put(next);
        await database.transactions.add(paired);
        return;
      }
      await database.transactions.put(next);
      if (existing.type === 'transfer' && existing.transferId) {
        const paired = await database.transactions.where('transferId').equals(existing.transferId).and((item) => item.id !== transactionId).first();
        if (paired) await database.transactions.put({ ...paired, amountMinor: next.amountMinor, currency: next.currency, date: next.date, merchant: next.merchant, notes: next.notes, tags: next.tags, paymentMethod: next.paymentMethod, reference: next.reference, accountId: next.transferAccountId!, transferAccountId: next.accountId, updatedAt: next.updatedAt });
      }
    });
  },

  async remove(id: string): Promise<void> {
    const existing = await database.transactions.get(id);
    await database.transaction('rw', database.transactions, database.attachments, async () => {
      await database.attachments.where('transactionId').equals(id).delete();
      await database.transactions.delete(id);
      if (existing?.type === 'transfer' && existing.transferId) {
        const paired = await database.transactions.where('transferId').equals(existing.transferId).and((item) => item.id !== id).first();
        if (paired) await database.attachments.where('transactionId').equals(paired.id).delete();
        await database.transactions.where('transferId').equals(existing.transferId).delete();
      }
    });
  },

  async duplicate(transactionId: string): Promise<Transaction> {
    const existing = await database.transactions.get(transactionId);
    if (!existing) throw new Error('Transaction not found');
    const now = timestamp();
    if (existing.type !== 'transfer') {
      const duplicate: Transaction = { ...existing, id: id(), date: now.slice(0, 10), createdAt: now, updatedAt: now };
      await database.transactions.add(duplicate);
      return duplicate;
    }
    if (!existing.transferId || !existing.transferAccountId) throw new Error('Transfer pair is incomplete');
    const paired = await database.transactions.where('transferId').equals(existing.transferId).and((item) => item.id !== existing.id).first();
    if (!paired) throw new Error('Transfer pair is incomplete');
    const newTransferId = id();
    const duplicate: Transaction = { ...existing, id: id(), transferId: newTransferId, date: now.slice(0, 10), createdAt: now, updatedAt: now };
    const duplicatePair: Transaction = { ...paired, id: id(), transferId: newTransferId, date: now.slice(0, 10), createdAt: now, updatedAt: now };
    await database.transactions.bulkAdd([duplicate, duplicatePair]);
    return duplicate;
  }
};
