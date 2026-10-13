import { useMemo, useSyncExternalStore } from "react";
import {
  dataMode,
  recordsEvent,
  sourceSnapshot,
  recordCanRead,
  collectionName,
} from "./recordStore";
import { demoNotificationKey } from "./demoData";
import { appointmentStore } from "./dashboardStore";
import { patientStore, labStore, medicineStore } from "./activityStore";
import {
  emptyNotificationState,
  isUnread,
  notificationSources,
  observeRecords,
  reconcileNotifications,
  validNotificationState,
} from "./notificationModel";
import type {
  HospitalNotification,
  NotificationCategory,
  ObservedRecord,
} from "./notificationModel";

interface NotificationSnapshot {
  notifications: HospitalNotification[];
  unreadCount: number;
  error: string;
}
const serverSnapshot: NotificationSnapshot = {
  notifications: [],
  unreadCount: 0,
  error: "",
};
const updateEvent = "medicore-notifications-updated";
const sourceEvents = [recordsEvent];

export function createNotificationStore(account: string) {
  const key =
    dataMode === "demo"
      ? demoNotificationKey(account)
      : `medicore.notifications.v1:${encodeURIComponent(account)}`;
  const listeners = new Set<() => void>();
  let state = emptyNotificationState();
  let snapshot = serverSnapshot;
  let previousRaw: string | null | undefined;
  let storageError = "";
  let blocked = false;
  let refreshing = false;
  let timer: number | undefined;
  let unsubscribeSources: (() => void)[] = [];

  function load() {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== previousRaw) {
        const saved: unknown =
          raw === null ? emptyNotificationState() : JSON.parse(raw);
        if (!validNotificationState(saved))
          throw new Error("Invalid notification state");
        state = saved;
        previousRaw = raw;
      }
      blocked = false;
      if (storageError.startsWith("Saved notifications")) storageError = "";
    } catch {
      blocked = true;
      storageError =
        "Saved notifications could not be read. Existing data was kept; changes apply for this session only.";
    }
  }

  function persist() {
    if (blocked) return;
    try {
      const raw = JSON.stringify(state);
      window.localStorage.setItem(key, raw);
      previousRaw = raw;
      storageError = "";
      window.dispatchEvent(new Event(updateEvent));
    } catch {
      storageError =
        "Notification changes apply now, but could not be saved. Check browser storage.";
    }
  }

  function publish(sourceErrors: string[] = []) {
    const notifications = state.notifications.filter(
      (notice) => !notice.dismissedAt,
    );
    const next = {
      notifications,
      unreadCount: notifications.filter(isUnread).length,
      error: [storageError, ...sourceErrors].filter(Boolean).join(" "),
    };
    if (JSON.stringify(next) === JSON.stringify(snapshot)) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function refresh() {
    if (typeof window === "undefined" || refreshing) return;
    refreshing = true;
    try {
      load();
      const sources: Partial<Record<NotificationCategory, ObservedRecord[]>> =
        {};
      const errors: string[] = [];
      for (const category of Object.keys(
        notificationSources,
      ) as NotificationCategory[]) {
        try {
          if (!recordCanRead(collectionName(notificationSources[category].key)))
            continue;
          const source = sourceSnapshot(notificationSources[category].key);
          if (!source || source.loading) continue;
          if (source.error) throw new Error(source.error);
          sources[category] = observeRecords(category, source.records);
        } catch {
          errors.push(
            `${notificationSources[category].label} updates are unavailable; saved records were kept.`,
          );
        }
      }
      const next = reconcileNotifications(state, sources);
      if (next !== state) {
        state = next;
        persist();
      }
      publish(errors);
    } finally {
      refreshing = false;
    }
  }

  function onStorage(event: StorageEvent) {
    if (
      event.key === null ||
      event.key === key ||
      Object.values(notificationSources).some(
        (source) => source.key === event.key,
      )
    )
      refresh();
  }

  function subscribe(listener: () => void) {
    if (!listeners.size) {
      unsubscribeSources = [
        appointmentStore,
        patientStore,
        labStore,
        medicineStore,
      ].map((store) => store.subscribe(refresh));
      refresh();
      window.addEventListener("storage", onStorage);
      window.addEventListener("focus", refresh);
      window.addEventListener(updateEvent, refresh);
      sourceEvents.forEach((name) => window.addEventListener(name, refresh));
      timer = window.setInterval(refresh, 10_000);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("focus", refresh);
        window.removeEventListener(updateEvent, refresh);
        sourceEvents.forEach((name) =>
          window.removeEventListener(name, refresh),
        );
        window.clearInterval(timer);
        unsubscribeSources.forEach((fn) => fn());
        unsubscribeSources = [];
      }
    };
  }

  function change(
    transform: (
      notices: HospitalNotification[],
      time: string,
    ) => HospitalNotification[],
  ) {
    refresh();
    state = {
      ...state,
      notifications: transform(state.notifications, new Date().toISOString()),
    };
    persist();
    refresh();
  }

  // Reads start at subscription, keeping React render free of storage writes.
  return {
    subscribe,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    refresh,
    markRead: (id: string) =>
      change((notices, time) =>
        notices.map((notice) =>
          notice.id === id && !notice.readAt
            ? { ...notice, readAt: time }
            : notice,
        ),
      ),
    markAllRead: () =>
      change((notices, time) =>
        notices.map((notice) =>
          !notice.readAt ? { ...notice, readAt: time } : notice,
        ),
      ),
    dismiss: (id: string) =>
      change((notices, time) =>
        notices.map((notice) =>
          notice.id === id ? { ...notice, dismissedAt: time } : notice,
        ),
      ),
    clearRead: () =>
      change((notices, time) =>
        notices.map((notice) =>
          notice.readAt || notice.resolvedAt
            ? { ...notice, dismissedAt: time }
            : notice,
        ),
      ),
  };
}

const stores = new Map<string, ReturnType<typeof createNotificationStore>>();
export function useNotifications(account: string) {
  const store = useMemo(() => {
    const identity = account.trim().toLowerCase();
    let value = stores.get(identity);
    if (!value) {
      value = createNotificationStore(identity);
      stores.set(identity, value);
    }
    return value;
  }, [account]);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return {
    ...snapshot,
    markRead: store.markRead,
    markAllRead: store.markAllRead,
    dismiss: store.dismiss,
    clearRead: store.clearRead,
    refresh: store.refresh,
  };
}
