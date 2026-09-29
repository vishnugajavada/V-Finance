# V-Finance

V-Finance is a local-first personal finance and expense management application built for everyday financial tracking. It is designed around a simple principle: financial data should remain under the user's control without requiring an account, bank connection, or paid cloud service.

The project focuses on practical personal finance workflows used in India while keeping the underlying architecture flexible enough for other currencies and use cases.

## Overview

V-Finance provides a single place to record transactions, manage accounts, track budgets and recurring payments, monitor loans and investments, analyze spending, import bank statements, and maintain backups.

The application runs in the browser and stores user data locally using IndexedDB through Dexie. This allows the core application to operate without a backend and supports offline use after the application shell has been cached.

## Main Objectives

- Keep financial data local to the user's device.
- Avoid mandatory accounts, login systems, and bank integrations.
- Provide consistent transaction and balance calculations.
- Support Indian financial workflows such as INR, UPI, EMI, SIP, and the April–March financial year.
- Make imports and automated extraction reviewable before they affect financial data.
- Provide a responsive interface for desktop and mobile browsers.
- Package the application as a Progressive Web App (PWA).
- Keep the project deployable using free and widely available tooling.

## Features

### Transaction Management

- Income, expense, and transfer transactions
- Create, edit, and delete transactions
- Merchant, category, account, notes, and date information
- Transfer pairing between source and destination accounts
- Transfers excluded from income and expense totals
- Duplicate-aware transaction imports
- Validation for invalid accounts, categories, amounts, and references
- Multiple currency support with INR as a primary use case

### Accounts and Net Worth

- Multiple financial accounts
- Opening balances
- Current balance calculations
- Account-level transaction history
- Net worth calculation
- Historical net-worth snapshots and charts
- Balance visibility controls

### Budgets and Recurring Payments

- Category-based budgets
- Budget progress tracking
- Recurring transaction definitions
- Due transaction generation
- Recurring transaction audit history
- Subscription tracking
- Monthly subscription cost calculation

### Analytics and Reports

- Income and expense summaries
- Savings rate
- Category-wise spending
- Merchant-wise spending
- Average daily spending
- Largest transactions
- Monthly transaction calendar
- Advanced transaction filters
- Global transaction search
- Printable financial reports

### Import and Export

- CSV export
- CSV import with preview and custom mapping
- Duplicate detection before import
- Reversible import batches
- JSON backup and restore
- PDF bank statement extraction
- PDF transaction import with validation
- OCR receipt and screenshot scanning
- Review-before-save OCR workflow

Imports are treated as reviewable operations rather than automatically modifying financial records.

### Personal Finance Tools

- Savings goals
- Loans
- Manual investments
- Credit cards
- Credit-card payment history
- Statement and due-date tracking
- Credit utilization information
- Split expenses
- People and settlement balances
- Trips and transaction assignment
- Transaction attachments

### Input Methods

- Manual transaction entry
- Natural-language transaction entry
- Browser speech input when supported
- OCR receipt and screenshot extraction
- PDF statement extraction

Natural-language and OCR features populate transaction information for review. They do not bypass the normal confirmation flow.

### Settings and Privacy

- Currency selection
- Financial year configuration
- Date format
- Light, dark, and system themes
- Hidden balance option
- Persistent settings
- Local JSON backup and restore
- Clear-data confirmation

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Build tool | Vite |
| Styling | CSS / responsive UI |
| Local database | IndexedDB |
| Database wrapper | Dexie |
| Testing | Vitest |
| Browser verification | Playwright / browser testing |
| PDF processing | PDF.js |
| OCR | Browser-compatible OCR pipeline |
| PWA | Web App Manifest + Service Worker |
| Deployment | GitHub Pages |
| Source control | Git / GitHub |

The application is intentionally designed without a required application server or hosted database.

### Data Flow

1. The user performs an action in the React interface.
2. Feature-level logic validates the requested operation.
3. Service-layer functions perform calculations and database operations.
4. Dexie stores application data in IndexedDB.
5. The UI reads the updated state and renders the result.

This keeps persistence and financial logic separate from presentation components.

### Local-First Model

There is no required remote database for normal application use.

```text
Laptop Chrome
    └── IndexedDB

iPhone Safari
    └── Separate IndexedDB
```

Data does not automatically synchronize between devices. JSON backup and restore can be used to move data between devices.

## Financial Data Handling

Financial calculations are treated differently from ordinary UI values.

Important rules include:

- Transfers do not count as income.
- Transfers do not count as expenses.
- Account balances are derived from the underlying transaction data.
- Invalid account and category references are rejected.
- Imported records are validated before being committed.
- Duplicate imports are identified before insertion.
- Backup restoration is performed as a controlled database operation.
- Editing or deleting a transaction updates affected balances and summaries.

For a finance application, a visually correct interface is not enough; the underlying calculations must remain consistent.



## Getting Started

### Requirements

- Node.js
- npm
- Git
- A modern Chromium, Firefox, Safari, or Edge browser

### Clone the Repository

