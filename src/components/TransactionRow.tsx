import { Receipt } from 'lucide-react';
import { formatMoney } from '../domain/money';
import type { Category, Transaction } from '../domain/models';

export function TransactionRow({ transaction, categories, onClick }: { transaction: Transaction; categories: Category[]; onClick?: () => void }) {
  const category = categories.find((item) => item.id === transaction.categoryId);
  const prefix = transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '↔' : '-';
  return <button className="transaction-row transaction-button" onClick={onClick}><span className="transaction-icon"><Receipt size={17} /></span><span className="transaction-main"><strong>{transaction.merchant || (transaction.type === 'transfer' ? 'Transfer' : 'Untitled transaction')}</strong><small>{category?.name ?? transaction.type} · {transaction.date}</small></span><strong className={transaction.type === 'income' ? 'amount income' : transaction.type === 'transfer' ? 'amount transfer' : 'amount'}>{prefix}{formatMoney(transaction.amountMinor, transaction.currency)}</strong></button>;
}
