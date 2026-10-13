import { useState } from "react";
import { useHospitalRpc } from "./rpc";
import { useAccess } from "./useAccess";
export interface PersonalNotice {
  id: string;
  title: string;
  message: string;
  path: string;
  updatedAt: string;
}
export function usePersonalNotifications() {
  const access = useAccess(),
    state = useHospitalRpc<PersonalNotice[]>("hms_personal_notifications");
  const key = `medicore.personal-notices.v1:${access.userId}`;
  const [read, setRead] = useState<Record<string, string>>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) || "{}");
      return value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.values(value).every((item) => typeof item === "string")
        ? (value as Record<string, string>)
        : {};
    } catch {
      return {};
    }
  });
  const items = (state.data || [])
    .filter((item) => access.canVisit(item.path))
    .map((item) => ({ ...item, unread: read[item.id] !== item.updatedAt }));
  function mark(ids: string[]) {
    const next = { ...read };
    for (const item of items)
      if (ids.includes(item.id)) next[item.id] = item.updatedAt;
    setRead(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* Read state remains available for this session. */
    }
  }
  return {
    ...state,
    items,
    unreadCount: items.filter((item) => item.unread).length,
    markRead: (id: string) => mark([id]),
    markAllRead: () => mark(items.map((item) => item.id)),
  };
}
