import type { CurrencyCode, NewTransaction } from '../domain/models';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export interface ExtractedLineItem { date?: string; merchant: string; amountMinor?: number; currency?: CurrencyCode; reference?: string; type?: 'expense' | 'income'; }
export interface ExtractedDocument { text: string; merchant?: string; amountMinor?: number; date?: string; currency?: CurrencyCode; reference?: string; confidence: number; lineItems: ExtractedLineItem[]; }
function normalizeDate(value: string): string | undefined {
 const parts = value.replaceAll('/', '-').split('-');
 if (parts.length !== 3) return undefined;
 const iso = parts[0].length === 4 ? `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}` : `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
 const parsed = new Date(`${iso}T00:00:00Z`);
 return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : undefined;
}
export function parseDocumentText(text: string): Omit<ExtractedDocument,'text'|'confidence'|'lineItems'> & { lineItems: ExtractedLineItem[] } {
 const datePattern = /\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]20\d{2})\b/;
 const dateMatch = text.match(datePattern);
 const referenceMatch = text.match(/(?:ref(?:erence)?|utr|transaction\s*id)[:\s#-]*([A-Z0-9-]{6,})/i);
 const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
 const lineItems: ExtractedLineItem[] = [];
 for (const line of lines) {
  const d = line.match(datePattern);
  const a = line.replaceAll(',', '').match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*$/i);
  const type = /\b(?:credit|cr)\b/i.test(line) ? 'income' : /\b(?:debit|dr)\b/i.test(line) ? 'expense' : undefined;
  if (!d || !a || !type) continue;
  const merchant = line.replace(d[0], '').replace(a[0], '').replace(/\b(?:debit|dr|credit|cr)\b/ig, '').replace(/\b(?:INR|rupees?)\b/ig, '').replace(/[₹]/g, '').trim().slice(0,100);
  const amountMinor = Math.round(Number(a[1].replaceAll(',', '')) * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) continue;
  lineItems.push({ date: normalizeDate(d[1]), merchant, amountMinor, currency: /₹|INR|rupees?/i.test(line) ? 'INR' : undefined, type });
 }
 const currencyAmount = text.replace(datePattern, ' ').match(/(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
 const labeledAmount = text.replace(datePattern, ' ').match(/\b(?:total|amount|paid|balance)\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
 const safeNumber = (value?: string) => { const amount = Number(value?.replaceAll(',', '')); const minor = Math.round(amount * 100); return Number.isSafeInteger(minor) && minor > 0 ? minor : undefined; };
 const lastAmount = lines.at(-1)?.replace(datePattern, ' ').match(/(?:^|\s)([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*$/)?.[1];
 return { merchant: lineItems[0]?.merchant || lines[0]?.slice(0,80), amountMinor: lineItems[0]?.amountMinor ?? safeNumber(labeledAmount?.[1]) ?? safeNumber(currencyAmount?.[1]) ?? safeNumber(lastAmount), date: lineItems[0]?.date ?? (dateMatch ? normalizeDate(dateMatch[1]) : undefined), currency: /₹|INR|rupees?/i.test(text) ? 'INR' : undefined, reference: referenceMatch?.[1], lineItems };
}
export async function ocrImage(file: File, onProgress?: (progress: number) => void): Promise<ExtractedDocument> { const { createWorker } = await import('tesseract.js'); const worker = await createWorker('eng', 1, { logger: (message) => { if (message.status === 'recognizing text' && message.progress) onProgress?.(message.progress); } }); try { const result = await worker.recognize(file); if (!result.data.text.trim()) throw new Error('No readable text was found in this image. Try a clearer image.'); return { text: result.data.text, ...parseDocumentText(result.data.text), confidence: result.data.confidence / 100 }; } finally { await worker.terminate(); } }
export async function extractPdfText(file: File): Promise<ExtractedDocument> { const pdfjsLib = await import('pdfjs-dist'); pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl; const data = new Uint8Array(await file.arrayBuffer()); const pdf = await pdfjsLib.getDocument({ data }).promise; const pages: string[] = []; for (let pageNumber=1; pageNumber<=pdf.numPages; pageNumber+=1) { const page=await pdf.getPage(pageNumber); const content=await page.getTextContent(); let previousY: number | undefined; const pageText=content.items.map((item) => { if (!('str' in item)) return ''; const y=item.transform[5]; const newLine=item.hasEOL || (previousY !== undefined && Math.abs(y-previousY)>2); previousY=y; return `${newLine ? '\n' : ' '}${item.str}`; }).join('').trim(); pages.push(pageText); } const text=pages.join('\n'); return { text, ...parseDocumentText(text), confidence: text ? 0.5 : 0 }; }
/** Generic statement text is never assumed to be spending: only explicit debit/credit rows are importable. */
export function statementTransactions(document: ExtractedDocument, accountId: string, currency: CurrencyCode = 'INR'): NewTransaction[] { return document.lineItems.filter((item): item is ExtractedLineItem & { amountMinor: number; date: string; type: 'expense' | 'income' } => Boolean(item.amountMinor && item.date && item.type)).map((item) => ({ accountId, amountMinor: item.amountMinor, currency: item.currency ?? currency, type: item.type, merchant: item.merchant || 'Statement transaction', reference: item.reference, date: item.date, notes: 'Imported from PDF bank statement' })); }
