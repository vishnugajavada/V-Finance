import type { Account, CurrencyCode, DashboardTotals, Transaction } from './models';

export function calculateTotals(transactions: Transaction[], accounts: Account[]): DashboardTotals {
  const incomeMinor = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountMinor, 0);
  const expenseMinor = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
  const balanceMinor = accounts.reduce((sum, account) => {
    const accountTransactions = transactions.filter((item) => item.accountId === account.id);
    const credits = accountTransactions.filter((item) => item.type === 'income' || (item.type === 'transfer' && item.transferDirection === 'in')).reduce((total, item) => total + item.amountMinor, 0);
    const debits = accountTransactions.filter((item) => item.type === 'expense' || (item.type === 'transfer' && item.transferDirection === 'out')).reduce((total, item) => total + item.amountMinor, 0);
    return sum + account.openingBalanceMinor + credits - debits;
  }, 0);
  return { incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor, balanceMinor };
}

export function accountBalance(account: Account, transactions: Transaction[]): number {
  return calculateTotals(transactions, [account]).balanceMinor;
}

/** Totals are deliberately grouped: no unconverted currencies are ever added. */
export function calculateTotalsByCurrency(transactions: Transaction[], accounts: Account[]): Partial<Record<CurrencyCode, DashboardTotals>> {
  const currencies = new Set(accounts.map((account) => account.currency));
  return Object.fromEntries([...currencies].map((currency) => [currency, calculateTotals(
    transactions.filter((item) => item.currency === currency),
    accounts.filter((account) => account.currency === currency)
  )])) as Partial<Record<CurrencyCode, DashboardTotals>>;
}
