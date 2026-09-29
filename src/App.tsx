import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, BarChart3, Bell, CalendarDays, CreditCard, Home, Menu, Plus, Receipt, Search, Send, Settings, Tag, Wallet, X } from 'lucide-react';
import { database } from './db/database';
import { calculateTotals, calculateTotalsByCurrency } from './domain/calculations';
import { formatMoney, toMinorUnits } from './domain/money';
import type { Account, AppSettings, Category, NewTransaction, Transaction, TransactionType } from './domain/models';
import { ensureStarterData } from './services/seedService';
import { transactionService } from './services/transactionService';
import { recurringService } from './services/recurringService';
import { settingsService } from './services/settingsService';
import { AccountsPage } from './components/AccountsPage';
import { CategoriesPage } from './components/CategoriesPage';
import { EmptyPage } from './components/EmptyPage';
import { Stat } from './components/Stat';
import { TransactionEditor } from './components/TransactionEditor';
import { TransactionRow } from './components/TransactionRow';
import { SettingsPage } from './components/SettingsPage';
import { FeatureHub, type FeatureView } from './components/FeatureHub';
import { PersonalHub, type PersonalView } from './components/PersonalHub';
import { parseNaturalLanguage } from './services/naturalLanguageService';
import { createSpeechInput } from './services/browserInputService';
import { CreditCardsPage, NetWorthPage } from './components/AdvancedFinancePages';
import { DocumentReviewPage } from './components/DocumentReviewPage';
import { ReportsPage, RecurringAuditPage } from './components/ReportsPage';
import { SplitExpensesPage } from './components/SplitExpensesPage';
import { TransactionSearchPage } from './components/TransactionSearchPage';

type Page = 'home' | 'transactions' | 'accounts' | 'categories' | 'budgets' | 'recurring' | 'subscriptions' | 'recurring-audit' | 'calendar' | 'analytics' | 'search' | 'goals' | 'loans' | 'investments' | 'trips' | 'net-worth' | 'credit-cards' | 'documents' | 'reports' | 'splits' | 'settings';

const navItems: { label: string; icon: typeof Home; page: Page }[] = [
  { label: 'Home', icon: Home, page: 'home' },
  { label: 'Transactions', icon: Receipt, page: 'transactions' },
  { label: 'Accounts', icon: Wallet, page: 'accounts' },
  { label: 'Categories', icon: Tag, page: 'categories' },
  { label: 'Budgets', icon: Wallet, page: 'budgets' },
  { label: 'Recurring', icon: CalendarDays, page: 'recurring' },
  { label: 'Subscriptions', icon: CreditCard, page: 'subscriptions' },
  { label: 'Recurring audit', icon: CalendarDays, page: 'recurring-audit' },
  { label: 'Calendar', icon: CalendarDays, page: 'calendar' },
  { label: 'Analytics', icon: BarChart3, page: 'analytics' },
  { label: 'Search', icon: Search, page: 'search' },
  { label: 'Goals', icon: Tag, page: 'goals' },
  { label: 'Loans', icon: CreditCard, page: 'loans' },
  { label: 'Investments', icon: BarChart3, page: 'investments' },
  { label: 'Trips', icon: CalendarDays, page: 'trips' },
  { label: 'Net worth', icon: BarChart3, page: 'net-worth' },
  { label: 'Credit cards', icon: CreditCard, page: 'credit-cards' },
  { label: 'Split expenses', icon: Receipt, page: 'splits' },
  { label: 'Scan documents', icon: Receipt, page: 'documents' },
  { label: 'Reports', icon: Receipt, page: 'reports' },
  { label: 'Settings', icon: Settings, page: 'settings' }
];

