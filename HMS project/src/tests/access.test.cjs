const { test } = require("node:test");
const assert = require("node:assert/strict");
const loader = require("./load-source.cjs");
const model = loader()("src/features/access/accessModel.ts");
const access = (role) => ({
  userId: "user",
  role,
  department: "Cardiology",
  staffId: "staff",
  doctorId: role === "doctor" ? "doctor" : null,
  wardIds: ["ward"],
  permissions: model.defaultPermissions[role],
  version: "1",
});
test("staff routes and actions follow their verified role permissions", () => {
  const doctor = access("doctor"),
    nurse = access("nurse"),
    support = access("staff");
  assert.equal(model.canVisit(doctor, "/patients"), true);
  assert.equal(model.canVisit(doctor, "/users"), false);
  assert.equal(model.canAccess(doctor, "patients", "edit"), false);
  assert.equal(model.canAccess(nurse, "vitals", "add"), true);
  assert.equal(model.canAccess(nurse, "prescriptions", "add"), false);
  for (const path of [
    "/dashboard",
    "/attendance",
    "/roster",
    "/leave",
    "/approvals",
    "/settings",
    "/administrator",
  ])
    assert.equal(model.canVisit(support, path), true, path);
  for (const path of [
    "/patients",
    "/billing",
    "/staff",
    "/reports",
    "/users",
    "/audit",
    "/hospital-settings",
  ])
    assert.equal(model.canVisit(support, path), false, path);
  assert.equal(model.canVisit(null, "/dashboard"), false);
  assert.equal(model.canVisit(access("admin"), "/users"), true);
});
test("malformed memberships are rejected and record-scope changes invalidate cached screens", () => {
  assert.equal(model.validAccess(access("doctor")), true);
  assert.equal(
    model.validAccess({ ...access("doctor"), role: "unknown" }),
    false,
  );
  assert.equal(
    model.validAccess({ ...access("doctor"), permissions: "admin" }),
    false,
  );
  const original = model.accessFingerprint(access("doctor"));
  for (const change of [
    { department: "General" },
    { doctorId: "other" },
    { wardIds: ["other"] },
    { permissions: [] },
    { version: "2" },
  ])
    assert.notEqual(
      model.accessFingerprint({ ...access("doctor"), ...change }),
      original,
    );
});
test("record stores clear old scope data and ignore a delayed response after a role change", async () => {
  const responses = [];
  const events = {};
  const win = {
    dispatchEvent() {},
    setInterval() {
      return 1;
    },
    clearInterval() {},
    addEventListener(type, fn) {
      events[type] = fn;
    },
    removeEventListener() {},
  };
  const load = loader(
    {
      react: { useSyncExternalStore: () => {} },
      "../lib/supabaseClient": {
        getSupabase: () => ({
          rpc: () => new Promise((resolve) => responses.push(resolve)),
        }),
      },
    },
    {
      window: win,
      Event: class {},
      TEST_ENV: { VITE_HMS_DATA_MODE: "supabase" },
    },
  );
  const stores = load("src/data/recordStore.ts");
  const store = stores.getRecordStore(
    "medicore.patients.v1",
    (value) => value && typeof value.id === "string",
  );
  stores.setRecordSession("user", "doctor-scope", access("doctor"));
  const pending = store.refresh();
  assert.equal(responses.length, 1);
  stores.setRecordSession("user", "support-scope", access("staff"));
  await store.refresh();
  assert.equal(store.getSnapshot().records.length, 0);
  responses[0]({
    data: { revision: 1, records: [{ id: "private-record" }] },
    error: null,
  });
  await pending;
  assert.equal(store.getSnapshot().records.length, 0);
  stores.setRecordSession("user", "doctor-new-scope", {
    ...access("doctor"),
    doctorId: "other",
  });
  const current = store.refresh();
  responses[1]({
    data: { revision: 2, records: [{ id: "assigned-record" }] },
    error: null,
  });
  await current;
  assert.equal(store.getSnapshot().records[0].id, "assigned-record");
  const denied = store.refresh();
  responses[2]({
    data: null,
    error: { code: "42501", message: "HMS_FORBIDDEN: revoked" },
  });
  await denied;
  assert.equal(store.getSnapshot().records.length, 0);
  assert.match(store.getSnapshot().error, /permissions|cannot/);
});
