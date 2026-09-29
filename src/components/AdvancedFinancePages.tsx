import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react';
import { calculateTotals } from '../domain/calculations';
import { formatMoney, toMinorUnits } from '../domain/money';
import type { Account, CreditCardProfile, Investment, Loan, Transaction } from '../domain/models';
import { amortizationSchedule, calculateNetWorth, financialServices } from '../services/financialServices';
import { personalService } from '../services/personalService';
import { transactionService } from '../services/transactionService';

const today = () => new Date().toISOString().slice(0, 10);

export function NetWorthPage({ accounts, transactions, loans }: { accounts: Account[]; transactions: Transaction[]; loans: Loan[] }) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [snapshots, setSnapshots] = useState<Awaited<ReturnType<typeof financialServices.snapshots>>>([]);
  const [range, setRange] = useState<'30' | '90' | '365' | 'all'>('90');
  const current = calculateNetWorth(accounts, transactions, investments, loans);

  async function load() {
    const [nextInvestments, nextSnapshots] = await Promise.all([personalService.investments(), financialServices.snapshots()]);
    setInvestments(nextInvestments);
    setSnapshots(nextSnapshots);
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { void financialServices.saveSnapshot({ date: today(), assetsMinor: current.assetsMinor, liabilitiesMinor: current.liabilitiesMinor, netWorthMinor: current.netWorthMinor }).then(load); }, [current.assetsMinor, current.liabilitiesMinor, current.netWorthMinor]);

  const visible = useMemo(() => {
    if (range === 'all') return snapshots;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - Number(range));
    const key = cutoff.toISOString().slice(0, 10);
    return snapshots.filter((item) => item.date >= key);
  }, [snapshots, range]);
  const min = visible.length ? Math.min(...visible.map((item) => item.netWorthMinor)) : 0;
  const max = visible.length ? Math.max(...visible.map((item) => item.netWorthMinor)) : 0;
  const spread = Math.max(1, max - min);
  const points = visible.map((item, index) => `${visible.length === 1 ? 50 : (index / (visible.length - 1)) * 100},${100 - ((item.netWorthMinor - min) / spread) * 85 - 7}`).join(' ');

  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">Balance sheet</p><h2>Net worth</h2><p className="muted">Assets minus liabilities, with daily local snapshots.</p></div></div>
    <div className="stat-grid"><div className="stat-card"><div><p>Net worth</p><strong>{formatMoney(current.netWorthMinor)}</strong></div></div><div className="stat-card"><div><p>Assets</p><strong>{formatMoney(current.assetsMinor)}</strong></div></div><div className="stat-card"><div><p>Liabilities</p><strong>{formatMoney(current.liabilitiesMinor)}</strong></div></div></div>
    <div className="feature-card"><div className="section-heading"><div><h3>History</h3><small>{visible.length} snapshot{visible.length === 1 ? '' : 's'}</small></div><select value={range} onChange={(e) => setRange(e.target.value as typeof range)}><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option><option value="all">All time</option></select></div>{visible.length < 2 ? <p className="muted">Create snapshots on different days to see the trend. The current value is saved automatically.</p> : <div className="net-worth-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Net worth history"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg></div>}{visible.slice().reverse().slice(0, 12).map((snapshot) => <div className="feature-line" key={snapshot.id}><span>{snapshot.date}</span><strong>{formatMoney(snapshot.netWorthMinor)}</strong></div>)}</div>
  </div>;
}