function App() {
  const [page, setPage] = useState<Page>('home');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<import('./domain/models').Loan[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const mobileMoreButton = useRef<HTMLButtonElement>(null);
  const mobileMoreDialog = useRef<HTMLDivElement>(null);
  const [initialTransactionType, setInitialTransactionType] = useState<TransactionType>('expense');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  function navigate(nextPage: Page, replace = false) {
    setPage(nextPage);
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({ page: nextPage }, '', `#${nextPage}`);
  }

  async function loadData() {
    setLoading(true);
    await ensureStarterData();
    await recurringService.generateDue();
    const [nextAccounts, nextCategories, nextTransactions, nextSettings, nextLoans] = await Promise.all([
      database.accounts.toArray(),
      database.categories.toArray(),
      database.transactions.orderBy('date').reverse().toArray(),
      settingsService.get(),
      database.loans.toArray()
    ]);
    setAccounts(nextAccounts);
    setCategories(nextCategories);
    setTransactions(nextTransactions);
    setSettings(nextSettings);
    setLoans(nextLoans);
    setLoading(false);
  }

  useEffect(() => {
    const hashPage = window.location.hash.slice(1) as Page;
    if (navItems.some((item) => item.page === hashPage)) setPage(hashPage);
    else window.history.replaceState({ page: 'home' }, '', '#home');
    const onPopState = () => { const next = window.location.hash.slice(1) as Page; setPage(navItems.some((item) => item.page === next) ? next : 'home'); };
    window.addEventListener('popstate', onPopState);
    void loadData();
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => { if (showMobileMore) mobileMoreDialog.current?.focus(); }, [showMobileMore]);

  function closeMobileMore() { setShowMobileMore(false); window.requestAnimationFrame(() => mobileMoreButton.current?.focus()); }

  useEffect(() => {
    if (!settings) return;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [settings]);

  const totalsByCurrency = useMemo(() => calculateTotalsByCurrency(transactions, accounts), [transactions, accounts]);
  const totals = useMemo(() => totalsByCurrency[settings?.primaryCurrency ?? 'INR'] ?? calculateTotals([], []), [settings?.primaryCurrency, totalsByCurrency]);
  const currentMonthTransactions = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return transactions.filter((item) => item.date.startsWith(month));
  }, [transactions]);

  async function addTransaction(input: NewTransaction) {
    await transactionService.create(input);
    setShowAdd(false);
    await loadData();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">V</span><span>V-Finance</span></div>
        <p className="eyebrow">Personal money, kept private</p>
        <nav>{navItems.map(({ label, icon: Icon, page: itemPage }) => <button className={page === itemPage ? 'nav-item active' : 'nav-item'} key={itemPage} onClick={() => navigate(itemPage)}><Icon size={19} />{label}</button>)}</nav>
        <div className="sidebar-footer"><div className="privacy-dot" />Local-only storage</div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div><p className="eyebrow">{new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</p><h1>{page === 'home' ? 'Good morning' : navItems.find((item) => item.page === page)?.label}</h1></div><div className="top-actions"><span className="icon-button" aria-hidden="true"><Bell size={19} /></span><span className="avatar" aria-hidden="true">V</span></div></header>
        {loading ? <div className="loading-state"><div className="loader" />Loading your private ledger...</div> : <>
          {page === 'home' && <Dashboard accounts={accounts.filter((account) => account.active)} categories={categories.filter((category) => category.active)} transactions={transactions} totals={totals} totalsByCurrency={totalsByCurrency} primaryCurrency={settings?.primaryCurrency ?? 'INR'} monthTransactions={currentMonthTransactions} hideBalances={settings?.hideBalances ?? false} onAdd={(type) => { setInitialTransactionType(type); setShowAdd(true); }} onNavigate={navigate} onSelectTransaction={setSelectedTransaction} />}
          {page === 'transactions' && <Transactions transactions={transactions} categories={categories} onAdd={() => { setInitialTransactionType('expense'); setShowAdd(true); }} onRefresh={loadData} onSelect={(transaction) => setSelectedTransaction(transaction)} />}
          {page === 'accounts' && <AccountsPage accounts={accounts} transactions={transactions} onChanged={loadData} />}
          {page === 'categories' && <CategoriesPage categories={categories} transactions={transactions} onChanged={loadData} />}
          {(['budgets', 'recurring', 'subscriptions', 'calendar', 'analytics'] as FeatureView[]).includes(page as FeatureView) && <FeatureHub view={page as FeatureView} accounts={accounts.filter((account) => account.active)} categories={categories.filter((category) => category.active)} transactions={transactions} onChanged={loadData} />}
          {(['goals', 'loans', 'investments', 'trips'] as PersonalView[]).includes(page as PersonalView) && <PersonalHub view={page as PersonalView} transactions={transactions} />}
          {page === 'search' && <TransactionSearchPage accounts={accounts} categories={categories} transactions={transactions} />}
          {page === 'net-worth' && <NetWorthPage accounts={accounts.filter((account) => account.active)} transactions={transactions} loans={loans} />}
          {page === 'splits' && <SplitExpensesPage accounts={accounts} categories={categories} transactions={transactions} />}
          {page === 'credit-cards' && <CreditCardsPage accounts={accounts.filter((account) => account.active)} transactions={transactions} />}
          {page === 'documents' && <DocumentReviewPage accounts={accounts.filter((account) => account.active)} categories={categories.filter((category) => category.active)} onSaved={async (input) => { if (input) await transactionService.create(input); await loadData(); }} />}
          {page === 'reports' && <ReportsPage accounts={accounts} categories={categories} transactions={transactions} />}
          {page === 'recurring-audit' && <RecurringAuditPage />}
          {page === 'settings' && settings && <SettingsPage settings={settings} onChanged={setSettings} />}
        </>}
      </main>
      <nav className="mobile-nav" aria-label="Primary navigation">{navItems.filter(({ page: itemPage }) => ['home', 'transactions', 'accounts', 'search'].includes(itemPage)).map(({ label, icon: Icon, page: itemPage }) => <button className={page === itemPage ? 'mobile-nav-item active' : 'mobile-nav-item'} key={itemPage} onClick={() => { setShowMobileMore(false); navigate(itemPage); }}><Icon size={19} /><span>{label}</span></button>)}<button className="add-button" aria-label="Add transaction" onClick={() => { setShowMobileMore(false); setInitialTransactionType('expense'); setShowAdd(true); }}><Plus size={24} /></button><button ref={mobileMoreButton} className="mobile-nav-item" aria-label="More navigation options" aria-expanded={showMobileMore} aria-controls="mobile-more-menu" onClick={() => setShowMobileMore((open) => !open)}><Menu size={19} /><span>More</span></button></nav>
      {showMobileMore && <div ref={mobileMoreDialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="mobile-more-title" id="mobile-more-menu" className="mobile-more-backdrop" onClick={closeMobileMore} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); closeMobileMore(); } }}><nav className="mobile-more-menu" aria-label="More pages" onClick={(event) => event.stopPropagation()}><div className="mobile-more-heading"><h2 id="mobile-more-title">All pages</h2><button type="button" className="icon-button" aria-label="Close navigation menu" onClick={closeMobileMore}><X size={18} /></button></div><div className="mobile-more-grid">{navItems.filter(({ page: itemPage }) => !['home', 'transactions', 'accounts', 'search'].includes(itemPage)).map(({ label, icon: Icon, page: itemPage }) => <button className={page === itemPage ? 'mobile-more-item active' : 'mobile-more-item'} key={itemPage} onClick={() => { closeMobileMore(); navigate(itemPage); }}><Icon size={17} /><span>{label}</span></button>)}</div></nav></div>}
      {showAdd && <AddTransaction initialType={initialTransactionType} accounts={accounts.filter((account) => account.active)} categories={categories.filter((category) => category.active)} onClose={() => setShowAdd(false)} onSubmit={addTransaction} />}
      {selectedTransaction && <TransactionEditor transaction={selectedTransaction} accounts={accounts.filter((account) => account.active)} categories={categories.filter((category) => category.active)} onClose={() => setSelectedTransaction(null)} onSaved={async (id, changes) => { await transactionService.update(id, changes); setSelectedTransaction(null); await loadData(); }} onDeleted={async (id) => { await transactionService.remove(id); setSelectedTransaction(null); await loadData(); }} />}
    </div>
  );
}

