export type Theme = "light" | "dark";
export type ThemeMode = Theme | "system";

export interface WebsitePreferences {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  compact: boolean;
  reducedMotion: boolean;
  focusedLayout: boolean;
  stickyNavbar: boolean;
  showSearch: boolean;
  showNotifications: boolean;
  highContrast: boolean;
}

export const websitePreferencesKey = "hms-website-settings-v1";
export const defaultWebsitePreferences: WebsitePreferences = {
  themeMode: "system", sidebarCollapsed: false, compact: false, reducedMotion: false,
  focusedLayout: false, stickyNavbar: true, showSearch: true, showNotifications: true, highContrast: false,
};

export function readWebsitePreferences(storage?: Pick<Storage, "getItem">): WebsitePreferences {
  try {
    const source = storage || (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!source) return { ...defaultWebsitePreferences };
    const saved: unknown = JSON.parse(source.getItem(websitePreferencesKey) || "null");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      const value = saved as Record<string, unknown>;
      return {
        themeMode: value.themeMode === "light" || value.themeMode === "dark" || value.themeMode === "system" ? value.themeMode : "system",
        sidebarCollapsed: value.sidebarCollapsed === true, compact: value.compact === true,
        reducedMotion: value.reducedMotion === true, focusedLayout: value.focusedLayout === true,
        stickyNavbar: value.stickyNavbar !== false, showSearch: value.showSearch !== false,
        showNotifications: value.showNotifications !== false, highContrast: value.highContrast === true,
      };
    }
    const legacy = source.getItem("hms-theme");
    return { ...defaultWebsitePreferences, themeMode: legacy === "light" || legacy === "dark" ? legacy : "system" };
  } catch { return { ...defaultWebsitePreferences }; }
}

export function resolveTheme(mode: ThemeMode, systemDark: boolean): Theme {
  return mode === "system" ? (systemDark ? "dark" : "light") : mode;
}

export function applyRootAppearance(root: HTMLElement, theme: Theme, preferences: WebsitePreferences, systemReduced: boolean) {
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  root.setAttribute("data-hms-contrast", preferences.highContrast ? "high" : "normal");
  root.setAttribute("data-hms-density", preferences.compact ? "compact" : "comfortable");
  root.setAttribute("data-hms-motion", preferences.reducedMotion || systemReduced ? "reduced" : "normal");
}

interface ThemeViewTransition {
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
}
interface ViewTransitionDocument {
  startViewTransition?: (update: () => void) => ThemeViewTransition;
}

// Isolated from React so request cancellation, completion and fallback can be checked directly.
export function createThemeTransitionController(
  doc: Document,
  scheduler: Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame">,
) {
  const root = doc.documentElement;
  let sequence = 0;
  let active: ThemeViewTransition | null = null;
  let pendingCommit: (() => void) | null = null;
  let releaseFrame: number | null = null;

  function cancelFrame() {
    if (releaseFrame !== null) scheduler.cancelAnimationFrame(releaseFrame);
    releaseFrame = null;
  }
  function release(token: number) {
    if (token !== sequence) return;
    cancelFrame();
    active = null;
    pendingCommit = null;
    root.removeAttribute("data-hms-theme-switch");
  }
  function releaseNextFrame(token: number) {
    cancelFrame();
    // Recalculate the committed styles while local color transitions are disabled.
    // Restoring their normal rules afterwards cannot start a delayed second theme fade.
    void root.offsetWidth;
    releaseFrame = scheduler.requestAnimationFrame(() => release(token));
  }

  function change(commit: () => void, reducedMotion: boolean) {
    const token = ++sequence;
    cancelFrame();
    active?.skipTransition();
    active = null;
    let committed = false;
    const applyOnce = () => {
      if (token !== sequence || committed) return;
      committed = true;
      pendingCommit = null;
      commit();
    };
    pendingCommit = applyOnce;
    const start = (doc as unknown as ViewTransitionDocument).startViewTransition;
    if (reducedMotion || doc.visibilityState === "hidden" || typeof start !== "function") {
      root.setAttribute("data-hms-theme-switch", "instant");
      applyOnce();
      releaseNextFrame(token);
      return;
    }

    // Native snapshots animate the entire page with one timeline, including gradients,
    // SVGs, conditional React content and dialogs rendered outside .hms-app.
    root.setAttribute("data-hms-theme-switch", "view");
    try {
      const transition = start.call(doc, applyOnce);
      active = transition;
      // A skipped animation rejects ready, even though its DOM callback still runs.
      void transition.ready.catch(() => {});
      void transition.updateCallbackDone.catch(() => {});
      void transition.finished.then(
        () => release(token),
        () => { if (token === sequence) { applyOnce(); releaseNextFrame(token); } },
      );
    } catch {
      root.setAttribute("data-hms-theme-switch", "instant");
      applyOnce();
      releaseNextFrame(token);
    }
  }

  function finishNow() {
    active?.skipTransition();
    pendingCommit?.();
    root.setAttribute("data-hms-theme-switch", "instant");
    releaseNextFrame(sequence);
  }

  function dispose() {
    ++sequence;
    cancelFrame();
    active?.skipTransition();
    active = null;
    pendingCommit = null;
    root.removeAttribute("data-hms-theme-switch");
  }

  return { change, finishNow, dispose, isPending: () => pendingCommit !== null };
}
