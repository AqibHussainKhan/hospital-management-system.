import { useAccess } from "../../features/access/useAccess";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { AccountAvatar, useAccount } from "../../context/AccountContext";
import { ThemeContext } from "../../context/ThemeContext";
import { notificationSources } from "../../data/notificationModel";
import { useNotifications } from "../../data/notificationStore";
import useOutsideDismiss from "../../hooks/useOutsideDismiss";
import WorkspaceNotifications from "./WorkspaceNotifications";
import { usePersonalNotifications } from "../../features/access/usePersonalNotifications";
import { profileNavigation } from "./profileNavigation";

interface NavbarProps {
  title?: string;
  subtitle?: string;
  onMobileMenu?: () => void;
  onLogout: () => void;
}

export default function Navbar({
  title = "Dashboard",
  subtitle = "Hospital Management System",
  onMobileMenu,
  onLogout,
}: NavbarProps) {
  const user = useAccount();
  const access = useAccess();
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Navbar must be inside ThemeProvider");
  const { preferences, isDark, toggleTheme } = context;
  const navigate = useNavigate();
  const location = useLocation();
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = preferences.reducedMotion || systemReducedMotion;
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [profileQuery, setProfileQuery] = useState("");
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const closeNotifications = useCallback(() => setNotificationOpen(false), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const notifications = useNotifications(
    `${access.userId}:${access.role}:${access.version}:${access.permissions.join(",")}`,
  );

  const personal = usePersonalNotifications();
  const totalUnread = notifications.unreadCount + personal.unreadCount;
  const noticeItems = [
    ...personal.items.map((item) => ({
      id: `work-${item.id}`,
      title: item.title,
      message: item.message,
      time: item.updatedAt,
      unread: item.unread,
      open: () => navigate(item.path),
      markRead: () => personal.markRead(item.id),
    })),
    ...notifications.notifications
      .filter((item) =>
        access.canVisit(notificationSources[item.category].href),
      )
      .map((item) => ({
        id: `record-${item.id}`,
        title: item.title,
        message: item.message,
        time: item.occurredAt || item.detectedAt,
        unread: !item.readAt && !item.resolvedAt,
        open: () =>
          navigate(
            `${notificationSources[item.category].href}?${item.category === "patients" ? "patient" : "entity"}=${encodeURIComponent(item.entityId)}`,
          ),
        markRead: () => notifications.markRead(item.id),
      })),
  ];

  useOutsideDismiss(notificationOpen, notificationRef, closeNotifications);
  useOutsideDismiss(profileOpen, profileRef, closeProfile);
  useEffect(() => {
    setProfileOpen(false);
    setNotificationOpen(false);
  }, [location.key, location.pathname, location.search]);
  useEffect(() => {
    if (!preferences.showNotifications) setNotificationOpen(false);
  }, [preferences.showNotifications]);

  const sections = profileNavigation
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          access.canVisit(item.path) &&
          `${item.label} ${section.title}`
            .toLowerCase()
            .includes(profileQuery.trim().toLowerCase()),
      ),
    }))
    .filter((section) => section.items.length);
  const popupMotion = {
    initial: { opacity: 0, y: reducedMotion ? 0 : -6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reducedMotion ? 0 : -6 },
    transition: { duration: reducedMotion ? 0 : 0.15 },
  };
  const iconButton =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] text-[var(--hms-text-secondary)] transition hover:border-blue-500/30 hover:text-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500";

  return (
    <header
      className={`hms-navbar top-0 z-30 border-b backdrop-blur-2xl transition-colors duration-300 ${preferences.stickyNavbar ? "sticky" : "relative"}`}
    >
      <div className="flex h-[88px] items-center justify-between gap-3 px-4 md:gap-6 md:px-8">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={onMobileMenu}
            aria-label="Open sidebar"
            className={`${iconButton} lg:hidden`}
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-[var(--hms-text)] md:text-xl">
              {title}
            </h2>
            <p className="mt-1 hidden truncate text-[10px] font-medium text-[var(--hms-text-muted)] sm:block">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {preferences.showSearch && access.can("patients") && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                navigate(
                  `/patients?q=${encodeURIComponent(globalQuery.trim())}`,
                );
              }}
              className="hms-navbar-search hidden w-[210px] xl:flex 2xl:w-[280px]"
              role="search"
              aria-label="Find hospital patients"
            >
              <Search
                size={16}
                className="hms-navbar-search-icon"
                aria-hidden="true"
              />
              <input
                type="text"
                value={globalQuery}
                onChange={(event) => setGlobalQuery(event.target.value)}
                aria-label="Search patients"
                placeholder="Search patients…"
                className="hms-navbar-search-input"
              />
            </form>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              isDark ? "Switch to light theme" : "Switch to dark theme"
            }
            title={isDark ? "Light mode" : "Dark mode"}
            className={iconButton}
          >
            {isDark ? (
              <Sun size={17} className="text-amber-400" />
            ) : (
              <Moon size={17} className="text-blue-600" />
            )}
          </button>

          {preferences.showNotifications && (
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                data-dropdown-trigger
                onClick={() => {
                  if (!notificationOpen) {
                    notifications.refresh();
                    personal.refresh();
                  }
                  setNotificationOpen((current) => !current);
                  setProfileOpen(false);
                }}
                aria-label={`Notifications, ${totalUnread} unread`}
                aria-haspopup="dialog"
                aria-expanded={notificationOpen}
                aria-controls="hms-notifications-panel"
                className={`relative ${iconButton}`}
              >
                <Bell size={17} />
                {totalUnread > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-blue-500 px-1 text-[8px] font-bold text-white ring-2 ring-[var(--hms-surface)]"
                  >
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notificationOpen && (
                  <motion.div
                    key="notifications"
                    {...popupMotion}
                    className="fixed left-3 right-3 top-[78px] z-50 sm:absolute sm:left-auto sm:right-0 sm:top-[52px] sm:w-[380px]"
                  >
                    <WorkspaceNotifications
                      items={noticeItems}
                      error={personal.error || notifications.error}
                      onClose={closeNotifications}
                      onMarkAll={() => {
                        personal.markAllRead();
                        notifications.markAllRead();
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div ref={profileRef} className="relative">
            <button
              type="button"
              data-dropdown-trigger
              onClick={() => {
                setProfileOpen((current) => !current);
                setNotificationOpen(false);
                setProfileQuery("");
              }}
              aria-label={`Account navigation: ${user.name || user.email}`}
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
              aria-controls="hms-account-panel"
              className="flex items-center gap-2.5 rounded-[13px] border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] p-1.5 sm:pr-3 transition hover:border-blue-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <AccountAvatar
                user={user}
                className="h-8 w-8 rounded-[10px] text-[10px]"
              />
              <span className="hidden max-w-[145px] text-left sm:block">
                <span className="block truncate text-[10px] font-semibold text-[var(--hms-text)]">
                  {user.name || user.email}
                </span>
                <span className="mt-0.5 block text-[8px] text-[var(--hms-text-muted)]">
                  {access.label}
                </span>
              </span>
              <ChevronDown
                size={13}
                className={`hidden text-[var(--hms-text-muted)] transition-transform sm:block ${profileOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  key="account"
                  {...popupMotion}
                  id="hms-account-panel"
                  role="dialog"
                  aria-label="Account navigation"
                  className="fixed left-3 right-3 top-[78px] z-50 flex max-h-[calc(100dvh-100px)] flex-col overflow-hidden rounded-[18px] border border-[var(--hms-border)] bg-[var(--hms-surface)] text-[var(--hms-text)] shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:absolute sm:left-auto sm:right-0 sm:top-[52px] sm:w-[320px]"
                >
                  <div className="flex shrink-0 items-center gap-3 border-b border-[var(--hms-border)] px-4 py-4">
                    <AccountAvatar
                      user={user}
                      className="h-10 w-10 rounded-xl text-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {user.name || user.email}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-[var(--hms-text-muted)]">
                        {user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeProfile}
                      aria-label="Close account navigation"
                      className="rounded-lg p-2 text-[var(--hms-text-muted)] hover:bg-[var(--hms-surface-secondary)]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <label className="hms-search mx-3 my-3 flex shrink-0 items-center gap-2 rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-secondary)] px-3 py-2.5">
                    <Search
                      size={14}
                      className="text-[var(--hms-text-muted)]"
                    />
                    <input
                      value={profileQuery}
                      onChange={(event) => setProfileQuery(event.target.value)}
                      aria-label="Find a page"
                      placeholder="Find a page..."
                      className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[var(--hms-text-muted)]"
                    />
                  </label>
                  <nav
                    aria-label="All hospital pages"
                    className="min-h-0 overflow-y-auto overscroll-contain px-2 pb-3"
                  >
                    {sections.length ? (
                      sections.map((section) => (
                        <div key={section.title} className="mb-3 last:mb-0">
                          <p className="px-3 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--hms-text-muted)]">
                            {section.title}
                          </p>
                          {section.items.map(({ icon: Icon, path, label }) => (
                            <NavLink
                              key={path}
                              to={path}
                              end
                              onClick={closeProfile}
                              className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-medium transition ${isActive ? "bg-blue-500/10 text-blue-500" : "text-[var(--hms-text-secondary)] hover:bg-[var(--hms-surface-secondary)]"}`
                              }
                            >
                              <Icon size={16} strokeWidth={1.8} />
                              <span className="min-w-0 flex-1">{label}</span>
                              <ChevronRight size={12} className="opacity-40" />
                            </NavLink>
                          ))}
                        </div>
                      ))
                    ) : (
                      <p className="px-3 py-7 text-center text-[11px] text-[var(--hms-text-muted)]">
                        No matching pages
                      </p>
                    )}
                  </nav>
                  <div className="shrink-0 border-t border-[var(--hms-border)] p-2">
                    <button
                      type="button"
                      onClick={() => {
                        closeProfile();
                        onLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-medium text-red-500 transition hover:bg-red-500/10"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
