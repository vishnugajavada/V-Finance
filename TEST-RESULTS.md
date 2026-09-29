# V-Finance test pass

## Verified in source/runtime checks
- TypeScript project check: PASS (`npm run check` / `tsc -b`)
- Core financial arithmetic: PASS (opening balance, income, expense edit/delete, paired transfer, transfer exclusion)
- CSV quoted-field parsing and normalization: PASS
- Transaction filtering/sorting: PASS
- Natural-language income parsing: PASS
- INR formatting / Indian grouping: PASS
- All declared sidebar routes have a corresponding App route/render path: PASS
- Fixed compile issue for reversible import batches (`importBatchId` typing)
- Fixed duplicate-transfer workflow so duplication creates a fresh transfer pair
- Fixed recurring audit retry logic so failed occurrences can actually be retried

## Not verified in this Linux test environment
- `npm test`: blocked by the copied Windows `node_modules` missing Rollup's Linux optional native package.
- `npm run build`: TypeScript phase passes, Vite/Rollup phase is blocked by the same missing Linux optional native package. A clean Windows `npm install` should install the Windows Rollup optional package.
- Physical iPhone Safari testing
- Network-disabled/offline browser testing
- Browser-level click/form/OCR/PDF tests against a live Windows Chrome instance

## Known product-level limitations found during audit
- Multi-currency values are stored/displayed, but there is no actual exchange-rate conversion engine; totals across different currencies must not be treated as converted totals.
- PDF statement parsing is heuristic and currently classifies extracted statement line items as expenses; bank-specific debit/credit semantics require review.
- OCR is local and heuristic; extracted fields require user confirmation.
- Smart insight helper functions exist, but the Analytics UI currently exposes only the basic analytics summary rather than all helper outputs.
- Native iOS-only integrations cannot be reproduced by the Windows PWA.
