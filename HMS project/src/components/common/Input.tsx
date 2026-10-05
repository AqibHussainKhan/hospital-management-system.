import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;

  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<
  HTMLInputElement,
  InputProps
>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId =
      id || props.name || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-[10px] font-semibold text-slate-400"
          >
            {label}
          </label>
        )}

        <div className="group relative">
          {leftIcon && (
            <div
              className={`
                pointer-events-none
                absolute left-3.5 top-1/2
                -translate-y-1/2
                transition-colors

                ${
                  error
                    ? "text-red-400"
                    : "text-slate-600 group-focus-within:text-blue-400"
                }
              `}
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`
              h-11 w-full
              rounded-[13px]
              border
              bg-white/[0.025]
              text-[11px]
              text-slate-200
              outline-none

              transition-all duration-200

              placeholder:text-slate-700

              focus:bg-white/[0.035]
              focus:ring-4

              ${
                leftIcon
                  ? "pl-11"
                  : "pl-4"
              }

              ${
                rightIcon
                  ? "pr-11"
                  : "pr-4"
              }

              ${
                error
                  ? "border-red-500/40 focus:border-red-500/50 focus:ring-red-500/[0.08]"
                  : "border-white/[0.07] focus:border-blue-500/40 focus:ring-blue-500/[0.08]"
              }

              ${className}
            `}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-1.5 text-[9px] font-medium text-red-400">
            {error}
          </p>
        ) : (
          helperText && (
            <p className="mt-1.5 text-[9px] text-slate-600">
              {helperText}
            </p>
          )
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;