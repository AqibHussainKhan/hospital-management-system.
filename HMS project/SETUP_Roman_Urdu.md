# MediCore HMS — Admin aur Staff Setup

Updated: 12 October 2026

Yeh complete React/TypeScript project hai. Admin ko tamam hospital modules aur account controls milte hain. Staff ko verified login ke role, department, doctor aur ward assignment ke mutabiq workspace milta hai. Role browser mein select karke access hasil nahi hota; Supabase membership aur permissions check karta hai.

## 1. Project replace aur run

1. Apne purane project aur database ka backup rakh lein.
2. `HMS-project.zip` extract karke naya `HMS-project` folder open karein. Complete folder use karna sab se asaan hai. Sirf kuch TSX files copy karne se poora access system install nahi hoga.
3. Apni existing public Supabase URL aur publishable key `.env` mein rakhein. ZIP mein asli `.env` aur secret keys shamil nahi hain. `.env.example` ko template samjhein:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
VITE_HMS_DATA_MODE=supabase
```

4. Agar `.env.local` ya deployment environment mein purani `demo` setting ho, use bhi `supabase` karein. Environment change ke baad dev server restart ya production build dobara karein.
5. Node.js 22.12+ install ho. Project root mein:

```sh
npm ci
npm run dev
```

Production aur verification:

```sh
npm run check
npm run build
```

`package.json` aur `package-lock.json` dono saath rakhein. Production host ko non-asset routes ke liye `index.html` serve karna hoga.

## 2. Supabase SQL: sahi order

Apne Supabase project ka SQL Editor open karein. Neeche har file ka **poora SQL** alag run karein.

| Database ki halat | Kya run karna hai |
| --- | --- |
| Existing HMS database: `hms_collections` aur original setup pehle se installed | Pehle `src/supabase/migrations/202610110001_hms_roles.sql`, phir `src/supabase/migrations/202610110002_hms_report_storage.sql` |
| Bilkul naya database | Pehle `src/supabase/migrations/202610040001_hms_setup.sql`, phir roles migration, phir report storage migration |

Existing database mein sirf role upgrade ke liye original base migration dobara run na karein. Base migration purane administrator-only function definitions rakhti hai; roles migration unhein updated access model se replace karti hai. Roles migration existing records clear nahi karti aur pehle se authorized admins ko membership mein copy karti hai. Storage migration private `hms-lab-reports` bucket banati/configure karti hai.

In SQL files ko browser/frontend se execute nahi karna. SQL Editor database-owner context mein use karein. Pehle se custom `hms_*` policies/functions hon to unki modifications upgrade ke saath reconcile karein.

### Pehla admin account

- Existing authorized admin roles migration ke baad admin hi rahega.
- Naye project mein Supabase **Authentication > Users** mein admin login create karein.
- `src/supabase/authorize-admin.sql` mein `YOUR_ADMIN_EMAIL@example.com` ko us existing login email se replace karein, phir poora SQL Editor mein run karein.
- Yeh bootstrap database owner karta hai. Baad ke accounts app ke **Users & Roles** page se manage honge.

## 3. Users account function deploy karna

`supabase/functions/hms-users/index.ts` aur root `supabase/config.toml` project mein diye gaye hain. Yeh backend function **new login, invitation aur password reset** ke liye zaroori hai. Existing account ki membership/permissions SQL RPCs se edit hoti hain.

Project root se Supabase CLI use karein:

```sh
npx supabase login
npx supabase secrets set APP_URL=http://localhost:5173 CORS_ALLOWED_ORIGINS=http://localhost:5173 --project-ref YOUR_PROJECT_REF
npx supabase functions deploy hms-users --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` apne hosted project ka reference hai; config ka local `project_id` uski jagah nahi hai. Production mein `APP_URL` apni app URL aur `CORS_ALLOWED_ORIGINS` allowed origins ki comma-separated list rakhein. Misal:

```sh
npx supabase secrets set APP_URL=https://hms.example.com CORS_ALLOWED_ORIGINS=https://hms.example.com,http://localhost:5173 --project-ref YOUR_PROJECT_REF
```

`APP_URL` invitation/reset ka return address bhi hai. Supabase function apne platform-injected public/server keys use karti hai; modern default key dictionaries aur legacy key variables dono supported hain. **Secret/service-role key ko `VITE_` variables, TSX, frontend bundle ya browser mein na rakhein.**

Config mein `verify_jwt = false` platform gateway ke liye hai. Function khud bearer token ko Supabase Auth se verify karti hai aur har account action se pehle current admin membership check karti hai. Is custom verification ko remove na karein.

Official CLI/key references: [Function deployment](https://supabase.com/docs/guides/functions/deploy), [Function secrets](https://supabase.com/docs/guides/functions/secrets).

## 4. Login, invitation aur reset email

Supabase **Authentication > URL Configuration** mein Site URL app URL rakhein aur development/production redirect URLs allow karein. Local development ke liye `http://localhost:5173/**` aur production ke liye apni exact origin ke required redirect paths configure karein. Invitation/reset query parameters bhi in allowed URLs par return honge.

