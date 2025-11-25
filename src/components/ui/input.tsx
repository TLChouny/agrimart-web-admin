import * as React from "react"
import { cn } from "../../utils/cn"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "error"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "peer flex h-11 w-full rounded-2xl border border-transparent bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-[0_10px_25px_rgba(15,118,110,0.08)] transition-all duration-300 placeholder:text-gray-400",
          "ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "focus-visible:ring-emerald-400/40 focus-visible:border-emerald-500/60",
          "hover:border-emerald-200 hover:shadow-[0_14px_32px_rgba(15,118,110,0.12)]",
          variant === "error" &&
            "border-rose-200 bg-rose-50/60 text-rose-700 placeholder:text-rose-400 focus-visible:ring-rose-400 focus-visible:border-rose-500",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:opacity-70",
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }
