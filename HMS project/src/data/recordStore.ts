import { useSyncExternalStore } from "react";
import { getSupabase } from "../lib/supabaseClient";
import { mergeRecords, validateRecords, stableJson } from "./recordCore";
import type { Identified, Validator } from "./recordCore";

export const dataMode = import.meta.env.VITE_HMS_DATA_MODE === "local" ? "local" : "supabase";
export const recordsEvent = "medicore-records-updated";
const stores = new Map<string, RecordStore<Identified>>();
let accountId: string | null = null;
let generation = 0;
export function setRecordSession(id: string | null) {
  if (id === accountId) return;
  accountId = id; generation += 1;
  for (const store of stores.values()) store.reset();
  window.dispatchEvent(new Event(recordsEvent));
}
export const recordAccountId = () => accountId;
export function collectionName(key: string) {
  const map: Record<string, string> = {
    "medicore.patients.v1": "patients", "medicore.operations.wards.v1": "wards",
    "medicore.operations.tests.v1": "tests", "medicore.operations.medicines.v1": "medicines",
    "medicore.appointments.v1": "appointments", "medicore.patient-visits.v1": "visits",
    "medicore.admin.staff.v1": "staff", "medicore.admin.attendance.v1": "attendance",
    "medicore.admin.billing.v1": "billing", "medicore.doctors.v1": "doctors", "medicore.surgeries.v1": "surgeries",
  };
  const name = map[key];
  if (!name) throw new Error("Unknown record collection.");
  return name;
}
export interface Snapshot<T> { records: T[]; error: string; loading: boolean; saving: boolean }
export interface RecordStore<T extends Identified> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Snapshot<T>;
  getServerSnapshot: () => Snapshot<T>;
  refresh: () => Promise<void>;
  reset: () => void;
  update: (transform: (records: T[]) => T[]) => Promise<void>;
  save: (base: T[], next: T[]) => Promise<boolean>;
}
function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : (error as { message?: string })?.message;
  if (message?.includes("HMS_CONFLICT")) return "Records changed on another device. Refresh and reopen the editor.";
  if (message?.includes("HMS_INVALID")) return "Changes failed validation. Check references, schedules, capacity and payment amounts.";
  if (message?.includes("hms_") || message?.includes("schema cache")) return "Database setup is missing or access is denied. Run the supplied Supabase SQL and authorize your administrator.";
  return message || "Records could not be saved. Check your connection and try again.";
}

export function getRecordStore<T extends Identified>(key: string, validate: Validator<T>, check?: (records: T[]) => void): RecordStore<T> {
  const registered = stores.get(key);
  if (registered) return registered as unknown as RecordStore<T>;
  const name = collectionName(key);
  const empty: Snapshot<T> = { records: [], error: "", loading: true, saving: false };
  let snapshot = empty;
  let revision = 0;
  let pending: Promise<void> | null = null;
  let writeQueue: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  let timer: number | undefined;
  const publish = (next: Snapshot<T>) => {
    if (stableJson(next) === stableJson(snapshot)) return;
    snapshot = next; listeners.forEach(fn => fn());
    window.dispatchEvent(new Event(recordsEvent));
  };
  const verify = (value: unknown) => { const rows = validateRecords(value, validate); check?.(rows); return rows; };
  const storageKey = () => `medicore.hms.v2.${accountId}.${name}`;
  async function load() {
    const epoch = generation;
    if (!accountId) { publish(empty); return; }
    try {
      let rows: unknown, version: number;
      if (dataMode === "local") {
        const raw = localStorage.getItem(storageKey());
        const parsed: unknown = raw === null ? { revision: 0, records: [] } : JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !("revision" in parsed) || !("records" in parsed) || !Number.isSafeInteger(parsed.revision)) throw new Error("Saved records are invalid. Existing data was kept.");
        rows = parsed.records; version = Number(parsed.revision);
      } else {
        const result = await getSupabase().from("hms_collections").select("records,revision").eq("name", name).maybeSingle();
        if (result.error) throw result.error;
        if (!result.data) throw new Error("hms_collections is not initialized for this administrator.");
        rows = result.data.records; version = Number(result.data.revision);
      }
      const records = verify(rows);
      if (epoch !== generation) return;
      revision = version; publish({ records, error: "", loading: false, saving: snapshot.saving });
    } catch (error) {
      if (epoch === generation) publish({ ...snapshot, loading: false, error: readableError(error) });
    }
  }
  const refresh = () => {
    if (!pending) pending = load().finally(() => { pending = null; });
    return pending;
  };
  async function write(transform: (records: T[]) => T[]) {
    const epoch = generation;
    const identity = accountId;
    if (!identity) throw new Error("Sign in again before saving records.");
    await refresh();
    if (epoch !== generation) throw new Error("Your session changed. Sign in again.");
    if (snapshot.error || snapshot.loading) throw new Error(snapshot.error || "Records are still loading.");
    const next = verify(transform(snapshot.records));
    publish({ ...snapshot, saving: true });
    try {
      if (dataMode === "local") {
        const commit = async () => {
          const raw = localStorage.getItem(storageKey());
          const current = raw === null ? 0 : Number(JSON.parse(raw).revision);
          if (current !== revision) throw new Error("HMS_CONFLICT");
          localStorage.setItem(storageKey(), JSON.stringify({ revision: revision + 1, records: next }));
        };
        if (!navigator.locks) throw new Error("Local editing requires a browser with Web Locks support. Use Supabase mode for shared data.");
        await navigator.locks.request(storageKey(), commit);
      } else {
        const result = await getSupabase().rpc("hms_save_collection", { collection_name: name, expected_revision: revision, next_records: next });
        if (result.error) throw result.error;
        if (epoch === generation) revision = Number(result.data) - 1;
      }
      if (epoch !== generation) return;
      revision += 1;
      publish({ records: next, loading: false, saving: false, error: "" });
    } catch (error) {
      if (epoch === generation) publish({ ...snapshot, saving: false, error: readableError(error) });
      throw new Error(readableError(error));
    }
  }
  const update = (transform: (records: T[]) => T[]) => {
    const epoch = generation;
    const operation = writeQueue.then(() => { if (epoch !== generation) throw new Error("Your session changed. Reopen this page."); return write(transform); });
    writeQueue = operation.catch(() => {});
    return operation;
  };
  const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === storageKey()) void refresh(); };
  const onFocus = () => { void refresh(); };
  const store: RecordStore<T> = {
    getSnapshot: () => snapshot, getServerSnapshot: () => empty, refresh,
    reset: () => { revision = 0; pending = null; publish(empty); if (listeners.size) void refresh(); },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        void refresh(); window.addEventListener("focus", onFocus); window.addEventListener("storage", onStorage);
        timer = window.setInterval(onFocus, 15000);
      }
      return () => { listeners.delete(listener); if (!listeners.size) { clearInterval(timer); window.removeEventListener("focus", onFocus); window.removeEventListener("storage", onStorage); } };
    },
    update,
    async save(base, next) {
      try { verify(next); await update(current => mergeRecords(base, next, current)); return true; }
      catch (error) { publish({ ...snapshot, saving: false, error: readableError(error) }); return false; }
    },
  };
  stores.set(key, store as unknown as RecordStore<Identified>);
  return store;
}
export function useRecordStore<T extends Identified>(store: RecordStore<T>) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...snapshot, save: (next: T[]) => store.save(snapshot.records, next), refresh: store.refresh };
}
export function sourceSnapshot(key: string) { return stores.get(key)?.getSnapshot(); }