- Google login chahiye to Supabase Google provider aur OAuth callback configure karein. Google login bhi membership ke baghair hospital access nahi deta.
- Invitation aur reset email ke liye Supabase email/SMTP configuration aur delivery check karein.
- Email delivery abhi configured nahi ho to admin **Create with password** use kar sakta hai. Initial password kam az kam 12 characters ka ho.
- Email pehle se Auth mein maujood ho to duplicate account create na karein; Login accounts mein existing/unassigned account ka access edit karein.
- Agar Auth account create ho jaye lekin staff link fail ho, Login accounts refresh karke us unassigned account ko valid staff/department/ward assign karein.

## 5. Admin se staff onboarding

1. Admin login karein. Hospital Settings mein hospital name, address, phone, email aur department directory save karein.
2. Doctor Directory mein active doctors aur Wards & Beds mein wards create/check karein.
3. Staff Directory mein employee create karein. Department name doctor/employee/account ke darmiyan exact match ho.
4. **Users & Roles > Login accounts > New account** open karein. Email/name, role, active staff aur department choose karein.
5. Doctor role ke liye same department ka **active Doctor record** bhi link karein. Nurse aur Ward In-charge ke liye kam az kam ek ward assign karein.
6. Invitation ya password method choose karke save karein. Employee usi common login page par sign in karega; role workspace automatically milega.

Staff ki job designation aur login authorization role alag cheezen hain. Staff Directory mein designation likhne se admin access nahi milta. Account ki role/member assignment Users & Roles mein hoti hai. Ek staff/doctor record ko duplicate login memberships se link karna blocked hai.

Existing legacy patient/appointment/test records mein sirf free-text doctor/patient name ho aur `doctorRef`/`patientRef` missing ho to admin unhein directory records se link kare. Staff scope IDs se check hota hai; same naam likhna assignment nahi hai.

## 6. Default role options

Har staff role ko apni attendance, duty roster, leave request, relevant request status aur profile milta hai. HR/department leads ko in modules mein broader team access mil sakta hai.

| Role | Main options | Records ka scope |
| --- | --- | --- |
| Admin | Tamam hospital modules, clinical work, billing, staff, reports, users, permissions, audit, settings, backup | Poora single-hospital workspace |
| Doctor | Assigned patients, own appointments, clinical notes, prescriptions, vitals view, lab requests/results, own surgical schedule | Primary doctor assignments aur current assigned appointment/surgery ke patients; own appointment/surgery summaries |
| Nurse | Assigned admitted patients, nursing notes, vitals entry, lab/results, prescriptions view | Assigned wards ke admitted patients |
| Receptionist | Patient registration/update, appointments, doctor directory, ward availability | Registration/basic patient information; private clinical notes nahi |
| Lab Staff | Hospital test queue, sample status, results, private PDF reports, export | Existing test orders ke linked basic patient details; clinical notes nahi |
| Pharmacist | Inventory batches/expiry/stock, prescriptions, partial/complete dispensing | Prescriptions aur relevant basic patient details; clinical notes nahi |
| Cashier / Billing | Unpaid invoices, receipts, print/PDF receipt, financial reports, invoice void requests | Billing aur basic patient information; clinical notes nahi |
| HR / Attendance | Staff directory, attendance, roster, leave/correction approvals, workforce reports | Hospital staff/workforce; patient/clinical modules nahi |
| Ward In-charge | Assigned wards, admitted patients, admission/discharge coordination, ward status, clinical/vitals/prescription view | Assigned ward records aur admitted patients |
| OT Coordinator | Surgery schedule, patient/doctor selection, theater/team/date/time | Surgical queue aur scheduling ke liye basic patient identity; clinical notes nahi |
| Department Head | Department patients/clinical view, doctors, appointments, lab, surgeries, staff, roster, approvals, reports | Assigned department; assigned ward links where needed |
| Support Staff | Own attendance, shifts, leave and correction requests, profile | Apna employee record/workforce items |

Users & Roles ke **Role permissions** tab se view/add/edit/export/approve permissions manage hoti hain. Permission matrix role ke record scope aur workflow rules ko bypass nahi karti: receptionist ko clinical notes, pharmacist ko clinical-note edits, staff ko self-approval aur cashier ko paid receipt rewrite ka access nahi milta. Admin role ke permissions fixed hain. Self-demotion/self-deactivation aur last-admin removal blocked hain.

Backend next request par current assignment check karta hai. UI permissions/scope lagbhag 15 seconds mein ya window focus par refresh hote hain; scope badalne par purane records/dialog drafts clear hote hain.

