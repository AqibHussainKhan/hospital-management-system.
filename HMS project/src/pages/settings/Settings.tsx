import { useAccess } from "../../features/access/useAccess";
import { useContext, useState } from "react";
import {
  Sun,
  Moon,
  Monitor,
  PanelLeftClose,
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
  Check,
  LayoutDashboard,
  Search,
  Bell,
  PanelTop,
  Eye,
} from "lucide-react";
import type { ReactNode } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import Layout from "../../components/layout/Layout";
import DemoDataSettings from "../../components/administration/DemoDataSettings";
function Toggle({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-[var(--hms-border)] py-6 last:border-0">
      <div className="flex items-start gap-4">
        <span className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="mt-2 max-w-lg text-xs leading-6 text-[var(--hms-text-muted)]">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${checked ? "bg-blue-600" : "bg-slate-400/40"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "left-1 translate-x-5" : "left-1"}`}
        />
      </button>
    </div>
  );
}
export default function Settings({ onLogout }: { onLogout: () => void }) {
  const access = useAccess();
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Settings must be inside ThemeProvider");
  const {
    preferences,
    updatePreferences,
    resetPreferences,
    storageError,
    theme,
  } = context;
  const [resetMessage, setResetMessage] = useState("");
  return (
    <Layout
      activePage="/settings"
      title="Settings"
      subtitle="Personalize your website appearance and experience"
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-[1200px] space-y-6 pb-10 text-[var(--hms-text)]">
        <header>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">
            Website Preferences
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Make MediCore Yours
          </h1>
          <p className="mt-2 text-sm text-[var(--hms-text-muted)]">
            Changes apply instantly across the website and save in this browser.
          </p>
        </header>
        {access.isAdmin && <DemoDataSettings />}
        <section className="hms-card rounded-[24px] p-6">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <p className="mt-2 text-xs text-[var(--hms-text-muted)]">
            Choose your theme. System follows your device, including future
            changes.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {(
              [
                {
                  value: "light",
                  title: "Light",
                  icon: Sun,
                  preview: "bg-slate-100",
                  surface: "bg-white",
                  text: "bg-slate-300",
                },
                {
                  value: "dark",
                  title: "Dark",
                  icon: Moon,
                  preview: "bg-slate-950",
                  surface: "bg-slate-800",
                  text: "bg-slate-600",
                },
                {
                  value: "system",
                  title: "System",
                  icon: Monitor,
                  preview: "bg-gradient-to-r from-slate-100 to-slate-900",
                  surface: "bg-blue-500/20",
                  text: "bg-blue-400/60",
                },
              ] as const
            ).map((item) => (
              <button
                type="button"
                key={item.value}
                aria-pressed={preferences.themeMode === item.value}
                onClick={() => {
                  updatePreferences({ themeMode: item.value });
                  setResetMessage("");
                }}
                className={`rounded-2xl border-2 p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${preferences.themeMode === item.value ? "border-blue-500 bg-blue-500/5" : "border-[var(--hms-border)] hover:border-blue-500/40"}`}
              >
                <div
                  aria-hidden="true"
                  className={`flex h-28 gap-2 rounded-xl p-3 ${item.preview}`}
                >
                  <div className={`w-7 rounded-lg ${item.surface}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-4 rounded ${item.surface}`} />
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`h-8 rounded ${item.surface}`} />
                      <div className={`h-8 rounded ${item.surface}`} />
                    </div>
                    <div className={`h-2 w-2/3 rounded ${item.text}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
                  <item.icon size={16} />
                  {item.title}
                  {preferences.themeMode === item.value && (
                    <Check size={16} className="ml-auto text-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--hms-text-muted)]">
            Current theme: {theme}. The navbar theme button uses this same
            setting.
          </p>
        </section>
        <section className="hms-card rounded-[24px] px-6">
          <Toggle
            label="Collapsed Sidebar"
            description="Keep the desktop sidebar folded into icons. The sidebar fold button updates this preference too."
            checked={preferences.sidebarCollapsed}
            onChange={(value) => updatePreferences({ sidebarCollapsed: value })}
            icon={<PanelLeftClose size={20} />}
          />
          <Toggle
            label="Compact Display"
            description="Reduce page padding and table row spacing for a denser workspace."
            checked={preferences.compact}
            onChange={(value) => updatePreferences({ compact: value })}
            icon={<SlidersHorizontal size={20} />}
          />
          <Toggle
            label="Reduce Motion"
            description="Reduce movement and turn off decorative CSS animations. Device accessibility preferences are respected too; subtle fade effects may remain."
            checked={preferences.reducedMotion}
            onChange={(value) => updatePreferences({ reducedMotion: value })}
            icon={<Sparkles size={20} />}
          />
        </section>
        <section className="hms-card rounded-[24px] px-6">
          <h2 className="pt-6 text-lg font-semibold">
            Navigation &amp; Workspace
          </h2>
          <Toggle
            label="Focused Content Layout"
            description="Limit page content to 1200px on large screens. Turn off to use the full available width."
            checked={preferences.focusedLayout}
            onChange={(value) => updatePreferences({ focusedLayout: value })}
            icon={<LayoutDashboard size={20} />}
          />
          <Toggle
            label="Sticky Navbar"
            description="Keep the navbar at the top while scrolling. Turn off to let it scroll with the page."
            checked={preferences.stickyNavbar}
            onChange={(value) => updatePreferences({ stickyNavbar: value })}
            icon={<PanelTop size={20} />}
          />
          <Toggle
            label="Navbar Search"
            description="Show or hide the existing search field on desktop. This controls visibility; it does not add global search functionality."
            checked={preferences.showSearch}
            onChange={(value) => updatePreferences({ showSearch: value })}
            icon={<Search size={20} />}
          />
          <Toggle
            label="Notification Bell"
            description="Show or hide the navbar notification button. This preference does not disable notification delivery."
            checked={preferences.showNotifications}
            onChange={(value) =>
              updatePreferences({ showNotifications: value })
            }
            icon={<Bell size={20} />}
          />
          <Toggle
            label="High Contrast Text"
            description="Use the primary text color for muted and secondary theme text, making labels easier to read."
            checked={preferences.highContrast}
            onChange={(value) => updatePreferences({ highContrast: value })}
            icon={<Eye size={20} />}
          />
        </section>
        <section className="hms-card-soft flex flex-col justify-between gap-4 rounded-[24px] p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">Reset Website Preferences</h2>
            <p className="mt-2 text-xs leading-6 text-[var(--hms-text-muted)]">
              Restore all website preferences, including theme, sidebar, layout
              and navbar controls. Saved hospital records and your profile are
              kept.
            </p>
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--hms-border)] px-4 py-3 text-sm font-semibold hover:bg-blue-500/10"
            onClick={() => {
              resetPreferences();
              setResetMessage("Website preferences restored to defaults.");
            }}
          >
            <RotateCcw size={16} /> Reset Preferences
          </button>
        </section>
        {(storageError || resetMessage) && (
          <p
            role={storageError ? "alert" : "status"}
            className={`rounded-xl p-3 text-sm ${storageError ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}
          >
            {storageError || resetMessage}
          </p>
        )}
      </div>
    </Layout>
  );
}
