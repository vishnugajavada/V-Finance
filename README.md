import pypandoc
from pathlib import Path

content = """# V-Finance

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

## Architecture

V-Finance follows a local-first browser architecture.

```text
                    V-Finance
                        |
              +---------+---------+
              |                   |
          React UI          Browser APIs
              |                   |
       +------+-------+     +-----+------+
       |              |     |            |
   Feature Logic   Services  Speech      Files
       |              |     |            |
       +------+-------+     +-----+------+
              |                   |
              +---------+---------+
                        |
                      Dexie
                        |
                   IndexedDB
