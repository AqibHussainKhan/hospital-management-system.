import { createContext, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import {
  applyRootAppearance, createThemeTransitionController, defaultWebsitePreferences,
  readWebsitePreferences, resolveTheme, websitePreferencesKey,
} from "./themeTransition";
import type { Theme, WebsitePreferences } from "./themeTransition";
import "../styles/theme-transitions.css";

export type { Theme, ThemeMode, WebsitePreferences } from "./themeTransition";
export interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  preferences: WebsitePreferences;
  updatePreferences: (patch: Partial<WebsitePreferences>) => void;
  resetPreferences: () => void;
  storageError: string;
}
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;
const mediaMatches = (query: string) => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<WebsitePreferences>(readWebsitePreferences);
  const [systemDark, setSystemDark] = useState(() => mediaMatches("(prefers-color-scheme: dark)"));
  const [systemReduced, setSystemReduced] = useState(() => mediaMatches("(prefers-reduced-motion: reduce)"));
  const [storageError, setStorageError] = useState("");
  const requestedPreferences = useRef(preferences);
  const systemDarkRef = useRef(systemDark);
  const systemReducedRef = useRef(systemReduced);
  const controllerRef = useRef<ReturnType<typeof createThemeTransitionController> | null>(null);
  const theme = resolveTheme(preferences.themeMode, systemDark);

  const commitLatestPreferences = useCallback(() => {
    setSystemDark(systemDarkRef.current);
    setSystemReduced(systemReducedRef.current);
    setPreferences(requestedPreferences.current);
  }, []);

  const commitWithAnimation = useCallback((commit: () => void, reduced: boolean) => {
    if (typeof document === "undefined") { commit(); return; }
    if (!controllerRef.current) controllerRef.current = createThemeTransitionController(document, window);
    // This callback is invoked from user/media events or the browser transition callback,
    // never from a React render/effect. The new DOM must be ready before its snapshot.
    controllerRef.current.change(() => flushSync(commit), reduced);
  }, []);

  const updatePreferences = useCallback((patch: Partial<WebsitePreferences>) => {
    const previous = requestedPreferences.current;
    const next = { ...previous, ...patch };
    requestedPreferences.current = next;
    const reduced = next.reducedMotion || systemReducedRef.current;
    const previousTheme = resolveTheme(previous.themeMode, systemDarkRef.current);
    const nextTheme = resolveTheme(next.themeMode, systemDarkRef.current);
    if (previousTheme !== nextTheme) {
      commitWithAnimation(commitLatestPreferences, reduced);
    } else if (controllerRef.current?.isPending()) {
      // The pending snapshot callback reads the latest refs, including this patch.
      // Do not paint its target theme early just because another setting changed.
      if (reduced) controllerRef.current.finishNow();
    } else {
      commitLatestPreferences();
      if (reduced) controllerRef.current?.finishNow();
    }
  }, [commitWithAnimation, commitLatestPreferences]);

  const setTheme = useCallback((value: Theme) => updatePreferences({ themeMode: value }), [updatePreferences]);
  const toggleTheme = useCallback(() => {
    const current = resolveTheme(requestedPreferences.current.themeMode, systemDarkRef.current);
    setTheme(current === "dark" ? "light" : "dark");
  }, [setTheme]);
  const resetPreferences = useCallback(() => updatePreferences({ ...defaultWebsitePreferences }), [updatePreferences]);

  useBeforePaint(() => {
    applyRootAppearance(document.documentElement, theme, preferences, systemReduced);
  }, [theme, preferences, systemReduced]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onDark = () => {
      const changed = dark.matches !== systemDarkRef.current;
      systemDarkRef.current = dark.matches;
      if (changed && requestedPreferences.current.themeMode === "system") {
        commitWithAnimation(commitLatestPreferences, requestedPreferences.current.reducedMotion || systemReducedRef.current);
      } else if (!controllerRef.current?.isPending()) setSystemDark(dark.matches);
    };
    const onReduced = () => {
      systemReducedRef.current = reduced.matches;
      if (!controllerRef.current?.isPending()) setSystemReduced(reduced.matches);
      if (reduced.matches) controllerRef.current?.finishNow();
    };
    dark.addEventListener("change", onDark);
    reduced.addEventListener("change", onReduced);
    return () => { dark.removeEventListener("change", onDark); reduced.removeEventListener("change", onReduced); };
  }, [commitWithAnimation, commitLatestPreferences]);

  useEffect(() => () => {
    controllerRef.current?.dispose();
    controllerRef.current = null;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(websitePreferencesKey, JSON.stringify(preferences));
      localStorage.setItem("hms-theme", theme);
      setStorageError("");
    } catch { setStorageError("Preferences apply now, but could not be saved. Check browser storage."); }
  }, [preferences, theme]);

  return <ThemeContext.Provider value={{
    theme, isDark: theme === "dark", toggleTheme, setTheme, preferences,
    updatePreferences, resetPreferences, storageError,
  }}>{children}</ThemeContext.Provider>;
}
