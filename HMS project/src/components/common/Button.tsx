import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { LoaderCircle } from "lucide-react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;

  variant?: ButtonVariant;
  size?: ButtonSize;

  loading?: boolean;

  leftIcon?: ReactNode;
  rightIcon?: ReactNode;

  fullWidth?: boolean;
}

const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    const variants: Record<
      ButtonVariant,
      string
    > = {
      primary:
        "border-blue-500 bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.18)] hover:bg-blue-500",

      secondary:
        "border-white/[0.07] bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]",

      outline:
        "border-white/[0.08] bg-transparent text-slate-300 hover:border-blue-500/30 hover:bg-blue-500/[0.06] hover:text-blue-400",

      ghost:
        "border-transparent bg-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white",

      danger:
        "border-red-500/20 bg-red-500/[0.1] text-red-400 hover:bg-red-500/[0.16]",
    };

    const sizes: Record<ButtonSize, string> = {
      sm: "h-9 rounded-[11px] px-3 text-[10px]",
      md: "h-11 rounded-[13px] px-4 text-[11px]",
      lg: "h-12 rounded-[14px] px-5 text-xs",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center
          gap-2
          border
          font-semibold
          outline-none
          transition-all duration-200

          focus-visible:ring-2
          focus-visible:ring-blue-500/40
          focus-visible:ring-offset-2
          focus-visible:ring-offset-[#071321]

          disabled:cursor-not-allowed
          disabled:opacity-50

          active:scale-[0.98]

          ${variants[variant]}
          ${sizes[size]}

          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <LoaderCircle
            size={16}
            className="animate-spin"
          />
        ) : (
          leftIcon
        )}

        <span>{children}</span>

        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;