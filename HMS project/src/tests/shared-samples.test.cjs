const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const load = require("./load-source.cjs")();
const samples = load("src/data/sharedSamples.ts");
const batch = "30000000-0000-4000-8000-000000000001";
const fixtures = samples.createSharedSamples(
  batch,
  new Date("2026-10-13T08:30:00Z"),
);
const clone = (value) => JSON.parse(JSON.stringify(value));
const admin = "10000000-0000-4000-8000-000000000001",
  doctor = "10000000-0000-4000-8000-000000000002",
  outsider = "10000000-0000-4000-8000-000000000099";
const sql = (name) =>
  fs.readFileSync(path.join(__dirname, "../supabase/migrations", name), "utf8");

test("shared fixtures cover every collection and work page with unique sample references and current dates", () => {
  assert.throws(
    () => samples.createSharedSamples("invalid"),
    /valid sample batch/,
  );
  assert.equal(Object.keys(fixtures.collections).length, 11);
  for (const [name, rows] of Object.entries(fixtures.collections)) {
    assert.ok(rows.length > 0, name);
    assert.ok(rows.every((row) => row.id.startsWith("sample-" + batch + "-")));
    assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  }
  assert.equal(new Set(fixtures.work.map((row) => row.kind)).size, 6);
  assert.ok(
    fixtures.collections.appointments.some((row) => row.date === "2026-10-13"),
  );
  assert.ok(
    fixtures.work.some(
      (row) => row.kind === "roster" && row.data.date === "2026-10-13",
    ),
  );
  assert.ok(
    fixtures.collections.patients.every((row) =>
      row.patientId.startsWith("SMP-"),
    ),
  );
  assert.ok(
    fixtures.collections.patients.every((row) => row.name.includes("(Sample)")),
  );
  const staffNames = new Set(fixtures.collections.staff.map((row) => row.name));
  for (const row of fixtures.collections.doctors.filter(
    (row) => row.status === "Active",
  ))
    assert.ok(staffNames.has(row.name));
});

