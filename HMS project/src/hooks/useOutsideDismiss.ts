import { useEffect } from "react";
import type { RefObject } from "react";

export function eventIsInside(event: Event, element: HTMLElement | null) {
  if (!element) return false;
  if (event.composedPath().includes(element)) return true;
  return event.target instanceof Node && element.contains(event.target);
}

export default function useOutsideDismiss(
  open: boolean,
  container: RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    function onOutside(event: Event) {
      if (!eventIsInside(event, container.current)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      container.current?.querySelector<HTMLButtonElement>("[data-dropdown-trigger]")?.focus({ preventScroll: true });
    }
    // Capture handles outside clicks even when another component stops bubbling.
    // No overlay: the original outside control still receives its own click.
    document.addEventListener("pointerdown", onOutside, { capture: true });
    document.addEventListener("focusin", onOutside, { capture: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onOutside, { capture: true });
      document.removeEventListener("focusin", onOutside, { capture: true });
      document.removeEventListener("keydown", onKey);
    };
  }, [open, container, onClose]);
}
