# Verification — Admin and Staff Release

Verified locally on 12 October 2026 with Node 24.19.0.

## Completed checks

| Check | Result |
| --- | --- |
| `npm run check` | Passed: lint, all tests, TypeScript and Vite production build |
| Test suite | 58 tests passed; 0 failures, cancellations or skipped tests |
| Final targeted roles suite after additional scope assertions | 19 tests passed; 0 failures |
| Edge Function strict type check | Passed with equivalent npm import and minimal Deno runtime declarations |
| ZIP integrity | CRC and file-set checked during packaging; real env files, dependencies and build output excluded |

Source lint has nonfatal React warnings; there are no lint errors. The production build passed without suppressing TypeScript errors.

## What the tests establish

The local PostgreSQL-compatible PGlite tests model Supabase auth identities, roles and RLS. They exercise migration install/rerun, revoked private helpers, server role scopes, projected patient privacy, department/ward assignments, upcoming appointment/surgery care access, OT patient selection, lab queue/report policies, stale/null revisions, hidden-record preservation and immutable clinical/financial history.

They also exercise atomic medicine dispensing, quantity/expiry/receipt rules, unpaid invoice void approval, personal leave and attendance access, self-approval denial, workforce corrections, overnight/overlapping shifts, role deactivation, permission revocation, backup/audit access and protection of the last administrator. Store tests cover late responses after scope changes, cleared denied data, conflicts, money/date/shift bounds, occupancy and notifications.

## Browser evidence and limits

Earlier checks in this implementation exercised 12 roles across 51 page views using a headless browser and intercepted synthetic Supabase responses, with zero page JavaScript errors. Light/dark search focus, dialogs, account permissions, mobile navigation and notifications were inspected. These fixtures did not send real messages or change a hosted database.

The final browser rerun after the last refinements could not launch because the native Chromium process crashed before opening the app. The final code was subsequently verified by the test suite, role tests, strict type checking and production build; a fresh real-browser check on the user's deployment remains necessary. No final hosted-browser smoke test is claimed.

The Edge Function was type-checked locally, not deployed or executed against hosted Supabase. Hosted SQL migrations, Storage behavior on the actual project, real account onboarding, Google OAuth and invitation/reset email delivery still need the setup and acceptance checks in SETUP_Roman_Urdu.md.
