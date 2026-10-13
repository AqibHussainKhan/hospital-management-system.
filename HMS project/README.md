# MediCore HMS — Admin and Staff Portals

React 19, TypeScript 6, Vite 8, Tailwind 4 and Supabase. This update adds verified role-based hospital access to the existing project and retains the shared professional search/form focus styling.

Start with **[SETUP_Roman_Urdu.md](SETUP_Roman_Urdu.md)** for the complete installation order. **[FILE_REPLACEMENTS.md](FILE_REPLACEMENTS.md)** identifies the actual changed/new files and code line numbers. **[VERIFICATION.md](VERIFICATION.md)** records validation and its limits.

## Features

- Full administrator workspace, user onboarding/invitations/password reset, role permissions, hospital settings, audit and backup.
- Separate workspaces for doctors, nurses, reception, laboratory, pharmacy, billing, HR, wards, OT coordination, department heads and support staff.
- Server-checked record scopes, projected basic patient information for nonclinical roles, guarded routes/actions and scope-aware data clearing.
- Append-only clinical/nursing notes, prescriptions and vitals; private lab PDFs; transactional prescription dispensing.
- Duty rosters, leave and attendance correction approvals; dated financial receipts and unpaid invoice void approvals.
- Shared themed search/form controls, accessible dialogs, filtered notifications, mobile navigation, scoped reports and CSV exports.

## Install

Use Node 22.12+ and keep the supplied package lock. Configure public Supabase environment values from `.env.example`, with `VITE_HMS_DATA_MODE=supabase`.

```sh
npm ci
npm run dev
npm run check
```

Existing databases need the two `20261011000*` migrations under `src/supabase/migrations`. New databases need the original setup migration first. Apply migrations in the order in the setup guide, then deploy the `hms-users` Edge Function from the root `supabase` folder. Existing admins are preserved; new installations use the supplied owner-only bootstrap SQL after creating the Auth account.

Live hosted migrations/function deployment and email delivery have not been performed for your Supabase project. Never place server/secret keys in frontend variables. Configure auth redirects, SMTP and CORS for your own deployment. Build with `npm run build`; the host must serve `index.html` for app routes.

## Data and scope

Supabase mode uses shared hospital records and never silently falls back to browser data. Admin-only demo/local mode remains available for isolated previews; it does not provide the new shared clinical/workforce features. See [DUMMY-DATA-GUIDE.md](DUMMY-DATA-GUIDE.md). The archive contains no real `.env`.

Legacy free-text references must be linked to actual directory IDs before scoped staff access works. Existing records remain intact during the role upgrade. Hospital photos/news cards are illustrative; verify configured map coordinates before use. Footer destinations are configured as described in [FOOTER-GUIDE.md](FOOTER-GUIDE.md).

The implementation is for one hospital. Existing collection storage validates JSON records and caps each collection at 10,000 rows. Large installations need a normalized data architecture. Physical-bed/transfer history, payroll, purchase orders, full stock movement ledgers, refunds, insurance and multi-hospital tenancy remain separate extensions.

Backup exports include application records and access/workflow metadata, but not Auth passwords or Storage report bytes. Legacy import is empty-database-only; populated-database restoration requires an operator-managed process.
