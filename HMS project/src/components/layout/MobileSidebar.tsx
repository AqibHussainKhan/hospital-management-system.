import { useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
interface MobileSidebarProps { open: boolean; onClose: () => void; onLogout: () => void }
export default function MobileSidebar({ open, onClose, onLogout }: MobileSidebarProps) {
  const root = useRef<HTMLDivElement>(null); const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const drawer = root.current; const content = document.getElementById("hms-workspace-content");
    const priorInert = content?.inert; if(content) content.inert = true;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const elements = () => [...(drawer?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]') || [])].filter(el => el.getClientRects().length);
    elements().find(el => el.closest("aside"))?.focus();
    function key(event: KeyboardEvent) {
      if(event.key === "Escape") { event.preventDefault(); close.current(); }
      if(event.key !== "Tab") return;
      const focusable = elements(); const first = focusable[0], last = focusable[focusable.length-1];
      if(event.shiftKey && (document.activeElement===first || !drawer?.contains(document.activeElement))) {event.preventDefault();last?.focus();}
      else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();}
    }
    const media = window.matchMedia("(min-width: 1024px)"); const resize = () => { if(media.matches) close.current(); };
    document.addEventListener("keydown",key); media.addEventListener("change",resize); resize();
    return () => {document.removeEventListener("keydown",key);media.removeEventListener("change",resize);document.body.style.overflow=overflow;if(content)content.inert=priorInert || false;previous?.focus();};
  },[open]);
  return open ? <div ref={root} role="dialog" aria-modal="true" aria-label="Hospital navigation" className="fixed inset-0 z-50 lg:hidden"><Sidebar scrollStorageKey="medicore.sidebar.scroll.mobile" collapsed={false} setCollapsed={()=>{}} mobileOpen setMobileOpen={value=>{if(!value)onClose();}} onLogout={onLogout}/></div> : null;
}
