const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const sql = (name) =>
  fs.readFileSync(path.join(__dirname, "../supabase/migrations", name), "utf8");
const admin = "10000000-0000-4000-8000-000000000001",
  admin2 = "10000000-0000-4000-8000-000000000002",
  outsider = "10000000-0000-4000-8000-000000000099";
const roles = [
  "doctor",
  "nurse",
  "receptionist",
  "lab_staff",
  "pharmacist",
  "cashier",
  "hr",
  "ward_incharge",
  "ot_coordinator",
  "department_head",
  "staff",
];
const uid = (role) =>
  `20000000-0000-4000-8000-${String(roles.indexOf(role) + 1).padStart(12, "0")}`;
const departments = {
  doctor: "Cardiology",
  nurse: "Cardiology",
  receptionist: "Reception",
  lab_staff: "Laboratory",
  pharmacist: "Pharmacy",
  cashier: "Billing",
  hr: "HR",
  ward_incharge: "Cardiology",
  ot_coordinator: "Surgery",
  department_head: "Cardiology",
  staff: "Support",
};
const patients = [
  {
    id: "p1",
    patientId: "HMS-1",
    name: "Patient A",
    age: 30,
    gender: "Other",
    department: "Cardiology",
    phone: "03000000000",
    doctor: "Doctor A",
    doctorRef: "d1",
    status: "Admitted",
    wardId: "w1",
    initials: "PA",
    registeredAt: "2026-10-10T08:00:00Z",
    admittedAt: "2026-10-10T08:00:00Z",
    updatedAt: "2026-10-10T08:00:00Z",
    notes: "PRIVATE CLINICAL NOTE",
    futureClinical: { diagnosis: "PRIVATE DIAGNOSIS" },
  },
  {
    id: "p2",
    patientId: "HMS-2",
    name: "Patient B",
    age: 40,
    gender: "Other",
    department: "General",
    phone: "03000000001",
    doctor: "Doctor B",
    doctorRef: "d2",
    status: "Admitted",
    wardId: "w2",
    initials: "PB",
    registeredAt: "2026-10-10T08:00:00Z",
    admittedAt: "2026-10-10T08:00:00Z",
    updatedAt: "2026-10-10T08:00:00Z",
    notes: "OTHER PRIVATE NOTE",
  },
];
test("hospital roles enforce scoped records, workflows and revocation at the database boundary", async (t) => {
  const db = new PGlite();
  let clinicalId, prescriptionId, leaveId, invoiceRequest;
  const identity = async (id, role = "authenticated") =>
    db.exec(
      `reset role;set request.jwt.claim.sub='${id || ""}';set role ${role};`,
    );
  const rpc = async (name, params = [], casts = []) => {
    const result = await db.query(
      `select public.${name}(${params.map((_, i) => "$" + (i + 1) + (casts[i] ? "::" + casts[i] : "")).join(",")}) as value`,
      params,
    );
    return result.rows[0].value;
  };
  const read = async (name) =>
    (await rpc("hms_read_collection", [name])).records;
  const save = async (name, rows, revision) => {
    if (revision === undefined)
      revision = (await rpc("hms_read_collection", [name])).revision;
    return rpc(
      "hms_save_collection",
      [name, revision, JSON.stringify(rows)],
      ["text", "bigint", "jsonb"],
    );
  };
  const createWork = (kind, patient, staff, data, status) =>
    rpc(
      "hms_save_work",
      [null, kind, 0, patient, staff, JSON.stringify(data), status],
      ["uuid", "text", "bigint", "text", "text", "jsonb", "text"],
    );
  const work = (kind) => rpc("hms_list_work", [kind]);
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);grant usage on schema public,auth to anon,authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${admin}','admin@example.test'),('${admin2}','admin2@example.test'),('${outsider}','outsider@example.test');`,
    );
    for (const role of roles)
      await db.query("insert into auth.users values($1,$2)", [
        uid(role),
        `${role}@example.test`,
      ]);
    await db.exec(sql("202610040001_hms_setup.sql"));
    await db.exec(
      `insert into public.hms_admins(user_id) values('${admin}'),('${admin2}');`,
    );
    await identity(admin);
    await save(
      "doctors",
      [
        {
          id: "d1",
          name: "Doctor A",
          specialty: "Cardiology",
          department: "Cardiology",
          experience: "",
          phone: "",
          photo: "",
          status: "Active",
        },
        {
          id: "d2",
          name: "Doctor B",
          specialty: "General",
          department: "General",
          experience: "",
          phone: "",
          photo: "",
          status: "Active",
        },
      ],
      0,
    );
    await save(
      "wards",
      [
        {
          id: "w1",
          name: "Ward A",
          capacity: 5,
          occupied: 0,
          status: "Available",
        },
        {
          id: "w2",
          name: "Ward B",
          capacity: 5,
          occupied: 0,
          status: "Available",
        },
      ],
      0,
    );
    await save("patients", patients, 0);
    await save(
      "staff",
      roles.map((role) => ({
        id: "s-" + role,
        name: role + " person",
        role: "Job designation",
        department: departments[role],
        phone: "",
        status: "Active",
      })),
      0,
    );
    await save(
      "tests",
      [
        {
          id: "t1",
          patient: "Patient A",
          patientRef: "p1",
          test: "CBC",
          status: "Pending",
          requestedAt: "2026-10-10T08:00:00Z",
        },
        {
          id: "t2",
          patient: "Patient B",
          patientRef: "p2",
          test: "CBC",
          status: "Pending",
          requestedAt: "2026-10-10T08:00:00Z",
        },
      ],
      0,
    );
    await save(
      "appointments",
      [
        {
          id: "a1",
          appointmentId: "APT-1",
          patient: "Patient A",
          patientRef: "p1",
          doctor: "Doctor A",
          doctorRef: "d1",
          department: "Cardiology",
          date: "2026-10-11",
          time: "09:00",
          duration: 30,
          status: "Confirmed",
          initials: "PA",
        },
        {
          id: "a2",
          appointmentId: "APT-2",
          patient: "Patient B",
          patientRef: "p2",
          doctor: "Doctor B",
          doctorRef: "d2",
          department: "General",
          date: "2026-10-11",
          time: "09:00",
          duration: 30,
          status: "Confirmed",
          initials: "PB",
        },
      ],
      0,
    );
    await save(
      "medicines",
      [
        {
          id: "m1",
          name: "Test Medicine",
          batch: "B1",
          quantity: 10,
          reorderLevel: 2,
          expiry: "2099-01-01",
        },
      ],
      0,
    );
    await save(
      "billing",
      [
        {
          id: "b1",
          patient: "Patient A",
          patientId: "HMS-1",
          service: "Consultation",
          date: "2026-10-11",
          amount: 100,
          paid: 0,
          openingPaid: 0,
          payments: [],
          voided: false,
        },
        {
          id: "b2",
          patient: "Patient B",
          patientId: "HMS-2",
          service: "Consultation",
          date: "2026-10-11",
          amount: 100,
          paid: 0,
          openingPaid: 0,
          payments: [],
          voided: false,
        },
      ],
      0,
    );
    await save(
      "attendance",
      [
        {
          id: "at1",
          staffId: "s-staff",
          name: "staff person",
          date: "2026-10-11",
          status: "Present",
          checkIn: "09:00",
          checkOut: "17:00",
          nextDay: false,
        },
        {
          id: "at2",
          staffId: "s-doctor",
          name: "doctor person",
          date: "2026-10-11",
          status: "Present",
          checkIn: "09:00",
          checkOut: "17:00",
          nextDay: false,
        },
      ],
      0,
    );
    await db.exec("reset role");
    await t.test(
      "additive migration installs twice without changing records or bootstrap admins",
      async () => {
        await db.exec(sql("202610110001_hms_roles.sql"));
        await db.exec(sql("202610110001_hms_roles.sql"));
        await identity(admin);
        assert.equal((await read("patients")).length, 2);
        assert.equal((await rpc("hms_get_access")).role, "admin");
      },
    );
    for (const role of roles)
      await rpc(
        "hms_set_membership",
        [
          uid(role),
          role,
          departments[role],
          "s-" + role,
          role === "doctor" ? "d1" : null,
          ["nurse", "ward_incharge", "department_head"].includes(role)
            ? ["w1"]
            : [],
          true,
        ],
        ["uuid", "text", "text", "text", "text", "text[]", "boolean"],
      );
    await t.test(
      "unassigned and anonymous accounts cannot claim a role or call helpers",
      async () => {
        await identity(null, "anon");
        await assert.rejects(rpc("hms_get_access"), /permission denied/);
        await identity(outsider);
        await db.exec(
          `set request.jwt.claims='{"user_metadata":{"role":"admin"}}'`,
        );
        await assert.rejects(rpc("hms_get_access"), /HMS_FORBIDDEN/);
        assert.equal(await rpc("is_hospital_admin"), false);
        await assert.rejects(
          db.query(
            `insert into public.hms_memberships(user_id,role) values('${outsider}','admin')`,
          ),
          /permission denied/,
        );
        await assert.rejects(rpc("hms_current_member"), /permission denied/);
        await assert.rejects(
          rpc(
            "hms_prepare_collection",
            ["patients", "[]", "[]"],
            ["text", "jsonb", "jsonb"],
          ),
          /permission denied/,
        );
      },
    );
    await t.test(
      "doctor sees assigned patients, appointments and lab orders only",
      async () => {
        await identity(uid("doctor"));
        assert.deepEqual(
          (await read("patients")).map((row) => row.id),
          ["p1"],
        );
        assert.deepEqual(
          (await read("appointments")).map((row) => row.id),
          ["a1"],
        );
        assert.deepEqual(
          (await read("tests")).map((row) => row.id),
          ["t1"],
        );
        assert.equal((await read("billing")).length, 0);
        assert.equal(
          (await db.query("select * from public.hms_collections")).rows.length,
          0,
        );
      },
    );
    await t.test(
      "doctor cannot bypass clinical workflows, edit another record or change appointment assignment",
      async () => {
        const own = await read("patients");
        await assert.rejects(
          save("patients", [{ ...own[0], notes: "forged" }]),
          /HMS_FORBIDDEN/,
        );
        await assert.rejects(
          save("appointments", [
            { ...(await read("appointments"))[0], doctorRef: "d2" },
          ]),
          /HMS_FORBIDDEN/,
        );
        await assert.rejects(save("patients", [patients[1]]), /HMS_FORBIDDEN/);
        await assert.rejects(
          createWork("clinical", "p2", null, { body: "unauthorized" }, "Final"),
          /HMS_FORBIDDEN/,
        );
      },
    );
    await t.test(
      "status edits preserve records hidden from the doctor and reject stale revisions",
      async () => {
        const version = (await rpc("hms_read_collection", ["appointments"]))
          .revision;
        const rows = await read("appointments");
        await save(
          "appointments",
          [{ ...rows[0], status: "Completed" }],
          version,
        );
        await assert.rejects(
          save("appointments", rows, version),
          /HMS_CONFLICT/,
        );
        await assert.rejects(save("appointments", rows, null), /HMS_CONFLICT/);
        await identity(admin);
        assert.equal(
          (await read("appointments")).find((row) => row.id === "a2").status,
          "Confirmed",
        );
        await identity(uid("doctor"));
      },
    );
    await t.test(
      "final clinical notes and prescriptions are append only and validate linked patients",
      async () => {
        clinicalId = await createWork(
          "clinical",
          "p1",
          null,
          { body: "Clinical history" },
          "Final",
        );
        const entry = (await work("clinical"))[0];
        await assert.rejects(
          rpc(
            "hms_save_work",
            [
              clinicalId,
              "clinical",
              entry.revision,
              "p1",
              "s-doctor",
              JSON.stringify({ body: "replacement" }),
              "Final",
            ],
            ["uuid", "text", "bigint", "text", "text", "jsonb", "text"],
          ),
          /append only/,
        );
        prescriptionId = await createWork(
          "prescriptions",
          "p1",
          null,
          {
            medicineId: "m1",
            quantity: 4,
            instructions: "Doctor authored instructions",
          },
          "Issued",
        );
        await assert.rejects(
          createWork(
            "prescriptions",
            "p1",
            null,
            { medicineId: "missing", quantity: 1, instructions: "Test" },
            "Issued",
          ),
          /HMS_INVALID/,
        );
        await assert.rejects(
          createWork(
            "prescriptions",
            "p1",
            null,
            { medicineId: "m1", quantity: 0, instructions: "Test" },
            "Issued",
          ),
          /HMS_INVALID/,
        );
      },
    );
    await t.test(
      "nursing access follows assigned wards and does not permit prescriptions",
      async () => {
        await identity(uid("nurse"));
        assert.deepEqual(
          (await read("patients")).map((row) => row.id),
          ["p1"],
        );
        assert.deepEqual(
          (await read("wards")).map((row) => row.id),
          ["w1"],
        );
        await createWork(
          "vitals",
          "p1",
          null,
          {
            measuredAt: "2026-10-11T09:00:00Z",
            temperature: 37,
            pulse: 80,
            systolic: 120,
            diastolic: 80,
            oxygen: 98,
          },
          "Recorded",
        );
        await assert.rejects(
          createWork(
            "vitals",
            "p2",
            null,
            {
              measuredAt: "2026-10-11T09:00:00Z",
              temperature: 37,
              pulse: 80,
              systolic: 120,
              diastolic: 80,
              oxygen: 98,
            },
            "Recorded",
          ),
          /HMS_FORBIDDEN/,
        );
        await assert.rejects(
          createWork(
            "prescriptions",
            "p1",
            null,
            { medicineId: "m1", quantity: 1, instructions: "Test" },
            "Issued",
          ),
          /HMS_FORBIDDEN/,
        );
        await createWork(
          "clinical",
          "p1",
          null,
          { body: "Nursing care" },
          "Final",
        );
        assert.equal((await work("clinical"))[0].data.category, "Nursing note");
      },
    );
    await t.test(
      "reception receives basic fields and cannot read hidden or future clinical keys",
      async () => {
        await identity(uid("receptionist"));
        const rows = await read("patients");
        assert.equal(rows.length, 2);
        assert.equal(rows[0].notes, "");
        assert.ok(!("futureClinical" in rows[0]));
        assert.equal(
          (await read("wards")).find((row) => row.id === "w1").actualOccupied,
          1,
        );
        await assert.rejects(
          save("patients", [
            ...rows,
            {
              ...rows[0],
              id: "p-fake",
              patientId: "HMS-FAKE",
              status: "Outpatient",
              wardId: undefined,
              futureClinical: { diagnosis: "forged" },
            },
          ]),
          /HMS_FORBIDDEN/,
        );
        await save(
          "patients",
          rows.map((row) =>
            row.id === "p1" ? { ...row, name: "Updated Patient A" } : row,
          ),
        );
        await assert.rejects(
          save(
            "patients",
            (await read("patients")).map((row) =>
              row.id === "p1" ? { ...row, notes: "replacement" } : row,
            ),
          ),
          /HMS_FORBIDDEN/,
        );
        await identity(admin);
        const current = await read("patients");
        assert.equal(current[0].notes, "PRIVATE CLINICAL NOTE");
        assert.equal(current[0].futureClinical.diagnosis, "PRIVATE DIAGNOSIS");
        assert.equal(current[1].name, "Patient B");
      },
    );
    await t.test(
      "laboratory can process hospital orders but cannot reassign them",
      async () => {
        await identity(uid("lab_staff"));
        let rows = await read("tests");
        assert.deepEqual(
          rows.map((row) => row.id),
          ["t1", "t2"],
        );
        await save("tests", [
          {
            ...rows[0],
            sampleStatus: "Received",
            result: "Reviewed result",
            status: "Completed",
            completedAt: "2026-10-11T10:00:00Z",
          },
          ...rows.slice(1),
        ]);
        rows = await read("tests");
        await assert.rejects(
          save("tests", [{ ...rows[0], patientRef: "p2" }, ...rows.slice(1)]),
          /HMS_FORBIDDEN/,
        );
        await assert.rejects(
          save("tests", [
            { ...rows[0], result: { invalid: "object" } },
            ...rows.slice(1),
          ]),
          /HMS_INVALID/,
        );
        await assert.rejects(rpc("hms_list_users"), /HMS_FORBIDDEN/);
      },
    );
    await t.test(
      "private report storage limits upload and download to the linked order",
      async () => {
        await db.exec(
          "reset role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;",
        );
        await db.exec(sql("202610110002_hms_report_storage.sql"));
        await identity(uid("lab_staff"));
        await db.query(
          "insert into storage.objects(bucket_id,name) values('hms-lab-reports','t1/aaaa.pdf')",
        );
        await assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id,name) values('hms-lab-reports','missing/bbbb.pdf')",
          ),
          /row-level security/,
        );
        await identity(admin);
        await db.query(
          "insert into storage.objects(bucket_id,name) values('hms-lab-reports','t2/bbbb.pdf')",
        );
        await identity(uid("doctor"));
        assert.equal(
          (await db.query("select * from storage.objects")).rows.length,
          1,
        );
        await identity(uid("staff"));
        assert.equal(
          (await db.query("select * from storage.objects")).rows.length,
          0,
        );
      },
    );
    await t.test(
      "pharmacist dispenses atomically, retains receipts and cannot over-dispense",
      async () => {
        await identity(uid("pharmacist"));
        const current = (await work("prescriptions")).find(
          (row) => row.id === prescriptionId,
        );
        assert.equal((await read("patients"))[0].notes, "");
        assert.equal((await work("clinical")).length, 0);
        await assert.rejects(
          rpc(
            "hms_dispense",
            [prescriptionId, null, 1, "RX-NULL"],
            ["uuid", "bigint", "integer", "text"],
          ),
          /HMS_CONFLICT/,
        );
        await rpc(
          "hms_dispense",
          [prescriptionId, current.revision, 2, "RX-1"],
          ["uuid", "bigint", "integer", "text"],
        );
        assert.equal((await read("medicines"))[0].quantity, 8);
        const changed = (await work("prescriptions"))[0];
        assert.equal(changed.status, "Partially Dispensed");
        assert.equal(changed.data.receipts.length, 1);
        await assert.rejects(
          rpc(
            "hms_dispense",
            [prescriptionId, changed.revision, 3, "RX-2"],
            ["uuid", "bigint", "integer", "text"],
          ),
          /HMS_INVALID/,
        );
        assert.equal((await read("medicines"))[0].quantity, 8);
        await assert.rejects(
          rpc(
            "hms_dispense",
            [prescriptionId, current.revision, 1, "RX-2"],
            ["uuid", "bigint", "integer", "text"],
          ),
          /HMS_CONFLICT/,
        );
        await rpc(
          "hms_dispense",
          [prescriptionId, changed.revision, 2, "RX-2"],
          ["uuid", "bigint", "integer", "text"],
        );
        assert.equal((await work("prescriptions"))[0].status, "Dispensed");
        assert.equal((await read("medicines"))[0].quantity, 6);
      },
    );
    await t.test(
      "cashier receipts retain existing finance checks and voids require approval",
      async () => {
        await identity(uid("cashier"));
        let rows = await read("billing");
        await assert.rejects(
          save(
            "billing",
            rows.map((row) =>
              row.id === "b1" ? { ...row, voided: true } : row,
            ),
          ),
          /HMS_FORBIDDEN/,
        );
        invoiceRequest = await createWork(
          "approvals",
          null,
          "s-cashier",
          {
            type: "billing_void",
            targetId: "b1",
            reason: "Duplicate unpaid invoice",
          },
          "Pending",
        );
        await save(
          "billing",
          rows.map((row) =>
            row.id === "b2"
              ? {
                  ...row,
                  paid: 10,
                  payments: [
                    {
                      id: "receipt-1",
                      amount: 1000,
                      receivedAt: "2026-10-11T10:00:00Z",
                      reference: "PAY",
                    },
                  ],
                }
              : row,
          ),
        );
        rows = await read("billing");
        await assert.rejects(
          save(
            "billing",
            rows.map((row) =>
              row.id === "b2" ? { ...row, paid: 0, payments: [] } : row,
            ),
          ),
          /HMS_INVALID/,
        );
        await assert.rejects(
          createWork(
            "approvals",
            null,
            "s-cashier",
            { type: "billing_void", targetId: "b2", reason: "Paid invoice" },
            "Pending",
          ),
          /HMS_INVALID/,
        );
        await identity(uid("hr"));
        assert.equal((await work("approvals")).length, 0);
        await identity(admin);
        const request = (await work("approvals"))[0];
        await rpc(
          "hms_decide_work",
          [invoiceRequest, request.revision, "Approved", "Verified duplicate"],
          ["uuid", "bigint", "text", "text"],
        );
        assert.equal(
          (await read("billing")).find((row) => row.id === "b1").voided,
          true,
        );
      },
    );
    await t.test(
      "support staff read personal attendance and leave only, and cannot approve themselves",
      async () => {
        await identity(uid("staff"));
        assert.deepEqual(
          (await read("attendance")).map((row) => row.id),
          ["at1"],
        );
        assert.equal((await read("patients")).length, 0);
        await assert.rejects(save("attendance", []), /HMS_FORBIDDEN/);
        leaveId = await createWork(
          "leave",
          null,
          "s-staff",
          { from: "2026-10-15", to: "2026-10-16", reason: "Personal leave" },
          "Pending",
        );
        await assert.rejects(
          createWork(
            "leave",
            null,
            "s-doctor",
            { from: "2026-10-20", to: "2026-10-21", reason: "Wrong employee" },
            "Pending",
          ),
          /HMS_FORBIDDEN/,
        );
        await assert.rejects(
          createWork(
            "leave",
            null,
            "s-staff",
            { from: "2026-10-16", to: "2026-10-17", reason: "Overlap" },
            "Pending",
          ),
          /overlapping/,
        );
        await assert.rejects(
          rpc(
            "hms_decide_work",
            [leaveId, 1, "Approved", "Self"],
            ["uuid", "bigint", "text", "text"],
          ),
          /HMS_FORBIDDEN/,
        );
        await identity(uid("hr"));
        const pending = (await work("leave")).find((row) => row.id === leaveId);
        await rpc(
          "hms_decide_work",
          [leaveId, pending.revision, "Approved", "Approved by HR"],
          ["uuid", "bigint", "text", "text"],
        );
        const own = await createWork(
          "leave",
          null,
          "s-hr",
          { from: "2026-10-22", to: "2026-10-23", reason: "HR own leave" },
          "Pending",
        );
        await assert.rejects(
          rpc(
            "hms_decide_work",
            [own, 1, "Approved", "Self"],
            ["uuid", "bigint", "text", "text"],
          ),
          /HMS_FORBIDDEN/,
        );
        await identity(uid("staff"));
        assert.equal((await work("leave")).length, 1);
        assert.equal(
          (await rpc("hms_personal_notifications")).some(
            (row) => row.message === "Approved",
          ),
          true,
        );
      },
    );
    await t.test(
      "HR approves attendance corrections without exposing other employee records",
      async () => {
        const id = await createWork(
          "approvals",
          null,
          "s-staff",
          {
            type: "attendance",
            targetId: "at1",
            reason: "Correct check-out",
            status: "Present",
            checkIn: "09:00",
            checkOut: "18:00",
            nextDay: false,
          },
          "Pending",
        );
        await identity(uid("hr"));
        const request = (await work("approvals")).find((row) => row.id === id);
        await rpc(
          "hms_decide_work",
          [id, request.revision, "Approved", "Verified shift"],
          ["uuid", "bigint", "text", "text"],
        );
        await identity(uid("staff"));
        assert.equal((await read("attendance"))[0].checkOut, "18:00");
      },
    );
    await t.test(
      "department head scope applies to patients, staff and shift changes",
      async () => {
        await identity(uid("department_head"));
        assert.deepEqual(
          (await read("patients")).map((row) => row.id),
          ["p1"],
        );
        assert.ok(
          (await read("staff")).every((row) => row.department === "Cardiology"),
        );
        await assert.rejects(
          createWork(
            "roster",
            null,
            "s-staff",
            {
              date: "2026-10-14",
              start: "09:00",
              end: "17:00",
              nextDay: false,
            },
            "Scheduled",
          ),
          /HMS_FORBIDDEN/,
        );
        await identity(uid("hr"));
        await createWork(
          "roster",
          null,
          "s-staff",
          { date: "2026-10-14", start: "22:00", end: "06:00", nextDay: true },
          "Scheduled",
        );
        await assert.rejects(
          createWork(
            "roster",
            null,
            "s-staff",
            {
              date: "2026-10-15",
              start: "05:00",
              end: "10:00",
              nextDay: false,
            },
            "Scheduled",
          ),
          /overlapping/,
        );
        await identity(uid("staff"));
        assert.equal((await work("roster")).length, 1);
      },
    );
    await t.test(
      "appointment assignments grant current care access and patient history filters stay scoped",
      async () => {
        await identity(admin);
        const current = await read("appointments");
        const assigned = {
          id: "future-assignment",
          appointmentId: "APT-FUTURE",
          patient: "Patient B",
          patientRef: "p2",
          doctor: "Doctor A",
          doctorRef: "d1",
          department: "Cardiology",
          date: "2099-01-01",
          time: "09:00",
          duration: 30,
          status: "Confirmed",
          initials: "PB",
        };
        await save("appointments", [...current, assigned]);
        await identity(uid("doctor"));
        assert.ok((await read("patients")).some((row) => row.id === "p2"));
        assert.equal(
          (
            await rpc(
              "hms_list_work",
              ["clinical", null, "p1"],
              ["text", "timestamptz", "text"],
            )
          ).every((row) => row.patient_id === "p1"),
          true,
        );
        await identity(admin);
        await save("appointments", current);
        await identity(uid("doctor"));
        assert.equal(
          (await read("patients")).some((row) => row.id === "p2"),
          false,
        );
        await identity(uid("ot_coordinator"));
        const chooser = await read("patients");
        assert.ok(chooser.some((row) => row.id === "p2"));
        assert.ok(
          chooser.every(
            (row) => row.notes === "" && !("futureClinical" in row),
          ),
        );
        const surgery = {
          id: "s-assigned",
          patient: "Patient B",
          patientRef: "p2",
          surgeon: "Doctor A",
          doctorRef: "d1",
          procedure: "Procedure",
          theater: "OT 1",
          date: "2099-01-02",
          time: "10:00",
          duration: 60,
          status: "Scheduled",
        };
        await save("surgeries", [surgery]);
        await identity(uid("doctor"));
        assert.ok((await read("patients")).some((row) => row.id === "p2"));
        assert.deepEqual(
          (await read("surgeries")).map((row) => row.id),
          ["s-assigned"],
        );
        await identity(admin);
        await save("surgeries", []);
        await identity(uid("ward_incharge"));
        const wardRows = await read("wards");
        await save(
          "wards",
          wardRows.map(({ actualOccupied, ...row }) => row),
        );
        assert.equal((await read("wards"))[0].actualOccupied, 1);
      },
    );
    await t.test(
      "permission removal and account deactivation affect already signed-in tokens",
      async () => {
        await identity(admin);
        await rpc("hms_set_permission", ["doctor", "laboratory:view", false]);
        await identity(uid("doctor"));
        assert.equal((await read("tests")).length, 0);
        assert.equal(
          (await rpc("hms_get_access")).permissions.includes("laboratory:view"),
          false,
        );
        await identity(admin);
        await rpc(
          "hms_set_membership",
          [uid("doctor"), "doctor", "Cardiology", "s-doctor", "d1", [], false],
          ["uuid", "text", "text", "text", "text", "text[]", "boolean"],
        );
        await identity(uid("doctor"));
        await assert.rejects(rpc("hms_get_access"), /HMS_FORBIDDEN/);
        await assert.rejects(
          rpc("hms_read_collection", ["patients"]),
          /HMS_FORBIDDEN/,
        );
      },
    );
    await t.test(
      "administrators retain complete audit, backup and last-admin protection",
      async () => {
        await identity(admin);
        assert.ok((await rpc("hms_audit_log")).length > 10);
        const backup = await rpc("hms_export_backup");
        assert.equal(backup.collections.patients.length, 2);
        assert.ok(backup.workItems.length > 5);
        assert.equal(backup.memberships.length, 13);
        await assert.rejects(
          rpc(
            "hms_set_membership",
            [admin, "staff", "Support", "s-staff", null, [], false],
            ["uuid", "text", "text", "text", "text", "text[]", "boolean"],
          ),
          /another administrator|keep one/,
        );
        await identity(uid("staff"));
        await assert.rejects(rpc("hms_export_backup"), /HMS_FORBIDDEN/);
        await assert.rejects(rpc("hms_audit_log"), /HMS_FORBIDDEN/);
      },
    );
  } finally {
    await db.close();
  }
});
