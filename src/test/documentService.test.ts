import { describe, expect, it } from 'vitest';
import { parseDocumentText, statementTransactions, type ExtractedDocument } from '../services/documentService';

const document: ExtractedDocument = {
  text: '', confidence: 0, lineItems: [
    { date: '2026-09-01', merchant: 'Salary', amountMinor: 100_000, type: 'income' },
    { date: '2026-09-02', merchant: 'Groceries', amountMinor: 2_500, type: 'expense' },
    { date: '2026-09-03', merchant: 'Unclear row', amountMinor: 5_000 }
  ]
};

describe('PDF statement safety', () => {
  it('imports explicit debit and credit rows without treating uncertain rows as expenses', () => {
    expect(statementTransactions(document, 'account')).toMatchObject([
      { type: 'income', merchant: 'Salary' },
      { type: 'expense', merchant: 'Groceries' }
    ]);
    expect(statementTransactions(document, 'account')).toHaveLength(2);
  });
  it('extracts separate statement rows without reading a date component as the amount', () => {
    const result = parseDocumentText('15/09/2026 Swiggy debit INR 500.00\n16/09/2026 Salary credit INR 40000.00');
    expect(result).toMatchObject({ merchant: 'Swiggy', amountMinor: 50000, date: '2026-09-15', lineItems: [
      { merchant: 'Swiggy', amountMinor: 50000, date: '2026-09-15', type: 'expense' },
      { merchant: 'Salary', amountMinor: 4_000_000, date: '2026-09-16', type: 'income' }
    ] });
  });
  it('ignores impossible dates and avoids interpreting a date year as a receipt total', () => {
    const result = parseDocumentText('30/02/2026\nTotal INR 125.50');
    expect(result.date).toBeUndefined();
    expect(result.amountMinor).toBe(12550);
    expect(result.lineItems).toEqual([]);
  });
});