export function CreditCardsPage({ accounts, transactions }: { accounts: Account[]; transactions: Transaction[] }) {
  const cards = accounts.filter((account) => account.type === 'credit-card');
  const [selected, setSelected] = useState(cards[0]?.id ?? '');
  const [profile, setProfile] = useState<CreditCardProfile | undefined>();
  const [bankAccountId, setBankAccountId] = useState(accounts.find((account) => account.type !== 'credit-card')?.id ?? '');
  const [payment, setPayment] = useState('');
  const [message, setMessage] = useState('');
  const card = cards.find((item) => item.id === selected);

  useEffect(() => { if (selected) void financialServices.creditCard(selected).then(setProfile); }, [selected]);
  useEffect(() => { if (!bankAccountId && accounts[0]) setBankAccountId(accounts[0].id); }, [accounts, bankAccountId]);
  const balance = card ? calculateTotals(transactions.filter((item) => item.accountId === card.id), [card]).balanceMinor : 0;
  const outstanding = Math.max(0, -balance);
  const limit = card?.creditLimitMinor ?? 0;
  const utilization = limit ? outstanding / limit : 0;
  const payments = transactions.filter((item) => item.accountId === card?.id && item.type === 'transfer' && item.transferDirection === 'in').sort((a, b) => b.date.localeCompare(a.date));

  async function saveProfile(event: React.FormEvent) { event.preventDefault(); if (!card) return; try { await financialServices.saveCreditCard({ accountId: card.id, billingDay: profile?.billingDay ?? 1, dueDay: profile?.dueDay ?? 10, minimumDueMinor: profile?.minimumDueMinor ?? 0, updatedAt: new Date().toISOString() }); setMessage('Card dates saved locally.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save card profile'); } }
  async function recordPayment(event: React.FormEvent) { event.preventDefault(); if (!card || !bankAccountId) return; try { const amountMinor = toMinorUnits(Number(payment)); await transactionService.create({ accountId: bankAccountId, transferAccountId: card.id, amountMinor, currency: card.currency, type: 'transfer', merchant: `Payment to ${card.name}`, notes: 'Credit-card payment', date: today() }); setPayment(''); setMessage('Payment recorded as a transfer.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to record payment'); } }

  return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Credit</p><h2>Credit cards</h2><p className="muted">Purchases remain expenses; payments are transfers from a funding account.</p></div></div>{cards.length === 0 ? <div className="section-card"><div className="empty-page"><CreditCard size={28} /><h2>No credit cards</h2><p>Add an account with type Credit Card and a credit limit.</p></div></div> : <><div className="feature-card"><label>Card<select value={selected} onChange={(e) => setSelected(e.target.value)}>{cards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="stat-grid"><div className="stat-card"><div><p>Limit</p><strong>{formatMoney(limit, card?.currency ?? 'INR')}</strong></div></div><div className="stat-card"><div><p>Outstanding</p><strong>{formatMoney(outstanding, card?.currency ?? 'INR')}</strong></div></div><div className="stat-card"><div><p>Utilization</p><strong>{Math.round(utilization * 100)}%</strong></div></div></div></div>
    <form className="feature-card" onSubmit={(e) => void saveProfile(e)}><h3>Statement & due dates</h3><div className="form-row"><label>Billing/statement day<input type="number" min="1" max="31" value={profile?.billingDay ?? ''} onChange={(e) => setProfile({ accountId: card!.id, billingDay: Number(e.target.value), dueDay: profile?.dueDay ?? 10, minimumDueMinor: profile?.minimumDueMinor ?? 0, updatedAt: new Date().toISOString() })} /></label><label>Payment due day<input type="number" min="1" max="31" value={profile?.dueDay ?? ''} onChange={(e) => setProfile({ accountId: card!.id, billingDay: profile?.billingDay ?? 1, dueDay: Number(e.target.value), minimumDueMinor: profile?.minimumDueMinor ?? 0, updatedAt: new Date().toISOString() })} /></label></div><label>Minimum due<input type="number" min="0" step="0.01" value={profile ? profile.minimumDueMinor / 100 : ''} onChange={(e) => setProfile({ accountId: card!.id, billingDay: profile?.billingDay ?? 1, dueDay: profile?.dueDay ?? 10, minimumDueMinor: toMinorUnits(Number(e.target.value)), updatedAt: new Date().toISOString() })} /></label><button className="primary-button" type="submit">Save card profile</button></form>
    <form className="feature-card" onSubmit={(e) => void recordPayment(e)}><h3>Record payment</h3><div className="form-row"><label>Pay from<select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>{accounts.filter((item) => item.id !== card!.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Amount<input required min="0.01" step="0.01" type="number" value={payment} onChange={(e) => setPayment(e.target.value)} /></label></div><button className="primary-button" type="submit">Record payment transfer</button>{message && <p className="muted">{message}</p>}</form>
    <div className="feature-card"><h3>Payment history</h3>{payments.length === 0 ? <p className="muted">No card payments recorded.</p> : payments.map((item) => <div className="feature-line" key={item.id}><span>{item.date}<small>{item.merchant}</small></span><strong>{formatMoney(item.amountMinor, item.currency)}</strong></div>)}</div></>}</div>;
}

export function LoanSchedulePage({ loan }: { loan: Loan }) { const rows = useMemo(() => amortizationSchedule(loan.principalMinor, loan.interestRate, loan.tenureMonths, loan.startDate), [loan]); const totalInterest = rows.reduce((sum, row) => sum + row.interestMinor, 0); return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Debt plan</p><h2>{loan.name}</h2><p className="muted">Accurate monthly amortization schedule.</p></div></div><div className="stat-grid"><div className="stat-card"><div><p>Total interest</p><strong>{formatMoney(totalInterest)}</strong></div></div><div className="stat-card"><div><p>EMI</p><strong>{formatMoney(rows[0]?.emiMinor ?? loan.emiMinor)}</strong></div></div><div className="stat-card"><div><p>Remaining principal</p><strong>{formatMoney(rows.at(-1)?.remainingPrincipalMinor ?? loan.principalMinor)}</strong></div></div></div><div className="section-card schedule-table"><div className="feature-line"><strong>#</strong><strong>Date</strong><strong>EMI</strong><strong>Principal</strong><strong>Interest</strong><strong>Remaining</strong></div>{rows.map((row) => <div className="feature-line" key={row.paymentNumber}><span>{row.paymentNumber}</span><span>{row.date}</span><span>{formatMoney(row.emiMinor)}</span><span>{formatMoney(row.principalMinor)}</span><span>{formatMoney(row.interestMinor)}</span><span>{formatMoney(row.remainingPrincipalMinor)}</span></div>)}</div></div>; }
