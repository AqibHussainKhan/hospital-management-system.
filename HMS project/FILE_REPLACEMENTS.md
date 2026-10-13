# File replacements and exact line references

Paths are relative to the extracted **HMS-project** root. This list compares the completed update against the latest supplied HMS-project.zip. The line references below are from these final supplied files; your old files may have different line numbers.

**Recommended:** use the entire extracted folder, retain your own public Supabase environment values and follow SETUP_Roman_Urdu.md. For a manual merge, add/replace every listed file as a whole. Do not paste isolated role checks into old files: shared types, stores, routes, SQL and account function depend on each other.

SQL files are added to the code folder and must also be applied in Supabase. Existing databases run the two new role/storage migrations in order; new databases run the original base setup first. The root supabase folder contains the deployable account function. Environment mode is `supabase`.

## Entire-file replacement list

| File | Action | Key line(s), or beginning |
| --- | --- | --- |
| `.env.example` | Replace entire file | 1 |
| `CHANGED-FILES.md` | Replace entire file | 1 |
| `DUMMY-DATA-GUIDE.md` | Replace entire file | 1 |
| `README.md` | Replace entire file | 1 |
| `SETUP_Roman_Urdu.md` | Add new file | 1 |
| `VERIFICATION.md` | Replace entire file | 1 |
| `src/App.tsx` | Replace entire file | 1 |
| `src/components/administration/DataTools.tsx` | Replace entire file | 1 |
| `src/components/administration/DepartmentRecords.tsx` | Replace entire file | 1 |
| `src/components/administration/shared.tsx` | Replace entire file | 1 |
| `src/components/common/WorkspaceControls.tsx` | Add new file | 7, 68 |
| `src/components/dashboard/HospitalNews.tsx` | Replace entire file | 1 |
| `src/components/layout/Navbar.tsx` | Replace entire file | 145 |
| `src/components/layout/NotificationsPanel.tsx` | Replace entire file | 1 |
| `src/components/layout/Sidebar.tsx` | Replace entire file | 88 |
| `src/components/layout/WorkspaceNotifications.tsx` | Add new file | 1 |
| `src/components/layout/profileNavigation.ts` | Replace entire file | 37 |
| `src/components/patients/PatientDetails.tsx` | Replace entire file | 1 |
| `src/components/patients/PatientEditor.tsx` | Replace entire file | 1 |
| `src/data/activityModel.ts` | Replace entire file | 1 |
| `src/data/moduleRegistry.ts` | Add new file | 1 |
| `src/data/notificationStore.ts` | Replace entire file | 1 |
| `src/data/recordCore.ts` | Replace entire file | 24 |
| `src/data/recordStore.ts` | Replace entire file | 25, 173 |
| `src/data/workModel.ts` | Add new file | 1 |
| `src/features/access/accessModel.ts` | Add new file | 121 |
| `src/features/access/rpc.ts` | Add new file | 1 |
| `src/features/access/useAccess.ts` | Add new file | 1 |
| `src/features/access/usePersonalNotifications.ts` | Add new file | 1 |
| `src/features/auth/HospitalAuthProvider.tsx` | Replace entire file | 203 |
| `src/features/auth/authService.ts` | Replace entire file | 1 |
| `src/index.css` | Replace entire file | 255, 242, 306 |
| `src/pages/access/AuditLog.tsx` | Add new file | 1 |
| `src/pages/access/HospitalSettings.tsx` | Add new file | 1 |
| `src/pages/access/UsersRoles.tsx` | Add new file | 111, 172 |
| `src/pages/administrator/Administrator.tsx` | Replace entire file | 1 |
| `src/pages/appointments/Appointments.tsx` | Replace entire file | 1 |
| `src/pages/attendance/Attendance.tsx` | Replace entire file | 1 |
| `src/pages/auth/Login.tsx` | Replace entire file | 1 |
| `src/pages/billing/Billing.tsx` | Replace entire file | 1 |
| `src/pages/patientAnalytics/PatientAnalytics.tsx` | Replace entire file | 1 |
| `src/pages/patients/Patients.tsx` | Replace entire file | 1 |
| `src/pages/reports/Reports.tsx` | Replace entire file | 1 |
| `src/pages/settings/Settings.tsx` | Replace entire file | 1 |
| `src/pages/staff/Staff.tsx` | Replace entire file | 1 |
| `src/pages/workspace/ModuleWorkspace.tsx` | Add new file | 103, 240, 285, 329 |
| `src/pages/workspace/ScopeReports.tsx` | Add new file | 1 |
| `src/pages/workspace/StaffDashboard.tsx` | Add new file | 1 |
| `src/pages/workspace/WorkPage.tsx` | Add new file | 82, 227 |
| `src/routes/AppRoutes.tsx` | Replace entire file | 44, 62 |
| `src/supabase/authorize-admin.sql` | Replace entire file | 1 |
| `src/supabase/migrations/202610110001_hms_roles.sql` | Add new file | 3, 50, 62, 123, 133, 192, 577, 653, 729, 758 |
| `src/supabase/migrations/202610110002_hms_report_storage.sql` | Add new file | 4, 18, 20 |
| `src/tests/access.test.cjs` | Add new file | 1 |
| `src/tests/records.test.cjs` | Replace entire file | 1 |
| `src/tests/roles.test.cjs` | Add new file | 1 |
| `supabase/config.toml` | Add new file | 1 |
| `supabase/functions/hms-users/index.ts` | Add new file | 23, 27 |
| `FILE_REPLACEMENTS.md` | Add new file | 1 |

