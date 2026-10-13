# HMS dummy data — use aur edit karne ka tariqa

## Project chalana

1. Updated ZIP extract karein aur project folder terminal mein open karein.
2. `npm ci` run karein (Node 22.12 ya newer).
3. `npm run dev` run karein aur apne existing admin account se login karein.
4. Sirf admin demo preview ke liye apni `.env` mein `VITE_HMS_DATA_MODE=demo` set karein. Is ZIP mein asli `.env` shamil nahi hai. Staff portals aur shared clinical/workforce workflows ke liye `supabase` mode use karein; `SETUP_Roman_Urdu.md` follow karein.

Agar sirf updated files apne purane project mein copy kar rahe hain, apni `.env` ki line ko `VITE_HMS_DATA_MODE=demo` karein aur dev server restart karein. `.env.local` ya deployment environment mein agar isi setting ki doosri value hai to use bhi update karein. Apne Supabase URL aur key wahi rakhein.

## Kahan kahan data diya hai

| Section | Sample records |
| --- | --- |
| Patients | 12 patients: admitted, outpatient aur discharged |
| Doctors | 8 doctors: 7 active aur 1 inactive |
| Appointments | 12 bookings: aaj, upcoming aur previous dates |
| Patient Analytics | 30 din ke 233 visit records |
| Laboratory | 10 requests: pending, in progress, completed aur cancelled |
| Pharmacy | 10 inventory records: available, low stock, out of stock aur expired |
| Wards & Rooms | 6 wards/units: operational rooms aur maintenance example |
| Operation Theater | 6 procedures: scheduled, in progress, completed aur cancelled |
| Staff | 12 staff members: active aur inactive |
| Attendance | 14 din ke 140 attendance records, aaj ki attendance bhi |
| Billing | 10 invoices: paid, partial aur unpaid; dated receipts bhi |
| Reports | Upar ke staff, attendance aur billing se automatic summaries |
| Notifications | Today's appointments, recent registrations, ready reports aur stock alerts |
| My Profile | Editable sample phone, department aur bio; account identity existing login se |

Dashboard ke stats, medical team, visits chart, today's appointments, hospital operations, recent patients, staff attendance aur lab reports isi shared data se calculate hote hain. Carousel aur hospital news ka existing sample content bhi maujood hai; news ko `src/data/hospitalNews.ts` mein edit kar sakte hain.

## Dummy data ko change karna

- Har page ke **Add / Edit** controls se records change karein. Changes browser refresh ke baad bhi save rahengi.
- Attendance mein date aur staff member select karke **Save Attendance** karein.
- Visits ke liye Patient Analytics par **Record Visit** use karein; visit delete bhi kar sakte hain.
- Paid invoices aur existing receipt history ke existing rules rehte hain. Unpaid invoice edit karein ya naya invoice create karein; partial/unpaid bills par payment add kar sakte hain.
- Default sample names, charges, departments, inventory aur chart data code se change karne ke liye **`src/data/demoData.ts`** edit karein. File save karne ke baad **Settings > Restore Sample Records** use karein, taake naye defaults saved demo records mein aa jayein.
- Sample dates first launch ki Pakistan date se banti hain aur automatically aapki edits overwrite nahi hoti. Kisi aur din presentation deni ho to **Restore Sample Records** se aaj ki dates ke saath fresh sample data load karein. Ye aapke demo edits replace karega.
- My Profile > **Download Current Backup** se tamam current demo collections export kar sakte hain.

## Original data use karna

Project root ki `.env` mein:

```env
VITE_HMS_DATA_MODE=supabase
```

Dev server restart karein. Deployment ke liye build dobara banayein. Real database ke records phir display honge; samples real Supabase collections mein insert nahi hote. Demo mein asli patient details enter karne ke bajaye real records ke liye Supabase mode use karein.

Demo records account aur browser ke hisab se save hote hain. Same account se same browser mein login karne par changes rehti hain. Browser storage clear karne ya doosre browser/device par jane se fresh samples milenge. Existing admin login, theme, sidebar animations aur navigation apni current functionality use karte hain.
