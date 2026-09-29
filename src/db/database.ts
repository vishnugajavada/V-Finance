import Dexie, { type Table } from 'dexie';
import type { Account, AppSettings, Attachment, Budget, Category, CreditCardProfile, ImportBatch, Investment, Loan, NetWorthSnapshot, Person, RecurringAudit, RecurringTransaction, SavingsGoal, SplitShare, Subscription, Transaction, Trip } from '../domain/models';

export class VFinanceDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  settings!: Table<AppSettings, string>;
  budgets!: Table<Budget, string>;
  recurring!: Table<RecurringTransaction, string>;
  subscriptions!: Table<Subscription, string>;
  goals!: Table<SavingsGoal, string>;
  loans!: Table<Loan, string>;
  investments!: Table<Investment, string>;
  trips!: Table<Trip, string>;
  recurringAudit!: Table<RecurringAudit, string>;
  netWorthSnapshots!: Table<NetWorthSnapshot, string>;
  creditCards!: Table<CreditCardProfile, string>;
  people!: Table<Person, string>;
  splits!: Table<SplitShare, string>;
  attachments!: Table<Attachment, string>;
  importBatches!: Table<ImportBatch, string>;

  constructor() {
    super('v-finance');
    this.version(1).stores({
      accounts: 'id, name, active',
      categories: 'id, parentId, active',
      transactions: 'id, accountId, type, date, categoryId, merchant, transferId'
    });
    this.version(2).stores({
      accounts: 'id, name, active',
      categories: 'id, parentId, active',
      transactions: 'id, accountId, type, date, categoryId, merchant, transferId, transferAccountId'
    });
    this.version(3).stores({
      accounts: 'id, name, active',
      categories: 'id, parentId, active',
      transactions: 'id, accountId, type, date, categoryId, merchant, transferId, transferAccountId',
      settings: 'id'
    });
    this.version(4).stores({
      accounts: 'id, name, active',
      categories: 'id, parentId, active',
      transactions: 'id, accountId, type, date, categoryId, merchant, transferId, transferAccountId, recurringId, reference, paymentMethod',
      settings: 'id',
      budgets: 'id, categoryId, startDate, endDate, active',
      recurring: 'id, accountId, nextOccurrence, active',
      subscriptions: 'id, billingDay, active'
    });
    this.version(5).stores({
      accounts: 'id, name, active', categories: 'id, parentId, active',
      transactions: 'id, accountId, type, date, categoryId, merchant, transferId, transferAccountId, recurringId, tripId, reference, paymentMethod', settings: 'id',
      budgets: 'id, categoryId, startDate, endDate, active', recurring: 'id, accountId, nextOccurrence, active', subscriptions: 'id, billingDay, active',
      goals: 'id, targetDate, active', loans: 'id, startDate, active', investments: 'id, date, type', trips: 'id, startDate, endDate, active'
    });
    this.version(6).stores({
      accounts: 'id, name, active', categories: 'id, parentId, active',
      transactions: 'id, accountId, type, date, categoryId, merchant, transferId, transferAccountId, recurringId, reference, paymentMethod', settings: 'id',
      budgets: 'id, categoryId, startDate, endDate, active', recurring: 'id, accountId, nextOccurrence, active', subscriptions: 'id, billingDay, active',
      goals: 'id, targetDate, active', loans: 'id, startDate, active', investments: 'id, date, type', trips: 'id, startDate, endDate, active'
    }).upgrade(async (transaction) => {
      await transaction.table('transactions').toCollection().modify((item: { notes?: string; tags?: string[] }) => { item.notes ??= ''; item.tags ??= []; });
    });
    this.version(7).stores({
      accounts: 'id, name, active', categories: 'id, parentId, active', transactions: 'id, accountId, type, date, categoryId, merchant, transferId, transferAccountId, recurringId, tripId, reference, paymentMethod', settings: 'id', budgets: 'id, categoryId, startDate, endDate, active', recurring: 'id, accountId, nextOccurrence, active', subscriptions: 'id, billingDay, active', goals: 'id, targetDate, active', loans: 'id, startDate, active', investments: 'id, date, type', trips: 'id, startDate, endDate, active',
      recurringAudit: 'id, recurringId, scheduledDate, [recurringId+scheduledDate], status', netWorthSnapshots: 'id, date', creditCards: 'accountId, dueDay', people: 'id, name', splits: 'id, transactionId, personId', attachments: 'id, transactionId, createdAt'
    });
    this.version(8).stores({ accounts: 'id, name, active', categories: 'id, parentId, active', transactions: 'id, accountId, type, date, categoryId, merchant, transferId, transferAccountId, recurringId, tripId, importBatchId, reference, paymentMethod', settings: 'id', budgets: 'id, categoryId, startDate, endDate, active', recurring: 'id, accountId, nextOccurrence, active', subscriptions: 'id, billingDay, active', goals: 'id, targetDate, active', loans: 'id, startDate, active', investments: 'id, date, type', trips: 'id, startDate, endDate, active', recurringAudit: 'id, recurringId, scheduledDate, [recurringId+scheduledDate], status', netWorthSnapshots: 'id, date', creditCards: 'accountId, dueDay', people: 'id, name', splits: 'id, transactionId, personId', attachments: 'id, transactionId, createdAt', importBatches: 'id, createdAt, kind, status' });
  }
}

export const database = new VFinanceDatabase();
