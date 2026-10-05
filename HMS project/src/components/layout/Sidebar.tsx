import { useAccount, AccountAvatar } from "../../context/AccountContext";
import { useLayoutEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { Activity, BarChart3, LayoutDashboard, Users, UserRound, CalendarDays, FlaskConical, Pill, BedDouble, HeartPulse, UsersRound, Clock3, CreditCard, FileText, Settings, LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./curved-sidebar.css";
interface SidebarProps { collapsed: boolean; setCollapsed: (value: boolean) => void; mobileOpen: boolean; setMobileOpen: (value: boolean) => void; activePage?: string; scrollStorageKey?: string; onLogout: () => void; }
const sections = [
  { title: "Overview", items: [{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  { title: "Clinical", items: [{ label: "Patients", path: "/patients", icon: Users }, { label: "Doctors", path: "/doctors", icon: UserRound }, { label: "Appointments", path: "/appointments", icon: CalendarDays }, { label: "Patient Analytics", path: "/patient-analytics", icon: BarChart3 }] },
  { title: "Departments", items: [{ label: "Laboratory", path: "/laboratory", icon: FlaskConical }, { label: "Pharmacy", path: "/pharmacy", icon: Pill }, { label: "Wards & Rooms", path: "/wards", icon: BedDouble }, { label: "Operation Theater", path: "/operation-theater", icon: HeartPulse }] },
  { title: "Administration", items: [{ label: "Staff", path: "/staff", icon: UsersRound }, { label: "Attendance", path: "/attendance", icon: Clock3 }, { label: "Billing", path: "/billing", icon: CreditCard }, { label: "Reports", path: "/reports", icon: FileText }] },
];
function CurvedLink({ path, label, icon: Icon, collapsed, onClick }: { path: string; label: string; icon: LucideIcon; collapsed: boolean; onClick: () => void }) {
  return <NavLink to={path} end aria-label={label} onClick={onClick} className={({ isActive }) => `mc-rail-link ${isActive ? "is-active" : ""} ${collapsed ? "is-folded" : ""}`}>
    {({ isActive }) => <>{isActive && <svg aria-hidden="true" className="mc-rail-notch" viewBox="0 0 286 104" preserveAspectRatio="none"><path d="M286 0 C286 16 280 22 261 26 H55 C18 26 18 78 55 78 H261 C280 82 286 88 286 104 Z" /></svg>}<span className="mc-rail-icon"><Icon size={20} strokeWidth={1.8} /></span>{!collapsed && <span className="mc-rail-label">{label}</span>}</>}
  </NavLink>;
}
export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, scrollStorageKey = "medicore.sidebar.scroll.desktop", onLogout }: SidebarProps) {
  const user = useAccount();
  const navRef = useRef<HTMLElement>(null);
  const savedScroll = useRef(0);
  const rememberScroll = () => {
    const nav = navRef.current;
    if (!nav || !nav.getClientRects().length) return;
    savedScroll.current = nav.scrollTop;
    try { sessionStorage.setItem(scrollStorageKey, String(nav.scrollTop)); } catch { /* Navigation still works when storage is unavailable. */ }
  };
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || !nav.getClientRects().length) return;
    let position = savedScroll.current;
    try { const stored = Number(sessionStorage.getItem(scrollStorageKey)); if (Number.isFinite(stored) && stored >= 0) position = stored; } catch { /* Use in-memory position. */ }
    nav.scrollTop = position;
    savedScroll.current = nav.scrollTop;
  }, [scrollStorageKey, collapsed, mobileOpen]);
  const close = () => { rememberScroll(); setMobileOpen(false); };
  return <>
    {mobileOpen && <button type="button" aria-label="Close navigation overlay" onClick={close} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" />}
    <aside aria-label="Main navigation" className={`mc-rail fixed left-0 top-0 z-50 flex h-[100dvh] flex-col transition-[width,transform] duration-300 ${collapsed ? "w-[286px] lg:w-[104px]" : "w-[286px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className={`mc-rail-brand flex h-[98px] shrink-0 items-center ${collapsed ? "justify-center px-3" : "gap-3 px-6"}`}><div className="mc-rail-logo"><Activity size={26} /></div>{!collapsed && <div className="min-w-0"><p className="text-lg font-semibold tracking-tight text-[var(--hms-text)]">MediCore</p><p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.22em] text-[var(--hms-text-muted)]">Hospital System</p></div>}<button type="button" aria-label="Close sidebar" onClick={close} className="ml-auto rounded-xl p-2 text-[var(--hms-text-secondary)] lg:hidden"><X size={19} /></button></div>
      <div className={`hidden shrink-0 px-5 pb-4 lg:flex ${collapsed ? "justify-center" : "justify-end"}`}><button type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)} className="mc-rail-fold">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div>
      <nav ref={navRef} onScroll={rememberScroll} className="mc-rail-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-8 pt-5">{sections.map((section, index) => <div key={section.title} className="mb-5 last:mb-0">{!collapsed ? <p className="mb-3 pl-7 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--hms-text-muted)]">{section.title}</p> : index > 0 ? <div className="mx-auto mb-4 h-px w-6 bg-[var(--hms-border)]" /> : null}<div className="space-y-2">{section.items.map(item => <CurvedLink key={item.path} {...item} collapsed={collapsed} onClick={close} />)}</div></div>)}</nav>
      <footer className="mc-rail-footer shrink-0 pb-5 pt-3">
        <div className="space-y-2"><CurvedLink path="/settings" label="Settings" icon={Settings} collapsed={collapsed} onClick={close} />
          <NavLink to="/administrator" aria-label={`Profile: ${user.name || user.email}`} onClick={close} className={({ isActive }) => `mc-rail-profile ${collapsed ? "is-folded" : ""} ${isActive ? "is-active" : ""}`}>
            <AccountAvatar user={user} className="h-11 w-11 rounded-2xl text-xs" />
            {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[var(--hms-text)]">{user.name || user.email}</span><span className="mt-1 block truncate text-[9px] text-[var(--hms-text-muted)]">{user.email}</span></span>}
          </NavLink>
          <button type="button" aria-label="Sign Out" onClick={onLogout} className={`mc-rail-logout ${collapsed ? "is-folded" : ""}`}><LogOut size={20} />{!collapsed && <span>Sign Out</span>}</button>
        </div>
      </footer>
    </aside>
  </>;
}
