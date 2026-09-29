import { useState } from 'react';
import { FileText, ScanLine } from 'lucide-react';
import type { Account, Category, NewTransaction } from '../domain/models';
import { extractPdfText, ocrImage, statementTransactions, type ExtractedDocument } from '../services/documentService';
import { toMinorUnits } from '../domain/money';
import { importService } from '../services/importService';
import { database } from '../db/database';

function duplicateKey(row: NewTransaction): string {
  return [row.accountId, row.date, row.amountMinor, row.type, row.merchant.trim().toLocaleLowerCase()].join('|');
}

function readableError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}

export function DocumentReviewPage({ accounts, categories, onSaved }: { accounts: Account[]; categories: Category[]; onSaved: (transaction?: NewTransaction) => Promise<void> }) {
  const [result, setResult] = useState<ExtractedDocument | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [statementRows, setStatementRows] = useState<NewTransaction[]>([]);
  const [duplicateRows, setDuplicateRows] = useState<Set<number>>(new Set());
  const [batchId, setBatchId] = useState<string | null>(null);

  async function select(file: File) {
    setWorking(true); setError(''); setMessage(''); setResult(null); setStatementRows([]); setDuplicateRows(new Set());
    const pdfFile = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setIsPdf(pdfFile);
    try {
      const extracted = pdfFile ? await extractPdfText(file) : await ocrImage(file);
      setResult(extracted); setMerchant(extracted.merchant ?? ''); setAmount(extracted.amountMinor ? String(extracted.amountMinor / 100) : '');
      if (extracted.date) setDate(extracted.date);
      if (pdfFile && accountId) {
        const rows = statementTransactions(extracted, accountId, accounts.find((a) => a.id === accountId)?.currency ?? 'INR');
        const existing = await database.transactions.toArray();
        const seen = new Set(existing.map((item) => duplicateKey(item)));
        const duplicates = new Set<number>();
        rows.forEach((row, index) => { const key = duplicateKey(row); if (seen.has(key)) duplicates.add(index); else seen.add(key); });
        setStatementRows(rows); setDuplicateRows(duplicates);
      }
    } catch (e) { setError(readableError(e, 'Could not read document')); }
    finally { setWorking(false); }
  }

  async function importStatement() {
    const safeRows = statementRows.filter((_, index) => !duplicateRows.has(index));
    if (!safeRows.length) { setMessage('Every parsed statement row is already in your ledger. Nothing was imported.'); return; }
    let batchIdToRevert: string | undefined;
    try {
      const batch = await importService.createBatch('bank-statement.pdf', 'pdf'); batchIdToRevert = batch.id;
      await importService.importTransactions(batch.id, safeRows.map((row) => ({ ...row, categoryId })));
      setBatchId(batch.id); setMessage(`Imported ${safeRows.length} new statement rows.`); setStatementRows([]); setDuplicateRows(new Set()); await onSaved();
    } catch (e) {
      if (batchIdToRevert) await importService.revert(batchIdToRevert);
      setError(readableError(e, 'Statement import failed'));
    }
  }

  const uncertainRows = result?.lineItems.filter((item) => item.amountMinor && item.date && !item.type).length ?? 0;
  const importableCount = statementRows.length - duplicateRows.size;
  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">Local document tools</p><h2>Receipt & statement scanner</h2><p className="muted">OCR and PDF text extraction run in your browser. Nothing is saved until you confirm.</p></div></div>
    <div className="section-card"><div className="settings-actions"><label className="secondary-button"><ScanLine size={17} /> Scan receipt/screenshot<input hidden type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void select(f); e.target.value = ''; }} /></label><label className="secondary-button"><FileText size={17} /> Select bank PDF<input hidden type="file" accept="application/pdf,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) void select(f); e.target.value = ''; }} /></label></div>{working && <p className="muted" role="status">Reading locally…</p>}{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="muted" role="status">{message}</p>}</div>
    {result && !isPdf && <div className="feature-card"><h3>Review extracted transaction</h3><p className="muted">Confidence {Math.round(result.confidence * 100)}%. Correct uncertain fields before saving.</p><label>Merchant<input value={merchant} onChange={(e) => setMerchant(e.target.value)} /></label><label>Amount<input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label><div className="form-row"><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Account<select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div><label>Category<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="primary-button" disabled={!merchant.trim() || !Number(amount)} onClick={() => void onSaved({ accountId, categoryId, amountMinor: toMinorUnits(Number(amount)), currency: accounts.find((a) => a.id === accountId)?.currency ?? 'INR', type: 'expense', merchant, notes: `Imported from document${result.reference ? ` reference ${result.reference}` : ''}`, date })}>Confirm transaction</button><details><summary>Extracted text</summary><pre className="document-text">{result.text}</pre></details></div>}
    {result && isPdf && statementRows.length === 0 && <div className="feature-card"><h3>No importable statement rows</h3><p className="muted">The PDF contained no transaction rows with a readable date, amount, and explicit debit or credit marker. Scanned PDFs are not OCR processed here.</p><details><summary>Extracted text</summary><pre className="document-text">{result.text || 'No text was found in this PDF.'}</pre></details></div>}
    {uncertainRows > 0 && <div className="feature-card"><h3>Uncertain statement rows</h3><p className="muted">{uncertainRows} row{uncertainRows === 1 ? '' : 's'} had no explicit debit or credit marker and will not be imported.</p></div>}
    {statementRows.length > 0 && <div className="feature-card"><h3>Bank statement preview</h3><p className="muted">{statementRows.length} rows found. {duplicateRows.size} possible duplicate{duplicateRows.size === 1 ? '' : 's'} will be skipped; review before importing.</p>{statementRows.slice(0, 30).map((row, i) => <div className="feature-line" key={`${row.date}-${i}`}><span>{row.date}<small>{row.type} · {row.merchant}{duplicateRows.has(i) ? ' · Possible duplicate, skipped' : ''}</small></span><strong>{(row.amountMinor / 100).toFixed(2)} {row.currency}</strong></div>)}<button className="primary-button" disabled={!importableCount} onClick={() => void importStatement()}>Import {importableCount} new row{importableCount === 1 ? '' : 's'}</button></div>}
    {batchId && <p className="muted">Imported batch {batchId.slice(0, 8)}… successfully. You can revert it from the Search & Import page.</p>}
  </div>;
}
