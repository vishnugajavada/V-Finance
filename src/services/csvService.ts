import type { Account, Category, CurrencyCode, NewTransaction, Transaction } from '../domain/models';
import { isCurrencyCode } from '../domain/money';
export interface CsvRow { date: string; type: string; amount: string; currency: string; merchant: string; category: string; account: string; notes: string; tags: string; reference: string; }
export const CSV_FIELDS = ['date', 'type', 'amount', 'currency', 'merchant', 'category', 'account', 'notes', 'tags', 'reference'] as const;
function escape(value: string): string { return `"${String(value).replaceAll('"', '""')}"`; }
function duplicateKey(item: Pick<NewTransaction, 'accountId' | 'date' | 'amountMinor' | 'type' | 'merchant'>): string { return [item.accountId, item.date, item.amountMinor, item.type, item.merchant.trim().toLocaleLowerCase()].join('|'); }
export function exportTransactionsCsv(transactions: Transaction[], accounts: Account[], categories: Category[]): string { const headers = ['Date','Type','Amount','Currency','Merchant','Category','Account','Notes','Tags','Reference']; const rows = transactions.map((item) => [item.date,item.type,String(item.amountMinor / 100),item.currency,item.merchant,categories.find((c) => c.id === item.categoryId)?.name ?? '',accounts.find((a) => a.id === item.accountId)?.name ?? '',item.notes,item.tags.join(' | '),item.reference ?? '']); return [headers,...rows].map((row) => row.map(escape).join(',')).join('\n'); }
export function parseCsvMatrix(text: string): string[][] { const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false; for (let i=0;i<text.length;i+=1) { const ch=text[i]; if (ch === '"') { if (quoted && text[i+1] === '"') { field += '"'; i += 1; } else quoted = !quoted; } else if (ch === ',' && !quoted) { row.push(field); field=''; } else if ((ch === '\n' || ch === '\r') && !quoted) { if (ch === '\r' && text[i+1] === '\n') i += 1; row.push(field); field=''; if (row.some((v) => v.trim() !== '')) rows.push(row); row=[]; } else field += ch; } row.push(field); if (row.some((v) => v.trim() !== '')) rows.push(row); return rows; }
export function parseCsv(text: string): CsvRow[] { const matrix = parseCsvMatrix(text); if (matrix.length < 2) return []; const headers = matrix[0].map((h) => h.trim().toLowerCase()); return matrix.slice(1).map((values) => { const record = Object.fromEntries(headers.map((h,i) => [h, values[i] ?? ''])); return { date: record.date ?? record.transactiondate ?? record.posteddate ?? '', type: record.type ?? record.transactiontype ?? 'expense', amount: record.amount ?? record.value ?? '', currency: record.currency ?? 'INR', merchant: record.merchant ?? record.description ?? record.payee ?? '', category: record.category ?? '', account: record.account ?? '', notes: record.notes ?? '', tags: record.tags ?? '', reference: record.reference ?? record.ref ?? record.utr ?? '' }; }); }
export function normalizeCsvRows(rows: CsvRow[], accounts: Account[], categories: Category[], existing: Transaction[], mapping?: Partial<Record<(typeof CSV_FIELDS)[number], number>>): Array<{ transaction: NewTransaction; duplicate: boolean; error?: string }> {
  void mapping;
  const seen = new Set(existing.map(duplicateKey));
  return rows.map((row) => {
    const account = accounts.find((item) => item.name.trim().toLowerCase() === row.account.trim().toLowerCase()) ?? (row.account.trim() ? undefined : accounts[0]);
    const category = categories.find((item) => item.name.trim().toLowerCase() === row.category.trim().toLowerCase());
    const amountText = row.amount.trim().replace(/^[₹$€£]\s*/, '').replace(/\s*[A-Z]{3}$/i, '');
    const amount = Number(amountText.includes(',') ? (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(amountText) ? amountText.replaceAll(',', '') : NaN) : amountText);
    const rawType = row.type.trim().toLowerCase();
    const type = rawType === 'income' || rawType === 'credit' || rawType === 'deposit' ? 'income' : rawType === 'expense' || rawType === 'debit' || rawType === 'withdrawal' ? 'expense' : rawType === 'transfer' ? 'transfer' : undefined;
    const currencyText = row.currency.trim().toUpperCase() || 'INR';
    const currency = currencyText as CurrencyCode;
    const date = row.date.trim().replaceAll('/', '-');
    const dateMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date);
    const isoDate = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}` : date;
    const parsedDate = dateMatch ? new Date(`${isoDate}T00:00:00Z`) : undefined;
    const validDate = Boolean(dateMatch && parsedDate && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === isoDate);
    const validCurrency = isCurrencyCode(currency);
    const amountMinor = Math.round(Math.abs(amount) * 100);
    const transaction: NewTransaction = { accountId: account?.id ?? '', amountMinor, currency, type: type ?? 'expense', categoryId: type === 'transfer' ? undefined : category?.id, merchant: row.merchant.trim(), notes: row.notes, tags: row.tags.split('|').map((tag) => tag.trim()).filter(Boolean), reference: row.reference || undefined, date: isoDate };
    const error = !account ? (row.account.trim() ? 'Account not found' : 'No account available') : !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(amountMinor) ? 'Invalid amount' : !type ? 'Invalid transaction type' : type === 'transfer' ? 'Transfers need a destination account and cannot be imported from this CSV format' : !validCurrency ? 'Unsupported currency' : account.currency !== currency ? 'Currency does not match the selected account' : !validDate ? 'Invalid date' : !transaction.merchant ? 'Merchant/description is required' : undefined;
    const key = duplicateKey(transaction);
    const duplicate = !error && seen.has(key);
    if (!error) seen.add(key);
    return { transaction, duplicate: Boolean(duplicate), error };
  });
}
