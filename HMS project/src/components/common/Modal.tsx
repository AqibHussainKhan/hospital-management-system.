import {
  useEffect,
  type ReactNode,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import { X } from "lucide-react";

interface ModalProps {
  open: boolean;

  title: string;
  description?: string;

  children: ReactNode;

  onClose: () => void;

  footer?: ReactNode;

  size?: "sm" | "md" | "lg" | "xl";

  closeOnOverlay?: boolean;
}

function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  size = "md",
  closeOnOverlay = true,
}: ModalProps) {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

          {/* Background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (closeOnOverlay) {
                onClose();
              }
            }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 18,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.97,
              y: 12,
            }}
            transition={{
              duration: 0.25,
            }}
            className={`
              relative z-10
              flex max-h-[90vh]
              w-full flex-col
              overflow-hidden
              rounded-[24px]
              border border-white/[0.08]
              bg-[#0a1624]
              shadow-[0_30px_100px_rgba(0,0,0,0.55)]

              ${sizes[size]}
            `}
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-5 border-b border-white/[0.06] px-6 py-5">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-white">
                  {title}
                </h2>

                {description && (
                  <p className="mt-1.5 text-[10px] leading-5 text-slate-600">
                    {description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            {/* Content */}
            <div
              className="
                min-h-0 flex-1 overflow-y-auto
                px-6 py-6
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="shrink-0 border-t border-white/[0.06] bg-white/[0.015] px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Modal;