function Dashboard({ accounts, categories, transactions, totals, totalsByCurrency, primaryCurrency, monthTransactions, hideBalances, onAdd, onNavigate, onSelectTransaction }: { accounts: Account[]; categories: Category[]; transactions: Transaction[]; totals: ReturnType<typeof calculateTotals>; totalsByCurrency: ReturnType<typeof calculateTotalsByCurrency>; primaryCurrency: import('./domain/models').CurrencyCode; monthTransactions: Transaction[]; hideBalances: boolean; onAdd: (type: TransactionType) => void; onNavigate: (page: Page) => void; onSelectTransaction: (transaction: Transaction) => void }) {
  const monthExpenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
  const displayMoney = (amount: number, currency = primaryCurrency) => hideBalances ? '••••' : formatMoney(amount, currency);
  return <div className="page-stack">
    <section className="balance-panel"><div><p className="eyebrow light">{Object.keys(totalsByCurrency).length > 1 ? `${primaryCurrency} balance` : 'Total balance'}</p><strong>{displayMoney(totals.balanceMinor)}</strong>{Object.keys(totalsByCurrency).length > 1 && <span className="balance-meta">Currencies are shown separately; no exchange rates are assumed.</span>}<span className="balance-meta"><ArrowUpRight size={15} /> Your private ledger is up to date</span></div><div className="quick-actions"><button className="secondary-button" onClick={() => onAdd('expense')}><ArrowUpRight size={16} /> Expense</button><button className="primary-button" onClick={() => onAdd('income')}><ArrowDownLeft size={16} /> Income</button></div></section>
    {Object.keys(totalsByCurrency).length > 1 && <section className="feature-card">{Object.entries(totalsByCurrency).map(([currency, value]) => <div className="feature-line" key={currency}><span>{currency} balance</span><strong>{displayMoney(value?.balanceMinor ?? 0, currency as import('./domain/models').CurrencyCode)}</strong></div>)}</section>}
    <section className="stat-grid"><button className="stat-card clickable" onClick={() => onAdd('income')}><Stat label="Income" value={displayMoney(totals.incomeMinor)} icon={<ArrowDownLeft />} tone="green" /></button><button className="stat-card clickable" onClick={() => onAdd('expense')}><Stat label="Expenses" value={displayMoney(totals.expenseMinor)} icon={<ArrowUpRight />} tone="coral" /></button><button className="stat-card clickable" onClick={() => onNavigate('transactions')}><Stat label="Net savings" value={displayMoney(totals.netMinor)} icon={<BarChart3 />} tone="gold" /></button></section>
    <section className="content-grid"><div className="section-card"><div className="section-heading"><div><p className="eyebrow">This month</p><h2>Spending snapshot</h2></div><span className="period-pill">{new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date())}</span></div><button className="spending-number spending-button" onClick={() => onNavigate('transactions')}>{displayMoney(monthExpenses)} <span>spent</span></button><div className="progress-track"><div className="progress-value" style={{ width: '0%' }} /></div><p className="muted">No budget is set for this period yet.</p><div className="category-list">{categories.slice(0, 4).map((category) => { const value = monthTransactions.filter((item) => item.categoryId === category.id && item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0); return <button className="category-row category-button" key={category.id} onClick={() => onNavigate('transactions')}><span className="category-icon" style={{ background: category.color }}>{category.name.slice(0, 1)}</span><span>{category.name}</span><strong>{displayMoney(value)}</strong></button>; })}</div></div><div className="section-card accounts-card"><div className="section-heading"><div><p className="eyebrow">Your money</p><h2>Accounts</h2></div><CreditCard size={19} /></div>{accounts.map((account) => <button className="account-row account-button" key={account.id} onClick={() => onNavigate('accounts')}><span className="account-icon"><Wallet size={17} /></span><span><strong>{account.name}</strong><small>{account.type.replace('-', ' ')}</small></span><b>{displayMoney(calculateTotals(transactions.filter((item) => item.accountId === account.id), [account]).balanceMinor)}</b></button>)}<button className="text-button" onClick={() => onNavigate('accounts')}>Manage accounts <ArrowUpRight size={15} /></button><button className="text-button" onClick={() => onNavigate('categories')}>Manage categories <Tag size={15} /></button></div></section>
    <section className="section-card"><div className="section-heading"><div><p className="eyebrow">Activity</p><h2>Recent transactions</h2></div><button className="text-button" onClick={() => onNavigate('transactions')}>View all <ArrowUpRight size={15} /></button></div>{transactions.length === 0 ? <div className="empty-inline"><Receipt size={22} /><p>No transactions yet. Your first entry starts the picture.</p></div> : transactions.slice(0, 5).map((item) => <TransactionRow key={item.id} transaction={item} categories={categories} onClick={() => onSelectTransaction(item)} />)}</section>
  </div>;
}

