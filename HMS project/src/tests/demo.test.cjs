const test = require('node:test');
const assert = require('node:assert/strict');
const createLoader = require('./load-source.cjs');
const react = { useEffect() {}, useState() {}, useSyncExternalStore() {} };
const domain = createLoader({ react, './recordStore': { getRecordStore() { return {}; }, useRecordStore() {} } });
const demo = domain('src/data/demoData.ts');
const activity = domain('src/data/activityModel.ts');
const administration = domain('src/data/administrationModel.ts');
const departments = domain('src/data/departmentStore.ts');
const dashboard = domain('src/data/dashboardStore.ts');
const notifications = domain('src/data/notificationModel.ts');
const now = new Date('2026-10-07T08:30:00Z');
const fixtures = demo.createDemoCollections(now);

test('all demo sections contain valid records with valid linked references and schedules', () => {
  const validators = {
    patients: activity.validPatient, doctors: departments.validDoctor, appointments: dashboard.validAppointment,
    visits: dashboard.validVisit, wards: activity.validWard, tests: activity.validLab, medicines: activity.validMedicine,
    surgeries: departments.validSurgery, staff: administration.validStaff, attendance: administration.validAttendance,
    billing: administration.validBill,
  };
  for (const [name, rows] of Object.entries(fixtures)) {
    assert.ok(rows.length > 0, `${name} must display sample records`);
    assert.equal(new Set(rows.map(r => r.id)).size, rows.length, `${name} IDs must be unique`);
    for (const row of rows) assert.ok(validators[name](row), `Invalid ${name} row ${row.id}`);
  }
  dashboard.checkAppointments(fixtures.appointments);
  departments.checkSurgeries(fixtures.surgeries);
  administration.checkAttendance(fixtures.attendance);
  const patients = new Set(fixtures.patients.map(r => r.id));
  const doctors = new Set(fixtures.doctors.map(r => r.id));
  const staff = new Set(fixtures.staff.map(r => r.id));
  const patientIds = new Set(fixtures.patients.map(r => r.patientId));
  for (const row of [...fixtures.appointments, ...fixtures.tests, ...fixtures.visits, ...fixtures.surgeries]) assert.ok(patients.has(row.patientRef));
  for (const row of [...fixtures.patients, ...fixtures.appointments, ...fixtures.surgeries]) assert.ok(doctors.has(row.doctorRef));
  for (const row of fixtures.attendance) assert.ok(staff.has(row.staffId));
  for (const row of fixtures.billing) assert.ok(patientIds.has(row.patientId));
  for (const ward of fixtures.wards) {
    const assigned = fixtures.patients.filter(p => p.status === 'Admitted' && p.wardId === ward.id).length;
    assert.ok(ward.occupied + assigned <= ward.capacity);
    if (ward.status === 'Maintenance') assert.equal(assigned, 0);
  }
});

test('dashboard dates, visit charts, receipt totals and notification categories are populated', () => {
  const today = '2026-10-07';
  assert.ok(fixtures.appointments.some(r => r.date === today && r.status === 'Waiting'));
  assert.ok(fixtures.attendance.some(r => r.date === today && r.status === 'Present'));
  assert.ok(dashboard.dailyVisits(fixtures.visits, today, 7).every(d => d.count > 0));
  assert.ok(activity.labWorkload(fixtures.tests).completed > 0);
  assert.ok(activity.pharmacyStock(fixtures.medicines).out > 0);
  assert.ok(fixtures.billing.some(r => r.paid > 0 && r.paid < r.amount));
  assert.ok(fixtures.billing.some(r => r.paid === 0));
  for (const bill of fixtures.billing) assert.equal(bill.paid * 100, bill.payments.reduce((sum, p) => sum + p.amount, 0));
  const sources = Object.fromEntries(Object.entries({ appointments: fixtures.appointments, patients: fixtures.patients, laboratory: fixtures.tests, pharmacy: fixtures.medicines })
    .map(([category, rows]) => [category, notifications.observeRecords(category, rows, now.getTime())]));
  const state = notifications.reconcileNotifications(notifications.emptyNotificationState(), sources, now.getTime());
  assert.equal(new Set(state.notifications.map(n => n.category)).size, 4);
  // Opening the presentation just after Pakistan midnight still shows today's receipts.
  const midnight = demo.createDemoCollections(new Date('2026-10-06T19:01:00Z'));
  assert.ok(midnight.billing.flatMap(r => r.payments).some(p => activity.hospitalDate(p.receivedAt) === today));
});

