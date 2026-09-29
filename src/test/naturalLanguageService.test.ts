import { describe, expect, it } from 'vitest';
import { parseNaturalLanguage, toTransaction } from '../services/naturalLanguageService';
import type { Account, Category } from '../domain/models';

const accounts: Account[] = [
  { id:'bank',name:'Main Bank',type:'bank',currency:'INR',openingBalanceMinor:0,active:true,createdAt:'',updatedAt:'' },
  { id:'savings',name:'Savings',type:'bank',currency:'INR',openingBalanceMinor:0,active:true,createdAt:'',updatedAt:'' }
];
const categories: Category[] = [
  { id:'food',name:'Food',color:'#123456',icon:'food',active:true },
  { id:'salary',name:'Salary',color:'#123456',icon:'salary',active:true },
  { id:'electricity',name:'Electricity',color:'#123456',icon:'power',active:true }
];

describe('natural-language transaction entry', () => {
  it('parses expense, salary, and bill examples into useful merchants and categories', () => {
    expect(parseNaturalLanguage('Spent 500 on food at Swiggy', accounts, categories)).toMatchObject({ amountMinor:50000,type:'expense',merchant:'Swiggy',categoryId:'food' });
    expect(parseNaturalLanguage('Received salary 40000', accounts, categories)).toMatchObject({ amountMinor:4_000_000,type:'income',merchant:'Salary',categoryId:'salary' });
    expect(parseNaturalLanguage('Paid 1200 for electricity', accounts, categories)).toMatchObject({ amountMinor:120000,type:'expense',merchant:'Electricity',categoryId:'electricity' });
  });
  it('parses transfers with both real account references and preserves them in the transaction', () => {
    const parsed = parseNaturalLanguage('Transferred 2000 from Main Bank to Savings', accounts, categories);
    expect(parsed).toMatchObject({ amountMinor:200000,type:'transfer',accountId:'bank',transferAccountId:'savings',currency:'INR' });
    expect(toTransaction(parsed,'bank','2026-09-29')).toMatchObject({ accountId:'bank',transferAccountId:'savings',type:'transfer' });
  });
  it('rejects incomplete, unknown-account, and self transfers', () => {
    expect(() => parseNaturalLanguage('Transferred 2000 to savings', accounts, categories)).toThrow('include both accounts');
    expect(() => parseNaturalLanguage('Transferred 2000 from Unknown to Savings', accounts, categories)).toThrow('must match');
    expect(() => parseNaturalLanguage('Transferred 2000 from Savings to Savings', accounts, categories)).toThrow('different');
  });
});
