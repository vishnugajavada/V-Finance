export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD' | 'AUD' | 'CAD' | 'JPY' | 'OTHER';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type AccountType = 'bank' | 'cash' | 'credit-card' | 'wallet' | 'investment' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalanceMinor: number;
  creditLimitMinor?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  color: string;
  icon: string;
  budgetMinor?: number;
  active: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  transferAccountId?: string;
  transferId?: string;
  transferDirection?: 'out' | 'in';
  amountMinor: number;
  currency: CurrencyCode;
  type: TransactionType;
  categoryId?: string;
  merchant: string;
  notes: string;
  tags: string[];
  paymentMethod?: PaymentMethod;
  reference?: string;
  recurringId?: string;
  tripId?: string;
  importBatchId?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewTransaction {
  accountId: string;
  transferAccountId?: string;
  transferId?: string;
  transferDirection?: 'out' | 'in';
  amountMinor: number;
  currency: CurrencyCode;
  type: TransactionType;
  categoryId?: string;
  merchant: string;
  notes?: string;
  tags?: string[];
  paymentMethod?: PaymentMethod;
  reference?: string;
  recurringId?: string;
  tripId?: string;
  importBatchId?: string;
  date: string;
}

export interface DashboardTotals {
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  balanceMinor: number;
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type DateFormat = 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';

export interface AppSettings {
  id: 'preferences';
  primaryCurrency: CurrencyCode;
  financialYearStartMonth: number;
  dateFormat: DateFormat;
  theme: ThemePreference;
  hideBalances: boolean;
  privacyMode: boolean;
  updatedAt: string;
}

export type PaymentMethod = 'upi' | 'credit-card' | 'debit-card' | 'cash' | 'bank-transfer' | 'net-banking' | 'wallet' | 'other';
export type BudgetPeriod = 'weekly' | 'monthly' | 'custom';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export interface Budget { id: string; name: string; amountMinor: number; currency: CurrencyCode; categoryId?: string; startDate: string; endDate: string; period: BudgetPeriod; rollover: boolean; active: boolean; createdAt: string; updatedAt: string; }
export interface RecurringTransaction { id: string; name: string; amountMinor: number; type: 'expense' | 'income'; accountId: string; categoryId?: string; currency: CurrencyCode; frequency: RecurrenceFrequency; interval: number; startDate: string; endDate?: string; nextOccurrence: string; notes: string; active: boolean; createdAt: string; updatedAt: string; }
export interface Subscription { id: string; name: string; amountMinor: number; currency: CurrencyCode; billingFrequency: RecurrenceFrequency; billingDay: number; accountId: string; categoryId?: string; notes: string; active: boolean; createdAt: string; updatedAt: string; }
export interface SavingsGoal { id: string; name: string; targetMinor: number; currentMinor: number; currency: CurrencyCode; targetDate?: string; notes: string; active: boolean; createdAt: string; updatedAt: string; }
export interface Loan { id: string; name: string; principalMinor: number; interestRate: number; tenureMonths: number; emiMinor: number; startDate: string; endDate?: string; paidMinor: number; active: boolean; createdAt: string; updatedAt: string; }
export type InvestmentType = 'stocks' | 'mutual-fund' | 'sip' | 'fd' | 'gold' | 'epf' | 'ppf' | 'other';
export interface Investment { id: string; name: string; type: InvestmentType; units: number; purchasePriceMinor: number; investedMinor: number; currentValueMinor: number; currency: CurrencyCode; date: string; createdAt: string; updatedAt: string; }
export interface Trip { id: string; name: string; destination: string; startDate: string; endDate: string; budgetMinor?: number; notes: string; active: boolean; createdAt: string; updatedAt: string; }
export interface RecurringAudit { id: string; recurringId: string; transactionId?: string; scheduledDate: string; generatedAt: string; status: 'generated' | 'failed'; error?: string; }
export interface NetWorthSnapshot { id: string; date: string; assetsMinor: number; liabilitiesMinor: number; netWorthMinor: number; }
export interface CreditCardProfile { accountId: string; billingDay: number; dueDay: number; minimumDueMinor: number; updatedAt: string; }
export interface Person { id: string; name: string; createdAt: string; }
export interface SplitShare { id: string; transactionId: string; personId: string; owedMinor: number; paidMinor: number; settledAt?: string; }
export interface Attachment { id: string; transactionId: string; name: string; mimeType: string; size: number; data: Blob; createdAt: string; }

export interface ImportBatch { id: string; fileName: string; kind: 'csv' | 'pdf'; createdAt: string; transactionIds: string[]; status: 'active' | 'reverted'; }