```bash
git clone https://github.com/vishnugajavada/V-Finance.git
cd V-Finance
```

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npm run dev
```

Open the local address displayed by Vite, normally:

```text
http://localhost:5173
```

### Run Checks

```bash
npm run check
npm test
npm run build
```

## Production Build

Create a production build with:

```bash
npm run build
```

The generated output is placed in `dist/`.

## GitHub Pages Deployment

The repository includes a GitHub Actions workflow for deployment.

After GitHub Pages is configured to use **GitHub Actions** as the publishing source, pushes to the main branch can trigger the deployment workflow.

Production site:

https://vishnugajavada.github.io/V-Finance/

## PWA and Offline Support

V-Finance is packaged as a Progressive Web App.

The production build includes:

- Web App Manifest
- Application icon
- Service worker
- Cached application assets
- Offline application shell
- Local IndexedDB storage

On iPhone Safari:

1. Open the deployed application.
2. Select **Share**.
3. Select **Add to Home Screen**.
4. Launch V-Finance from the Home Screen.

PWA behavior varies by operating system and browser version.

## Testing and Verification

The project has been verified at both application and build levels.

Current verification includes:

- TypeScript/project checks
- Automated test suite
- Production build
- Dependency vulnerability audit
- Browser-based financial workflows
- Backup and restore round-trip
- CSV duplicate detection
- PDF import
- OCR review workflow
- Transfer calculations
- Transaction edit/delete behavior
- Mobile layout checks
- Offline production-shell verification

The current automated test suite contains **40 tests across 11 test files**.

Detailed verification records are maintained in `TEST-RESULTS.md`.

## Example Financial Workflow

```text
Opening balance
Main Bank       ₹50,000
Savings         ₹0

Income          +₹40,000
Expense         -₹5,000
Transfer        ₹2,000
                Main Bank → Savings

Result
Main Bank       ₹83,000
Savings         ₹2,000
Total           ₹85,000

Income          ₹40,000
Expenses        ₹5,000
Transfers       Excluded from income/expense totals
```

## Security and Privacy

V-Finance does not require a user account for its core functionality and does not use a project-owned backend for ordinary financial records.

Because data is stored locally:

- Clearing browser storage can remove application data.
- Browser profiles are separate.
- Different devices do not automatically share data.
- Important records should be backed up.
- JSON backup can be exported for recovery or migration.

V-Finance should not be considered a replacement for a bank's official records or enterprise-grade financial storage.

## Current Limitations

### Device-Specific Limitations

Browser-based applications cannot fully reproduce some platform-native capabilities, including:

- Siri Shortcuts integration
- Native iOS Control Center integrations
- Apple Pay automation
- Hardware-backed Face ID authentication
- Native iOS widgets
- Direct OS-level financial automation

### Browser-Dependent Functionality

Some capabilities depend on browser support and permissions:

- Microphone access for speech input
- Camera/file access for receipt scanning
- OCR accuracy
- PDF extraction quality
- File-system behavior
- Installed PWA behavior

These features are optional enhancements and are not prerequisites for core transaction management.

## Design Principles

### Local First

Financial records should remain usable without an account or remote backend.

### Explicit Confirmation

Operations that can change financial data, particularly imports and OCR extraction, should provide a review step before committing changes.

### Predictable Calculations

Balances, income, expenses, transfers, and net worth follow explicit accounting rules rather than UI assumptions.

### Recoverability

Important operations support backup, restore, and reversible import workflows where practical.

### Responsive by Default

The interface is designed for desktop and mobile browser widths.

### Minimal Infrastructure

The core product uses static hosting and browser storage rather than requiring paid servers or managed databases.

## Development Guidelines

When modifying the project:

1. Keep financial calculations in service/business logic rather than duplicating them in UI components.
2. Validate imported data before writing to IndexedDB.
3. Preserve transfer pairing rules.
4. Use Dexie migrations when changing the database schema.
5. Run checks and tests after changes.
6. Verify the production build before deployment.
7. Never commit `.env` files, API keys, credentials, or local database data.
8. Test responsive layouts at both desktop and mobile widths.

## Repository

GitHub: https://github.com/vishnugajavada/V-Finance

## License

This project is currently maintained as a personal software project. Licensing terms can be added here if it is later released under an open-source license.

## Project Status

V-Finance is a working personal finance application with transaction management, accounts, budgets, recurring payments, analytics, import/export, personal finance tools, PWA support, and backup/restore workflows implemented.

The project is ready for continued development and real-world testing. Device-specific browser behavior and platform-native features should be evaluated separately from the core application.

## 👤 Author

**Gajavada Vishnu**
M.Tech Integrated Software Engineering — VIT Vellore (2021–2026)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Vishnu%20Gajavada-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/vishnu-gajavada-380631279/)
[![GitHub](https://img.shields.io/badge/GitHub-vishnugajavada-181717?style=flat&logo=github)](https://github.com/vishnugajavada)

---



---

> ⭐ If you found this project helpful, consider giving it a star!