## Where the main changes are

| File | Line | Purpose |
| --- | --- | --- |
| `src/components/common/WorkspaceControls.tsx` | 7 | Shared search control |
| `src/components/common/WorkspaceControls.tsx` | 68 | Accessible dialog |
| `src/components/layout/Navbar.tsx` | 145 | Patient search access |
| `src/components/layout/Sidebar.tsx` | 88 | Menu permission filter |
| `src/components/layout/profileNavigation.ts` | 37 | Central menu definition |
| `src/data/recordCore.ts` | 24 | Stale editor guard |
| `src/data/recordStore.ts` | 25 | Scope reset |
| `src/data/recordStore.ts` | 173 | Scoped server reads |
| `src/features/access/accessModel.ts` | 121 | Default role permissions |
| `src/features/auth/HospitalAuthProvider.tsx` | 203 | Server membership verification |
| `src/index.css` | 255 | Search wrapper focus |
| `src/index.css` | 242 | Inner search focus reset |
| `src/index.css` | 306 | Form field focus |
| `src/pages/access/UsersRoles.tsx` | 111 | Account create/update |
| `src/pages/access/UsersRoles.tsx` | 172 | Password reset |
| `src/pages/workspace/ModuleWorkspace.tsx` | 103 | Role-specific editor fields |
| `src/pages/workspace/ModuleWorkspace.tsx` | 240 | Save record |
| `src/pages/workspace/ModuleWorkspace.tsx` | 285 | Dated payment receipt |
| `src/pages/workspace/ModuleWorkspace.tsx` | 329 | Unpaid invoice void |
| `src/pages/workspace/WorkPage.tsx` | 82 | Clinical and workforce page |
| `src/pages/workspace/WorkPage.tsx` | 227 | Save work API |
| `src/routes/AppRoutes.tsx` | 44 | Route access guard |
| `src/routes/AppRoutes.tsx` | 62 | Role-aware module routing |
| `src/supabase/migrations/202610110001_hms_roles.sql` | 3 | Membership table |
| `src/supabase/migrations/202610110001_hms_roles.sql` | 50 | Access API |
| `src/supabase/migrations/202610110001_hms_roles.sql` | 62 | Patient scope |
| `src/supabase/migrations/202610110001_hms_roles.sql` | 123 | Scoped collection read |
| `src/supabase/migrations/202610110001_hms_roles.sql` | 133 | Permission-checked row merge |
| `src/supabase/migrations/202610110001_hms_roles.sql` | 192 | Update account assignment |
| `src/supabase/migrations/202610110001_hms_roles.sql` | 577 | Record save and revision guards |
| `src/supabase/migrations/202610110001_hms_roles.sql` | 653 | Work save |
| `src/supabase/migrations/202610110001_hms_roles.sql` | 729 | Approval decision |
| `src/supabase/migrations/202610110001_hms_roles.sql` | 758 | Atomic dispensing |
| `src/supabase/migrations/202610110002_hms_report_storage.sql` | 4 | Private report access |
| `src/supabase/migrations/202610110002_hms_report_storage.sql` | 18 | Report read policy |
| `src/supabase/migrations/202610110002_hms_report_storage.sql` | 20 | Report upload policy |
| `supabase/functions/hms-users/index.ts` | 23 | Server account handler |
| `supabase/functions/hms-users/index.ts` | 27 | App redirect/CORS settings |

Search and editor controls should reuse `SearchField` / `hms-navbar-search`, `hms-navbar-search-input`, `hms-form-field` and `hms-patient-status-filter`. Keep the focus CSS together with the matching TSX class names. If another Tailwind focus outline/ring remains on the inner input, remove that conflicting class at its source.

Changing `defaultPermissions` alone does not update installed database permissions. Live role permissions are managed under Users & Roles and stored in Supabase; the SQL defaults seed new installations without resetting an admin's existing choices on rerun.

Do not copy node_modules, dist or real environment values from another project. Real env files and secret keys are intentionally absent from this ZIP.
