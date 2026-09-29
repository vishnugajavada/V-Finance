import { database } from '../db/database';
import type { ImportBatch, NewTransaction } from '../domain/models';
import { transactionService } from './transactionService';
const id = () => crypto.randomUUID(); const now = () => new Date().toISOString();
export const importService = {
  async createBatch(fileName: string, kind: ImportBatch['kind']): Promise<ImportBatch> { const batch = { id: id(), fileName, kind, createdAt: now(), transactionIds: [], status: 'active' as const }; await database.importBatches.add(batch); return batch; },
  async importTransactions(batchId: string, inputs: NewTransaction[]): Promise<number> {
    return database.transaction('rw', database.accounts, database.categories, database.transactions, database.importBatches, async () => {
      const batch = await database.importBatches.get(batchId);
      if (!batch || batch.status !== 'active') throw new Error('Import batch is not active');
      const ids: string[] = [];
      for (const input of inputs) {
        const transaction = await transactionService.create({ ...input, importBatchId: batchId });
        ids.push(transaction.id);
      }
      await database.importBatches.put({ ...batch, transactionIds: [...batch.transactionIds, ...ids] });
      return ids.length;
    });
  },
  async list(): Promise<ImportBatch[]> { return database.importBatches.orderBy('createdAt').reverse().toArray(); },
  async revert(batchId: string): Promise<void> { const batch = await database.importBatches.get(batchId); if (!batch || batch.status === 'reverted') return; await database.transaction('rw', database.transactions, database.importBatches, async () => { for (const transactionId of batch.transactionIds) { const transaction = await database.transactions.get(transactionId); if (transaction?.type === 'transfer' && transaction.transferId) await database.transactions.where('transferId').equals(transaction.transferId).delete(); else await database.transactions.delete(transactionId); } await database.importBatches.put({ ...batch, status: 'reverted' }); }); }
};