## 7. Workflows aur record integrity

- Clinical notes, nursing notes, prescriptions aur vitals append-only entries hain. Correction chahiye to nayi entry add karein; existing final clinical history replace nahi hoti.
- Doctor pending lab test request karta hai. Lab staff sample/result update aur existing test ke liye PDF upload karta hai. Reports private hain, PDF limit 10 MB hai; viewing link 60 seconds ke liye banti hai. Issued file objects ko client overwrite/delete nahi karta.
- Pharmacist prescription ki remaining quantity dispense karta hai. Stock decrease aur dispensing receipt ek database transaction mein hote hain; expired stock/over-dispensing blocked hain.
- Roster mein overnight shift explicit next-day setting ke saath hai. Overlap checks apply hote hain. Employee leave request submit/cancel karta hai; HR/head/admin relevant requests decide karte hain. Apni request approve nahi ho sakti.
- Attendance correction request approval ke baad relevant saved attendance update karti hai.
- New invoices unpaid create hote hain. Payment separate dated receipt se record hoti hai; paisa precision aur overpayment checks hain. Paid invoice/old receipt history immutable hai. Sirf unpaid invoice reason ke saath void ho sakta hai; cashier approval request karta hai, admin directly bhi void kar sakta hai. Print receipt se browser Save as PDF use karein.
- Ward occupancy = unlinked/opening occupied beds + linked admitted patients. Patient ko ward assign kiya ho to usay unlinked count mein dobara add na karein. Discharge ward link release karta hai. Yeh ward capacity allocation hai; individual physical-bed assignment/transfer history alag extension hai.
- Purana editor newer record ko overwrite nahi karega. Conflict aaye to list refresh karke editor dobara open karein. Clinical history page par patient filter aur older/latest history controls hain.

Search bars, editor inputs, selects aur textareas shared HMS focus classes use karte hain. Inner input ki blue outline remove hai; outer field/wrapper subtle themed focus border/ring aur keyboard focus indication rakhta hai. Light/dark theme, mobile navigation aur accessible dialog focus handling included hain.

## 8. Backup aur existing browser data

Admin My Profile ke Data Backup & Migration area se full JSON export le sakta hai. Export mein collections, clinical/workforce items, memberships, permissions, hospital settings, profiles aur audit metadata aata hai.

Auth passwords, secret keys aur Storage ke actual PDF bytes JSON backup ka hissa nahi hain. Auth aur report files ka separate server/operator backup rakhein. Existing populated database ko restore karne ka blind one-click overwrite is release mein nahi hai. Supplied legacy browser import sirf completely empty/unmodified database collections ke liye hai; relationships/validation fail ho to transaction rollback hoti hai.

## 9. Verification aur live setup

`npm run check` source lint, unit/regression/database tests, TypeScript aur production build chalata hai. Database tests local PGlite/PostgreSQL model par chalti hain; hosted Supabase ko touch nahi karti. Detailed results `VERIFICATION.md` mein hain.

Yeh ZIP code aur installation files ka completed update hai. Aapke hosted project par migrations, Edge deployment, invitation/reset delivery aur real-account acceptance tests abhi apply/run karne hain. SQL, function aur environment teeno same Supabase project ke hon.

Common setup errors:

| Error/behavior | Kahan check karna hai |
| --- | --- |
| Database setup missing / schema cache | Roles SQL applied hai? Frontend URL sahi Supabase project ka hai? |
| Membership required / access restricted | Account active hai? Staff active hai? Role, department, doctor aur wards valid linked hain? |
| New account/reset service error | `hms-users` deployed hai? `APP_URL` aur allowed origins configured hain? |
| Invitation/reset link fail | Auth redirect allowlist aur SMTP/email delivery |
| Staff ko patient nahi dikh raha | Patient/appointment/surgery/test references aur assigned scope |
| PDF report unavailable | Storage migration, existing test link aur laboratory permission |
| Search mein purani style | Updated `src/index.css` aur shared components copy hue? Dev server restart/build refresh karein |
| Save conflict | Naya record fetch karke editor reopen karein; purana draft force-save na karein |

## 10. Code changes aur future scope

Exact new/replacement files aur final line numbers `FILE_REPLACEMENTS.md` mein hain. Lines navigation ke liye hain; safest update poori supplied file replace/add karna hai.

Yeh single-hospital implementation current validated JSON collections use karti hai. Per collection 10,000-record cap aur shared transactional lock hai; large hospital dataset ke liye normalized records/pagination/foreign keys ki architecture alag plan karein. Payroll, purchase orders, full stock-movement ledger, refunds/discount approvals, insurance claims, physical-bed history, patient portal aur multi-hospital tenancy is release ke implemented features nahi hain.
