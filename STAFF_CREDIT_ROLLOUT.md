# Staff Permissions and VIP Credit Rollout

## Deployment Order

Deploy the backend in `Vinoff Backend Sys` before deploying this frontend. The
new UI requires the staff and credit-approval endpoints. No live account,
credit amount, payment, or permission has been changed by the implementation.

MongoDB must support transactions (Atlas or a replica set). The backend already
uses transactions for Paystack settlement; order and credit changes now use
them as well. Allow the new CreditLimitRequest model to create its partial
unique index, which permits only one pending request per customer.

## Owner Setup

1. Verify an existing owner account has the exact backend role `superadmin`.
   Ordinary `admin` accounts are no longer treated as super admins by the UI.
2. Sign in as that super admin and open Administration > Staff Permissions.
   Existing and new ordinary admins default to no operational permissions until
   the owner assigns them. Super admins retain full access.
3. Open each VIP customer profile and set their approved credit limit. The
   default is NGN 0, never unlimited. Existing debt is retained even if it
   exceeds the new limit; further credit is blocked, but Paystack payments work.
4. Grant `credit.request` and customer-view access to staff who should request
   changes. A request does not alter the current limit. Review its notification
   in Credit Approvals and explicitly approve or reject it.

## Behavior

- Limits cover all unpaid credit invoices, including manually issued credit
  invoices. Concurrent credit orders share the same limit. Failed transactions
  roll back their stock, invoice and order changes.
- Paystack settlement frees credit allowance once. Credit-limit changes do not
  mark invoices paid, erase debt or bypass Paystack verification.
- All ordinary-admin limit changes require super-admin review. Super admins
  can set a limit directly; direct changes invalidate older pending requests.
- Permission checks cover API aliases, invoice downloads, stock-only changes,
  multipart product edits and staff notifications, not just sidebar visibility.
- Reorder prepares a cart using current prices and stock. Unavailable items are
  skipped or reduced with a notice. Replacing an existing cart needs confirmation.
  It never creates an order or charges a payment by itself.
- Historical payment receipts and expense evidence remain available. New
  checkout instructions, invoice PDFs and settings use Paystack.

## Verification

Frontend tests: `node --test tests/*.test.js`; production build: `npm run build`.
Backend tests: `node --test tests/*.test.js` from the backend directory.

The database integration suite is opt-in. It requires a disposable local replica
set on port 27028 and `VINOFF_TEST_MONGO_URI` pointing to database
`vinoff_credit_qa`. It refuses other hosts, ports or database names, clears only
that test database, disables outbound email and mocks Paystack verification.
Never point tests at production. The browser QA used separate fake accounts in
another isolated local database, not real customer accounts.