function Transactions({ transactions, categories, onAdd, onRefresh, onSelect }: { transactions: Transaction[]; categories: Category[]; onAdd: () => void; onRefresh: () => Promise<void>; onSelect: (transaction: Transaction) => void }) { return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Ledger</p><h2>Transactions</h2><p className="muted">Every entry stays on this device.</p></div><button className="primary-button" onClick={onAdd}><Plus size={18} /> Add</button></div><div className="section-card transaction-table">{transactions.length === 0 ? <EmptyPage title="A clean slate" description="Add your first expense, income, or transfer to begin." action="Add transaction" onAction={onAdd} /> : transactions.map((item) => <TransactionRow key={item.id} transaction={item} categories={categories} onClick={() => onSelect(item)} />)}</div><button className="text-button" onClick={() => void onRefresh()}><Send size={15} /> Refresh ledger</button></div>; }

function AddTransaction({ initialType, accounts, categories, onClose, onSubmit }: { initialType: TransactionType; accounts: Account[]; categories: Category[]; onClose: () => void; onSubmit: (input: NewTransaction) => Promise<void> }) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(''); const [merchant, setMerchant] = useState(''); const [quickText, setQuickText] = useState(''); const [listening, setListening] = useState(false); const [accountId, setAccountId] = useState(accounts[0]?.id ?? ''); const [transferAccountId, setTransferAccountId] = useState(accounts[1]?.id ?? ''); const [categoryId, setCategoryId] = useState(categories[0]?.id ?? ''); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [error, setError] = useState('');
  function parseQuickText() { try { const parsed = parseNaturalLanguage(quickText, accounts, categories); setAmount(String(parsed.amountMinor / 100)); setMerchant(parsed.merchant); setType(parsed.type); if (parsed.accountId) setAccountId(parsed.accountId); if (parsed.transferAccountId) setTransferAccountId(parsed.transferAccountId); if (parsed.categoryId) setCategoryId(parsed.categoryId); setQuickText(''); setError(''); } catch (parseError) { setError(parseError instanceof Error ? parseError.message : 'Unable to parse entry'); } }
  async function submit(event: React.FormEvent) { event.preventDefault(); try { const accountCurrency = accounts.find((account) => account.id === accountId)?.currency ?? 'INR'; await onSubmit({ type, amountMinor: toMinorUnits(Number(amount)), currency: accountCurrency, merchant, accountId, transferAccountId: type === 'transfer' ? transferAccountId : undefined, categoryId: type === 'transfer' ? undefined : categoryId, date }); } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : 'Unable to save transaction'); } }
  return <div className="modal-backdrop"><form className="modal" role="dialog" aria-modal="true" aria-labelledby="add-transaction-title" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } }} onSubmit={(event) => void submit(event)}><div className="modal-header"><div><p className="eyebrow">Quick entry</p><h2 id="add-transaction-title">Add transaction</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><div className="quick-entry"><input aria-label="Natural language transaction entry" placeholder="Try: 450 swiggy dinner" value={quickText} onChange={(event) => setQuickText(event.target.value)} /><button type="button" className="secondary-button" onClick={parseQuickText}>Parse</button><button type="button" className="secondary-button" onClick={() => { const speech = createSpeechInput(); if (!speech) { setError('Voice input is not supported here. Use text entry instead.'); return; } setListening(true); speech.start((text) => { setQuickText(text); setListening(false); }, (message) => { setError(message); setListening(false); }); }}>{listening ? 'Listening…' : 'Voice'}</button></div><div className="type-switcher">{(['expense', 'income', 'transfer'] as TransactionType[]).map((item) => <button type="button" className={type === item ? 'type-option active' : 'type-option'} key={item} onClick={() => setType(item)}>{item}</button>)}</div><label>Amount<input autoFocus required min="0.01" step="0.01" type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Merchant / description<input required placeholder="e.g. Swiggy dinner" value={merchant} onChange={(event) => setMerchant(event.target.value)} /></label><div className="form-row"><label>{type === 'transfer' ? 'From account' : 'Account'}<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>{type === 'transfer' ? <label>To account<select value={transferAccountId} onChange={(event) => setTransferAccountId(event.target.value)}>{accounts.filter((account) => account.id !== accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label> : <label>Category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}</div><label>Date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full-width" type="submit">Save {type}</button></form></div>;
}

export default App;
