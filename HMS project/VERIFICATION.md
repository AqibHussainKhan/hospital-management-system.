# Verification — 4 October 2026

## Automated checks

- Source lint: passed (`oxlint src vite.config.ts`). Dependencies are excluded from lint.
- Strict TypeScript and Vite production build: passed.
- `npm test`: 30 reported tests passed, 0 failed.
- PostgreSQL-compatible PGlite ran the actual supplied migration twice to check rerun safety.
- Database checks verified anonymous denial, signed-in non-admin denial, prevention of self-promotion, admin reads, denial of direct table writes, revision conflicts, ward limits, protected references, appointment clashes, immutable receipts, append-only audit access and atomic legacy import with preserved opening balances.
- Application regression checks covered corrupt browser data, account resets, stale additions/edits/deletes, JSONB field ordering, exact decimal-to-paisa conversion, overnight shifts, date/time validation, notification date rollover, undated payment balances and maintenance-bed capacity.

## Browser checks

Headless Chromium exercised the production build using synthetic users and records. Supabase HTTP endpoints were intercepted: authentication responses were mocked, and record reads/writes ran against the supplied SQL in a local PGlite database. No real account, credential, patient data or hosted Supabase project was used.

Passed: sign-in and dashboard; doctor creation/detail dialog; linked patient registration; linked appointment booking; linked laboratory request; invoice creation and payment receipt (the persisted paid amount was asserted in the database); pharmacy, wards, theater, staff, attendance, reports, analytics, settings and profile routes; mobile navigation opening and Escape dismissal; manual dark/light theme; no uncaught browser page errors.

External photos/fonts were blocked during browser checks, so screenshots used their fallback appearance. Live OAuth, recovery email delivery, hospital map coordinates, deployment redirects and your hosted database configuration require your own configured environment.

## Production output

The entry JavaScript file is about 55 kB minified, with separate React, animation and Supabase vendor chunks plus route/map chunks. The largest emitted JavaScript chunk is about 259 kB. No CSS import-order or large-chunk warning remains. Separate vendor chunks are still downloaded when required; 55 kB is not the total cold-start download size.

## Scope

The release provides working shared records and guarded database persistence for the existing administrator app. It does not claim a full hospital ERP, live-provider verification or a regulatory certification. Product/architecture extensions such as granular clinical roles, physical bed-transfer history, inventory movement accounting and an announcements CMS are described in README.md.

Official references used for implementation:
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase database functions: https://supabase.com/docs/guides/database/functions
- Tailwind selector-based dark mode: https://tailwindcss.com/docs/dark-mode
- React lazy: https://react.dev/reference/react/lazy
- Rolldown splitting: https://rolldown.rs/reference/OutputOptions.codeSplitting
