import { database } from '../db/database';
import type { Account, Attachment, CreditCardProfile, Investment, Loan, NetWorthSnapshot, Person, SplitShare } from '../domain/models';
import { accountBalance } from '../domain/calculations';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export interface AmortizationRow { paymentNumber: number; date: string; emiMinor: number; principalMinor: number; interestMinor: number; remainingPrincipalMinor: number; }
export function amortizationSchedule(principalMinor: number, annualRatePercent: number, tenureMonths: number, startDate: string): AmortizationRow[] {
  if (principalMinor <= 0 || tenureMonths <= 0) throw new Error('Loan inputs are invalid');
  const monthlyRate = annualRatePercent / 1200;
  const rawEmi = monthlyRate === 0 ? principalMinor / tenureMonths : principalMinor * monthlyRate * (1 + monthlyRate) ** tenureMonths / ((1 + monthlyRate) ** tenureMonths - 1);
  let remaining = principalMinor;
  const rows: AmortizationRow[] = [];
  for (let index = 0; index < tenureMonths && remaining > 0; index += 1) {
    const interest = Math.round(remaining * monthlyRate);
    const principal = index === tenureMonths - 1 ? remaining : Math.min(remaining, Math.max(0, Math.round(rawEmi) - interest));
    const emi = principal + interest;
    const date = new Date(`${startDate}T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + index + 1);
    remaining -= principal;
    rows.push({ paymentNumber: index + 1, date: date.toISOString().slice(0, 10), emiMinor: emi, principalMinor: principal, interestMinor: interest, remainingPrincipalMinor: remaining });
  }
  return rows;
}

export function investmentReturn(investment: Investment): { gainMinor: number; gainPercent: number } { const gainMinor = investment.currentValueMinor - investment.investedMinor; return { gainMinor, gainPercent: investment.investedMinor ? gainMinor / investment.investedMinor : 0 }; }

export function calculateNetWorth(accounts: Account[], transactions: Parameters<typeof accountBalance>[1], investments: Investment[], loans: Loan[]): { assetsMinor: number; liabilitiesMinor: number; netWorthMinor: number } { let accountAssets = 0; let accountLiabilities = 0; for (const account of accounts) { const balance = accountBalance(account, transactions.filter((item) => item.accountId === account.id)); if (account.type === 'credit-card' || balance < 0) accountLiabilities += Math.max(0, -balance); else accountAssets += balance; } const investmentAssets = investments.reduce((sum, item) => sum + Math.max(0, item.currentValueMinor), 0); const liabilities = loans.reduce((sum, loan) => sum + Math.max(0, loan.principalMinor - loan.paidMinor), 0) + accountLiabilities; return { assetsMinor: accountAssets + investmentAssets, liabilitiesMinor: liabilities, netWorthMinor: accountAssets + investmentAssets - liabilities }; }

export const financialServices = {
  async saveSnapshot(snapshot: Omit<NetWorthSnapshot, 'id'>): Promise<void> { await database.netWorthSnapshots.put({ ...snapshot, id: snapshot.date }); },
  async snapshots(): Promise<NetWorthSnapshot[]> { return database.netWorthSnapshots.orderBy('date').toArray(); },
  async saveCreditCard(profile: CreditCardProfile): Promise<void> { if (profile.billingDay < 1 || profile.billingDay > 31 || profile.dueDay < 1 || profile.dueDay > 31) throw new Error('Card dates are invalid'); await database.creditCards.put(profile); },
  async creditCard(accountId: string): Promise<CreditCardProfile | undefined> { return database.creditCards.get(accountId); },
  async people(): Promise<Person[]> { return database.people.toArray(); },
  async addPerson(name: string): Promise<Person> { if (!name.trim()) throw new Error('Person name is required'); const person = { id: id(), name: name.trim(), createdAt: now() }; await database.people.add(person); return person; },
  async addSplit(share: Omit<SplitShare, 'id'>): Promise<void> { if (share.owedMinor < 0 || share.paidMinor < 0) throw new Error('Split amounts are invalid'); await database.splits.add({ ...share, id: id() }); },
  async splitsFor(transactionId: string): Promise<SplitShare[]> { return database.splits.where('transactionId').equals(transactionId).toArray(); },
  async addAttachment(input: Omit<Attachment, 'id' | 'createdAt'>): Promise<Attachment> { if (input.size > 10 * 1024 * 1024) throw new Error('Attachments must be 10 MB or smaller'); const attachment = { ...input, id: id(), createdAt: now() }; await database.attachments.add(attachment); return attachment; },
  async attachmentsFor(transactionId: string): Promise<Attachment[]> { return database.attachments.where('transactionId').equals(transactionId).toArray(); },
  async removeAttachment(attachmentId: string): Promise<void> { await database.attachments.delete(attachmentId); },
  async settleSplit(splitId: string): Promise<void> { const existing = await database.splits.get(splitId); if (!existing) throw new Error('Split not found'); await database.splits.put({ ...existing, paidMinor: existing.owedMinor, settledAt: new Date().toISOString() }); }
};
