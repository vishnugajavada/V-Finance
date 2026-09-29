# V-Finance 1.0

A private, local-first personal finance PWA for Windows and iPhone Safari installation. It is designed for personal use and does not require an account, backend, bank connection, advertising, analytics, or paid API.

## Run on Windows

Requirements: Node.js LTS.

```powershell
npm install
npm run dev
```

Open the printed local URL. For a production check:

```powershell
npm run check
npm test
npm run build
```

## GitHub Pages deployment

The GitHub Actions workflow checks the project, runs its tests, builds the site, and deploys the `dist/` artifact to GitHub Pages. It sets Vite's base path to `/Vfinance-final-tested/` in Actions builds; local development and builds continue to use `/`.

1. Create a GitHub repository named `Vfinance-final-tested` and push the `main` branch.
2. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source.
3. The workflow deploys on each push to `main`. The expected project site URL is `https://<YOUR_GITHUB_USERNAME>.github.io/Vfinance-final-tested/`.

Do not commit `.env` files, credentials, `node_modules/`, or `dist/`. Dependencies are installed reproducibly by the workflow with `npm ci`.

The application data is stored in IndexedDB in the browser. The PWA service worker enables offline application assets after the app has been loaded once. Financial records remain local unless you explicitly export a backup.

## Included functionality

- Dashboard with balances, income, expenses, savings and recent transactions
- Expense, income and paired transfer ledger entries
- Accounts: bank, cash, wallet, investment, credit card and other
- Categories with parent/child structure
- INR-first formatting, Indian financial year support and multiple currencies
- Manual transaction editing, deletion, duplication, tags, notes, payment method and attachments
- Natural-language transaction entry and browser-native speech input when supported
- Budgets with category/date ranges and over-budget status
- Recurring transactions with automatic due generation and audit history
- Subscription tracking and monthly-equivalent cost
- Calendar and analytics
- Advanced transaction search/filter/sort
- CSV export plus user-selectable column mapping, duplicate detection and reversible import batches
- Receipt/screenshot OCR with editable review and extracted line items
- PDF text extraction and heuristic bank-statement row preview/import
- Savings goals, loans with amortization, editable investments and trips
- Net-worth snapshots and historical chart
- Credit-card utilization, statement/due dates and payment transfers
- Split expenses, people balances and settlement tracking
- Print-friendly reports / Save as PDF from the browser
- Full local JSON backup/restore, including supported attachments
- Light/dark/system theme and hidden-balance/privacy options
- PWA installability

## Important limitations

OCR and PDF statement parsing are local heuristic tools, not bank-certified importers. Always review imported data before confirming it. Bank statement layouts vary, so a particular bank may require manual correction.

A PWA cannot reproduce native iOS-only integrations such as Siri Shortcuts, Control Center widgets, Apple Pay transaction automation, or hardware-backed Face ID storage. The app intentionally does not pretend to provide those native capabilities.

No paid AI/OCR/exchange-rate service is required. Browser speech recognition, when available, is supplied by the browser and may depend on the browser/platform.