function browser(memory = new Map(), locks = { request: async (_key, commit) => commit() }) {
  const target = new EventTarget();
  const window = { dispatchEvent: e => target.dispatchEvent(e), addEventListener: (...a) => target.addEventListener(...a), removeEventListener: (...a) => target.removeEventListener(...a), setInterval, clearInterval };
  const localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) };
  const load = createLoader({ react, '../lib/supabaseClient': { getSupabase() { throw new Error('Demo must not query the live database'); } } },
    { window, localStorage, navigator: { locks }, Event, TEST_ENV: { VITE_HMS_DATA_MODE: 'demo' } });
  const repo = load('src/data/recordStore.ts');
  return { memory, repo, demo: load('src/data/demoData.ts') };
}
function staffStore(repo) { return repo.getRecordStore('medicore.admin.staff.v1', administration.validStaff); }

test('demo edits survive a new browser session and a deleted collection stays empty', async () => {
  const first = browser(); first.repo.setRecordSession('account-a');
  const one = staffStore(first.repo); await one.refresh();
  await one.update(rows => rows.map((r, i) => i ? r : { ...r, name: 'Edited sample staff' }));
  const second = browser(first.memory); second.repo.setRecordSession('account-a');
  const two = staffStore(second.repo); await two.refresh();
  assert.equal(two.getSnapshot().records[0].name, 'Edited sample staff');
  await two.update(() => []);
  const third = browser(first.memory); third.repo.setRecordSession('account-a');
  const three = staffStore(third.repo); await three.refresh();
  assert.equal(three.getSnapshot().records.length, 0);
});

test('demo samples and restores preserve live/local records and other accounts', async () => {
  const app = browser();
  const liveKey = 'medicore.hms.v2.account-a.staff';
  app.memory.set(liveKey, 'original-records');
  app.repo.setRecordSession('account-a');
  const store = staffStore(app.repo); await store.refresh();
  await store.update(rows => rows.map((r, i) => i ? r : { ...r, name: 'Account A edit' }));
  app.repo.setRecordSession('account-b'); await store.refresh();
  assert.notEqual(store.getSnapshot().records[0].name, 'Account A edit');
  app.repo.setRecordSession('account-a'); await store.refresh();
  assert.equal(store.getSnapshot().records[0].name, 'Account A edit');
  const bKey = app.demo.demoCollectionKey('account-b', 'staff');
  const priorB = app.memory.get(bKey);
  const aKey = app.demo.demoCollectionKey('account-a', 'staff');
  const revision = JSON.parse(app.memory.get(aKey)).revision;
  app.repo.restoreSampleRecords('admin@example.test'); await store.refresh();
  assert.notEqual(store.getSnapshot().records[0].name, 'Account A edit');
  assert.ok(JSON.parse(app.memory.get(aKey)).revision > revision);
  assert.equal(app.memory.get(liveKey), 'original-records');
  assert.equal(app.memory.get(bKey), priorB);
});

test('a delayed demo save cannot write into the next signed-in account', async () => {
  let release, entered;
  const ready = new Promise(resolve => { entered = resolve; });
  const app = browser(new Map(), { request: async (_key, commit) => { entered(); await new Promise(resolve => { release = resolve; }); await commit(); } });
  app.repo.setRecordSession('account-a');
  const store = staffStore(app.repo); await store.refresh();
  const saving = store.update(rows => rows.map((r, i) => i ? r : { ...r, name: 'Delayed old edit' }));
  await ready;
  app.repo.setRecordSession('account-b'); await store.refresh();
  release();
  await assert.rejects(saving, /session changed/);
  assert.notEqual(store.getSnapshot().records[0].name, 'Delayed old edit');
});
