import { database } from '../db/database';
import type { Account, AppSettings, Attachment, Category, Transaction } from '../domain/models';
import { isCurrencyCode } from '../domain/money';

const defaultSettings: AppSettings = { id:'preferences', primaryCurrency:'INR', financialYearStartMonth:4, dateFormat:'dd/MM/yyyy', theme:'system', hideBalances:false, privacyMode:false, updatedAt:'' };
const timestamp=()=>new Date().toISOString();
function bytesToBase64(bytes: Uint8Array): string { let binary=''; const chunk=0x8000; for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk)); return btoa(binary); }
function base64ToBlob(value:string,mime:string):Blob { const binary=atob(value); const bytes=new Uint8Array(binary.length); for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i); return new Blob([bytes],{type:mime}); }
function validateBackup(value: unknown): asserts value is { format: string; version: number; data: Record<string, unknown> } {
 if (!value || typeof value !== 'object') throw new Error('Backup must be a JSON object');
 const backup = value as { format?: unknown; version?: unknown; data?: unknown };
 if (backup.format !== 'v-finance-backup' || !Number.isInteger(backup.version) || Number(backup.version) < 1 || Number(backup.version) > 2 || !backup.data || typeof backup.data !== 'object') throw new Error('Unsupported backup format or version');
 const data = backup.data as Record<string, unknown>;
 for (const key of ['accounts','categories','transactions']) if (!Array.isArray(data[key])) throw new Error(`Backup is missing ${key}`);
 const records = (key: string): Array<Record<string, unknown>> => {
  const value = data[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error(`Backup ${key} data is invalid`);
  return value as Array<Record<string, unknown>>;
 };
 const accounts = records('accounts'); const categories = records('categories'); const transactions = records('transactions');
 const ids = (items: Array<Record<string, unknown>>, label: string) => {
  const found = new Set<string>();
  for (const item of items) { if (typeof item.id !== 'string' || !item.id || found.has(item.id)) throw new Error(`Backup ${label} contains a missing or duplicate ID`); found.add(item.id); }
  return found;
 };
 const accountIds = ids(accounts, 'accounts'); const categoryIds = ids(categories, 'categories'); ids(transactions, 'transactions');
 const accountCurrencies = new Map(accounts.map((account) => [String(account.id), account.currency]));
 for (const account of accounts) if (typeof account.name !== 'string' || !account.name.trim() || !isCurrencyCode(String(account.currency)) || !Number.isSafeInteger(account.openingBalanceMinor)) throw new Error('Backup contains an invalid account');
 for (const category of categories) if (typeof category.name !== 'string' || !category.name.trim()) throw new Error('Backup contains an invalid category');
 const transferGroups = new Map<string, Transaction[]>();
 for (const transaction of transactions as unknown as Transaction[]) {
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) ? new Date(`${transaction.date}T00:00:00Z`) : undefined;
  if (!accountIds.has(transaction.accountId) || accountCurrencies.get(transaction.accountId) !== transaction.currency || !Number.isSafeInteger(transaction.amountMinor) || transaction.amountMinor <= 0 || !isCurrencyCode(transaction.currency) || !['income','expense','transfer'].includes(transaction.type) || !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== transaction.date || (transaction.categoryId && !categoryIds.has(transaction.categoryId))) throw new Error('Backup contains an invalid transaction or broken account/category reference');
  if (transaction.type === 'transfer') {
   if (!transaction.transferId || !transaction.transferAccountId || !accountIds.has(transaction.transferAccountId)) throw new Error('Backup contains an incomplete transfer');
   transferGroups.set(transaction.transferId, [...(transferGroups.get(transaction.transferId) ?? []), transaction]);
  }
 }
 for (const pair of transferGroups.values()) if (pair.length !== 2 || pair[0].amountMinor !== pair[1].amountMinor || pair[0].currency !== pair[1].currency || pair[0].accountId !== pair[1].transferAccountId || pair[1].accountId !== pair[0].transferAccountId || pair[0].transferDirection === pair[1].transferDirection) throw new Error('Backup contains an inconsistent transfer pair');
 if (data.attachments !== undefined && (!Array.isArray(data.attachments) || data.attachments.some((item) => !item || typeof item !== 'object' || typeof (item as Record<string, unknown>).data !== 'string' || typeof (item as Record<string, unknown>).mimeType !== 'string'))) throw new Error('Backup attachments are invalid');
 if (data.settings !== undefined && (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings))) throw new Error('Backup settings are invalid');
 for (const key of ['budgets','recurring','subscriptions','goals','loans','investments','trips','recurringAudit','netWorthSnapshots','creditCards','people','splits','attachments','importBatches']) records(key);
}

