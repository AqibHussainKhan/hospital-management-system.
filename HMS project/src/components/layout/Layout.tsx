import { dataMode } from "../../data/recordStore";
import { useContext, useState } from "react";
import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import Navbar from "./Navbar";
import "./website-settings.css";
interface LayoutProps { children: ReactNode; activePage?: string; title?: string; subtitle?: string; onLogout: () => void; }
export default function Layout({ children, activePage = "/dashboard", title = "Dashboard", subtitle = "Hospital Management System", onLogout }: LayoutProps) {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Layout must be inside ThemeProvider");
  const { preferences, updatePreferences } = context;
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = preferences.sidebarCollapsed;
  return <MotionConfig reducedMotion={preferences.reducedMotion ? "always" : "user"}><div className="hms-app min-h-screen transition-colors duration-300">
    <div className="hidden lg:block"><Sidebar collapsed={collapsed} setCollapsed={value => updatePreferences({ sidebarCollapsed: value })} mobileOpen={false} setMobileOpen={() => {}} activePage={activePage} onLogout={onLogout} /></div>
    <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} onLogout={onLogout} />
    <div id="hms-workspace-content" className={`min-h-screen transition-[margin] duration-300 ease-out ${collapsed ? "lg:ml-[104px]" : "lg:ml-[286px]"}`}>
      <Navbar title={title} subtitle={subtitle} onMobileMenu={() => setMobileOpen(true)} onLogout={onLogout} />
      <main className={`hms-page-content ${preferences.focusedLayout ? "mx-auto w-full max-w-[1200px]" : "w-full"} ${preferences.compact ? "px-3 py-4 sm:px-4 lg:px-5 lg:py-5" : "px-4 py-6 sm:px-6 lg:px-8 lg:py-8"}`}>{dataMode === "local" && <p role="status" className="mb-5 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">Local development mode: records stay in this browser. Use Supabase mode for shared hospital data.</p>}{children}</main>
    </div>
  </div></MotionConfig>;
}