test("shared sample loading is atomic, one-time, preserves existing records and keeps staff scopes", async (t) => {
  const db = new PGlite();
  const identity = (id) =>
    db.exec(
      `reset role;set request.jwt.claim.sub='${id || ""}';set role ${id ? "authenticated" : "anon"};`,
    );
  const rpc = async (name, values = [], casts = []) => {
    const r = await db.query(
      `select public.${name}(${values.map((_, i) => "$" + (i + 1) + (casts[i] ? "::" + casts[i] : "")).join(",")}) as value`,
      values,
    );
    return r.rows[0].value;
  };
  const seed = (f = fixtures, b = batch) =>
    rpc(
      "hms_add_samples",
      [b, JSON.stringify(f.collections), JSON.stringify(f.work)],
      ["uuid", "jsonb", "jsonb"],
    );
  const read = async (name) =>
    (await rpc("hms_read_collection", [name])).records;
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);grant usage on schema public,auth to anon,authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;insert into auth.users values('${admin}','admin@example.test'),('${doctor}','doctor@example.test'),('${outsider}','outsider@example.test');`,
    );
    await db.exec(sql("202610040001_hms_setup.sql"));
    await db.exec(`insert into public.hms_admins(user_id) values('${admin}');`);
    await db.exec(sql("202610110001_hms_roles.sql"));
    await t.test(
      "migration can rerun and never inserts sample records by itself",
      async () => {
        await db.exec(sql("202610130001_hms_samples.sql"));
        await db.exec(sql("202610130001_hms_samples.sql"));
        await identity(admin);
        assert.equal((await rpc("hms_sample_status")).installed, false);
        assert.ok(
          (
            await db.query("select records from public.hms_collections")
          ).rows.every((row) => row.records.length === 0),
        );
      },
    );
    await t.test(
      "anonymous and unassigned users cannot load samples or read the installation marker",
      async () => {
        await identity(null);
        await assert.rejects(seed(), /permission denied/);
        await identity(outsider);
        await assert.rejects(seed(), /HMS_FORBIDDEN/);
        await assert.rejects(rpc("hms_sample_status"), /HMS_FORBIDDEN/);
        await assert.rejects(
          db.query("select * from public.hms_sample_installation"),
          /permission denied/,
        );
      },
    );
    await identity(admin);
    const original = clone(fixtures.collections);
    for (const rows of Object.values(original)) rows.splice(0, rows.length);
    const doctorRecord = {
      id: "real-doctor",
      name: "Existing Doctor",
      specialty: "General",
      department: "General",
      phone: "",
      photo: "",
      experience: "",
      status: "Active",
    };
    const patient = {
      id: "real-patient",
      patientId: "HMS-REAL-1",
      name: "Existing Patient",
      age: 35,
      gender: "Other",
      department: "General",
      phone: "",
      doctor: "Existing Doctor",
      doctorRef: doctorRecord.id,
      status: "Outpatient",
      initials: "EP",
      registeredAt: null,
      admittedAt: null,
      updatedAt: null,
      notes: "Existing private note",
    };
    const invoice = {
      id: "real-bill",
      patient: patient.name,
      patientId: patient.patientId,
      service: "Existing service",
      date: "2026-10-13",
      amount: 100,
      paid: 40,
      openingPaid: 0,
      payments: [
        {
          id: "real-payment",
          amount: 4000,
          receivedAt: "2026-10-13T08:00:00Z",
          reference: "Original receipt",
        },
      ],
    };
    original.doctors.push(doctorRecord);
    original.patients.push(patient);
    original.billing.push(invoice);
    await rpc("hms_import_legacy", [JSON.stringify(original)], ["jsonb"]);
    await t.test(
      "a late invalid work item rolls back collections, work, audit and installation together",
      async () => {
        const before = await rpc("hms_export_backup");
        const bad = clone(fixtures);
        bad.work.push({
          kind: "vitals",
          status: "Recorded",
          patientId: "sample-" + batch + "-missing",
          staffId: null,
          data: { measuredAt: "invalid" },
        });
        await assert.rejects(seed(bad), /HMS_FORBIDDEN|HMS_INVALID/);
        const after = await rpc("hms_export_backup");
        assert.deepEqual(after.collections, before.collections);
        assert.deepEqual(after.workItems, before.workItems);
        assert.deepEqual(after.recordAudit, before.recordAudit);
        assert.equal((await rpc("hms_sample_status")).installed, false);
      },
    );
    await t.test(
      "samples append to every section while existing patient and paid receipt remain identical",
      async () => {
        const result = await seed();
        assert.equal(result.installed, true);
        for (const [name, rows] of Object.entries(fixtures.collections))
          assert.equal(
            (await read(name)).length,
            rows.length + original[name].length,
            name,
          );
        assert.deepEqual(
          (await read("patients")).find((row) => row.id === patient.id),
          patient,
        );
        assert.deepEqual(
          (await read("billing")).find((row) => row.id === invoice.id),
          invoice,
        );
        for (const kind of [
          "clinical",
          "prescriptions",
          "vitals",
          "roster",
          "leave",
          "approvals",
        ])
          assert.ok((await rpc("hms_list_work", [kind])).length > 0, kind);
        const backup = await rpc("hms_export_backup");
        assert.equal(backup.sampleInstallation.batch_id, batch);
        assert.ok(
          backup.accessAudit.some((row) => row.action === "sample_data_loaded"),
        );
      },
    );
    await t.test(
      "loading again with another batch keeps edits and creates no duplicates",
      async () => {
        const current = await rpc("hms_read_collection", ["medicines"]);
        const rows = current.records.map((row, index) =>
          index ? row : { ...row, quantity: row.quantity + 1 },
        );
        await rpc(
          "hms_save_collection",
          ["medicines", current.revision, JSON.stringify(rows)],
          ["text", "bigint", "jsonb"],
        );
        const before = await rpc("hms_export_backup");
        const second = samples.createSharedSamples(
          "30000000-0000-4000-8000-000000000002",
          new Date("2026-10-14T08:00:00Z"),
        );
        await seed(second, second.batchId);
        const after = await rpc("hms_export_backup");
        assert.deepEqual(after.collections, before.collections);
        assert.deepEqual(after.workItems, before.workItems);
        assert.deepEqual(after.accessAudit, before.accessAudit);
      },
    );
    await t.test(
      "a doctor linked to a sample employee sees only assigned patients, work and own shifts",
      async () => {
        const d = fixtures.collections.doctors[0],
          s = fixtures.collections.staff.find((row) => row.name === d.name);
        await rpc(
          "hms_set_membership",
          [doctor, "doctor", d.department, s.id, d.id, [], true],
          ["uuid", "text", "text", "text", "text", "text[]", "boolean"],
        );
        await identity(doctor);
        const visible = await read("patients");
        assert.ok(visible.length > 0);
        assert.ok(visible.every((row) => row.doctorRef === d.id));
        assert.ok(!visible.some((row) => row.id === patient.id));
        const notes = await rpc("hms_list_work", ["clinical"]);
        assert.ok(notes.length > 0);
        assert.ok(
          notes.every((row) => visible.some((p) => p.id === row.patient_id)),
        );
        const roster = await rpc("hms_list_work", ["roster"]);
        assert.equal(roster.length, 2);
        assert.ok(roster.every((row) => row.staff_id === s.id));
        await assert.rejects(seed(), /HMS_FORBIDDEN/);
        await assert.rejects(rpc("hms_sample_status"), /HMS_FORBIDDEN/);
      },
    );
  } finally {
    await db.close();
  }
});