export const settingsService={
 async get():Promise<AppSettings>{const existing=await database.settings.get('preferences');if(existing)return existing;const settings={...defaultSettings,updatedAt:timestamp()};await database.settings.put(settings);return settings;},
 async update(changes:Partial<Omit<AppSettings,'id'|'updatedAt'>>):Promise<AppSettings>{const settings={...(await this.get()),...changes,updatedAt:timestamp()};if(settings.financialYearStartMonth<1||settings.financialYearStartMonth>12)throw new Error('Financial year month is invalid');await database.settings.put(settings);return settings;},
 async exportBackup():Promise<string>{const [accounts,categories,transactions,settings,budgets,recurring,subscriptions,goals,loans,investments,trips,recurringAudit,netWorthSnapshots,creditCards,people,splits,attachments,importBatches]=await Promise.all([database.accounts.toArray(),database.categories.toArray(),database.transactions.toArray(),this.get(),database.budgets.toArray(),database.recurring.toArray(),database.subscriptions.toArray(),database.goals.toArray(),database.loans.toArray(),database.investments.toArray(),database.trips.toArray(),database.recurringAudit.toArray(),database.netWorthSnapshots.toArray(),database.creditCards.toArray(),database.people.toArray(),database.splits.toArray(),database.attachments.toArray(),database.importBatches.toArray()]); const attachmentData=await Promise.all(attachments.map(async(a)=>({...a,data:bytesToBase64(new Uint8Array(await a.data.arrayBuffer()))}))); return JSON.stringify({format:'v-finance-backup',version:2,exportedAt:timestamp(),data:{accounts,categories,transactions,settings,budgets,recurring,subscriptions,goals,loans,investments,trips,recurringAudit,netWorthSnapshots,creditCards,people,splits,attachments:attachmentData,importBatches}},null,2);},
 async importBackup(serialized:string):Promise<void>{let backup:unknown;try{backup=JSON.parse(serialized);}catch{throw new Error('Backup is not valid JSON');}validateBackup(backup);const d=backup.data as any;const stores=[database.accounts,database.categories,database.transactions,database.settings,database.budgets,database.recurring,database.subscriptions,database.goals,database.loans,database.investments,database.trips,database.recurringAudit,database.netWorthSnapshots,database.creditCards,database.people,database.splits,database.attachments,database.importBatches];await (database.transaction as any)('rw',...stores,async()=>{for(const store of stores)await store.clear();await database.accounts.bulkAdd(d.accounts);await database.categories.bulkAdd(d.categories);await database.transactions.bulkAdd((d.transactions as Transaction[]).map((item)=>({...item,notes:item.notes??'',tags:item.tags??[]})));if(d.settings)await database.settings.put(d.settings);if(Array.isArray(d.budgets))await database.budgets.bulkAdd(d.budgets);if(Array.isArray(d.recurring))await database.recurring.bulkAdd(d.recurring);if(Array.isArray(d.subscriptions))await database.subscriptions.bulkAdd(d.subscriptions);if(Array.isArray(d.goals))await database.goals.bulkAdd(d.goals);if(Array.isArray(d.loans))await database.loans.bulkAdd(d.loans);if(Array.isArray(d.investments))await database.investments.bulkAdd(d.investments);if(Array.isArray(d.trips))await database.trips.bulkAdd(d.trips);if(Array.isArray(d.recurringAudit))await database.recurringAudit.bulkAdd(d.recurringAudit);if(Array.isArray(d.netWorthSnapshots))await database.netWorthSnapshots.bulkAdd(d.netWorthSnapshots);if(Array.isArray(d.creditCards))await database.creditCards.bulkAdd(d.creditCards);if(Array.isArray(d.people))await database.people.bulkAdd(d.people);if(Array.isArray(d.splits))await database.splits.bulkAdd(d.splits);if(Array.isArray(d.importBatches))await database.importBatches.bulkAdd(d.importBatches);if(Array.isArray(d.attachments))await database.attachments.bulkAdd((d.attachments as any[]).map((a)=>({...a,data:base64ToBlob(a.data,a.mimeType)})));});},
 async clearAllData():Promise<void>{const stores=[database.accounts,database.categories,database.transactions,database.settings,database.budgets,database.recurring,database.subscriptions,database.goals,database.loans,database.investments,database.trips,database.recurringAudit,database.netWorthSnapshots,database.creditCards,database.people,database.splits,database.attachments,database.importBatches];await (database.transaction as any)('rw',...stores,async()=>{for(const store of stores)await store.clear();});}
};
export { defaultSettings };
