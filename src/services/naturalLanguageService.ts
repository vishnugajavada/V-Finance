import type { Account, Category, CurrencyCode, NewTransaction, TransactionType } from '../domain/models';

export interface ParsedEntry { amountMinor: number; type: TransactionType; merchant: string; notes: string; currency: CurrencyCode; categoryId?: string; accountId?: string; transferAccountId?: string; }

export function parseNaturalLanguage(input: string, accounts: Account[], categories: Category[]): ParsedEntry {
  const text = input.trim();
  const amountMatch = text.match(/(?:^|\s)(\d[\d,]*(?:\.\d{1,2})?)/);
  if (!amountMatch) throw new Error('Enter an amount, for example “450 swiggy dinner”');
  const amountValue = Number(amountMatch[1].replaceAll(',', ''));
  const amountMinor = Math.round(amountValue * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error('Enter a valid amount greater than zero');
  const lower = text.toLocaleLowerCase();
  const isTransfer = /\b(?:transfer(?:red)?|send|move)\b/i.test(text);
  const isIncome = /\b(?:received|salary|income|got|credited|deposit(?:ed)?)\b/i.test(text);
  const type: TransactionType = isTransfer ? 'transfer' : isIncome ? 'income' : 'expense';

  if (isTransfer) {
    const route = text.match(/\bfrom\s+(.+?)\s+to\s+(.+?)\s*$/i);
    if (!route) throw new Error('For a transfer, include both accounts: “Transferred 2000 from Bank to Savings”');
    const source = accounts.find((account) => account.name.toLocaleLowerCase() === route[1].trim().toLocaleLowerCase());
    const destination = accounts.find((account) => account.name.toLocaleLowerCase() === route[2].trim().toLocaleLowerCase());
    if (!source || !destination) throw new Error('Transfer account names must match your accounts');
    if (source.id === destination.id) throw new Error('Transfer accounts must be different');
    if (source.currency !== destination.currency) throw new Error('Transfers require accounts with the same currency');
    return { amountMinor, type, merchant: `Transfer: ${source.name} to ${destination.name}`, notes: '', currency: source.currency, accountId: source.id, transferAccountId: destination.id };
  }

  const category = categories.slice().sort((a, b) => b.name.length - a.name.length).find((item) => lower.includes(item.name.toLocaleLowerCase()));
  const account = accounts.find((item) => lower.includes(item.name.toLocaleLowerCase()));
  let description = text.replace(amountMatch[0], ' ')
    .replace(/^\s*(?:spent|paid|purchased|bought|received|got|credited|deposited|income|expense)\b\s*/i, ' ')
    .trim();
  const atMerchant = description.match(/\bat\s+(.+)$/i);
  let merchant = atMerchant?.[1]?.trim() ?? '';
  let notes = '';
  if (!merchant) {
    if (category) description = description.replace(new RegExp(category.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
    merchant = description.replace(/\b(?:on|at|for|from|to|the|a|an)\b/ig, ' ').replace(/[^\p{L}\p{N}'&.-]+/gu, ' ').trim().replace(/\s+/g, ' ');
    const words = merchant.split(' ').filter(Boolean);
    merchant = words[0] ?? '';
    notes = words.slice(1).join(' ');
  }
  if (!merchant) merchant = category?.name ?? (type === 'income' ? 'Income' : 'Expense');
  return { amountMinor, type, merchant, notes, currency: account?.currency ?? 'INR', categoryId: category?.id, accountId: account?.id };
}

export function toTransaction(entry: ParsedEntry, accountId: string, date: string): NewTransaction {
  return { amountMinor: entry.amountMinor, type: entry.type, merchant: entry.merchant, notes: entry.notes, currency: entry.currency, categoryId: entry.categoryId, accountId: entry.accountId ?? accountId, transferAccountId: entry.transferAccountId, date };
}
