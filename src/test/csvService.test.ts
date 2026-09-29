import { describe, expect, it } from 'vitest';
import type { Account } from '../domain/models';
import { normalizeCsvRows } from '../services/csvService';

const account: Account = { id: 'bank', name: 'Main Bank', type: 'bank', currency: 'INR', openingBalanceMinor: 0, active: true, createdAt: '', updatedAt: '' };
const row = (changes: Partial<{date:string;type:string;amount:string;currency:string;merchant:string;account:string}> = {}) => ({date:'2026-09-11',type:'expense',amount:'1,250.50',currency:'INR',merchant:'Market',category:'',account:'Main Bank',notes:'',tags:'',reference:'',...changes});

describe('CSV import validation', () => {
  it('normalizes valid Indian grouped amounts and dates', () => {
    const [result] = normalizeCsvRows([row()], [account], [], []);
    expect(result.error).toBeUndefined();
    expect(result.transaction.amountMinor).toBe(125050);
  });
  it('rejects malformed amounts, impossible dates, invalid currencies and unknown account names', () => {
    for (const [input, expected] of [
      [row({amount:'1,25,0'}), 'Invalid amount'],
      [row({date:'2026-02-30'}), 'Invalid date'],
      [row({currency:'XYZ'}), 'Unsupported currency'],
      [row({account:'Other bank'}), 'Account not found'],
    ] as const) expect(normalizeCsvRows([input], [account], [], [])[0].error).toBe(expected);
  });
  it('does not silently import transfers without a mapped destination account', () => {
    expect(normalizeCsvRows([row({type:'transfer'})], [account], [], [])[0].error).toContain('destination account');
  });
  it('marks repeated matching rows in the same CSV as duplicates', () => {
    const results = normalizeCsvRows([row(), row()], [account], [], []);
    expect(results.map((result) => result.duplicate)).toEqual([false, true]);
  });
});
