# MediCore HMS — corrected replacement release

React 19 / TypeScript 6 / Vite 8 / Tailwind 4. Keep the supplied package-lock.json with package.json.

## Install and run

1. Keep a backup of the original project. Merge all replacement files into the original project root; keep existing unrelated files and your real `.env`.
2. Use Node 22.12+ (Node 24 was used for verification).
3. Run `npm ci`.
4. Set the public Supabase URL and publishable key in `.env`, using `.env.example` as a guide. Never put a service_role or secret key in frontend environment variables.
5. Run `supabase/migrations/202610040001_hms_setup.sql` in your own Supabase SQL Editor.
6. Create/check your account in Supabase Authentication > Users. Edit the email in `supabase/authorize-admin.sql` and run it. Only this explicit membership grants hospital access.
7. Run `npm run dev`. Sign in with the account you authorized.

The database migration creates new `hms_*` tables and an `is_hospital_admin()` function. It replaces that function if one already exists. Review any existing custom access function before applying this release. The migration is transactional and can be rerun without clearing data. It does not automatically authorize accounts or create demo records.

## Authentication redirects

In Supabase Authentication > URL Configuration, set the Site URL to your app URL and allow the exact development and deployment redirect URLs, including `/?auth=reset` for password recovery. For local development use `http://localhost:5173/` and `http://localhost:5173/?auth=reset`.

Google login is handled by Supabase. Enable/configure the Google provider in Supabase and put Supabase's displayed provider callback URL in your Google OAuth client. No separate React Google OAuth provider or `VITE_GOOGLE_CLIENT_ID` is needed by this app. Live Google login and recovery email delivery must be checked against your own account and provider configuration.

## First records

Add doctors first, then wards if you need admissions, then patients. Appointments, lab requests, visits, invoices and procedures can select those registered patients/doctors. Add staff before recording attendance.

The dashboard uses these same records. A new database starts empty. Stock-photo carousel images and news cards are illustrative content; news remains explicitly marked as demonstration content. Hospital map coordinates are blank until you configure and verify them.

## Existing browser data

Open My Profile > Data Backup & Migration. Download the old raw backup, review the old-record counts, then import if appropriate. Import only works while every database collection is empty with revision zero. It is one atomic transaction: broken relationships, invalid values or scheduling conflicts reject the entire import, and old browser storage remains untouched.

Only data actually stored by the old app is considered for import. Old static doctor/department cards and unsaved seeded patient/appointment cards are not treated as real hospital records. Legacy free-text references remain readable; link them to directory records when editing. Imported invoices keep old paid balances as undated opening balances; the app does not invent payment dates. Correct missing staff/patient references and conflicting appointments in a reviewed backup before importing. JSON backup restoration requires an administrator-managed import; this release does not blindly overwrite a populated database.

## Data and workflows

Supabase mode is the default and never silently falls back to browser storage when a request fails. Records are stored as validated JSON collections with server revision checks, administrator-only RLS, guarded RPC writes and an append-only audit table recording actor, changed IDs, time and revision. It is a single-hospital, administrator workspace, not a multi-hospital or clinical-role authorization product.

Save failures keep the editor open and display an error. Editors merge unrelated concurrent additions and reject conflicts on records that changed. Patient edits also compare the opened record with the latest record. Storage that cannot be parsed blocks writes rather than replacing records with an empty array. Data in memory is reset at account changes/logout; production hospital records are not cached in browser localStorage.

New admissions select a ward; linked admitted patients count toward capacity automatically. Discharge releases this assignment. The ward's legacy occupied value represents unassigned opening occupancy; do not duplicate an already-linked admission there. This is ward-level allocation, not a physical-bed or transfer-history subsystem.

Appointments use a duration and reject doctor/patient overlap, including overlapping legacy name-based records. Procedures reject theater/surgeon/patient overlap. Both schedules must finish on the selected date. Clinical scheduling decisions and staff availability remain administrator responsibilities.

Attendance supports an explicit next-day check-out and shifts up to 24 hours. Staff with attendance history should be made Inactive instead of deleted. Linked clinical records prevent patient/doctor/ward deletion.

Billing receives separate immutable dated receipts, uses integer paisa for receipt calculations, rejects overpayment, and allows only unpaid invoices to be edited/voided. Paid invoices and existing receipts cannot be rewritten. Voids retain history. Refunds, insurance claims, online charges and invoice line-item accounting are outside this release. Cashflow reports filter actual receipt dates and exclude undated legacy balances.

Inventory records support batch labels, expiry dates and reorder levels. They are stock records; prescription dispensing, purchase orders and stock movement ledgers are future extensions.

`VITE_HMS_DATA_MODE=local` is an explicit development-only option. It uses account-scoped browser storage and Web Locks (supported browser required), without shared-device storage or server-enforced integrity. Hospital login still requires a verified authorized Supabase account. Use the default Supabase mode for shared hospital records.

## Checks

```sh
npm run check
```

This runs source lint, unit/regression tests, database tests in PGlite (PostgreSQL), strict TypeScript checking and production build. The database tests model Supabase's roles and auth user helper locally; they do not connect to your hosted project. Unit tests cover corrupt data, stale writes, money, dates, overlaps, shifts, notification date rollover and occupancy. See VERIFICATION.md for the checks actually run.

## Deployment

Run `npm run build`, deploy the `dist` directory and configure the host to serve `index.html` for non-asset application routes. Keep `.env` files out of source control. Set deployment environment values before building, configure Supabase redirects for the deployment origin, and verify signed-in/admin and denied-access paths on that deployment.

Routes and the Leaflet map load lazily. React, animation and Supabase are separate cached bundles. Do not suppress build errors or warnings as a substitute for fixing them.

## Remaining extensions

For a larger production hospital, move collections to normalized per-record tables with pagination and native foreign keys; the current JSON collections validate all rows and use a hospital-wide transactional lock. Each collection is capped at 10,000 records, and overlap checks should be redesigned before large datasets. Add physical-bed/admission history, stock movement ledgers, granular clinical roles, a real announcements CMS, and an appropriate backup/restore and operational review process according to the hospital's requirements. These are architecture/product extensions, not enabled features in this replacement ZIP.
