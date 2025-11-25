import * as React from "react"
import { cn } from "../../utils/cn"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "soft" | "success" | "warning" | "danger"
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
      default: "bg-emerald-600/90 text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)]",
      outline: "border border-emerald-200 bg-white text-emerald-700",
      soft: "bg-emerald-50/90 text-emerald-700 backdrop-blur-sm",
      success: "bg-green-100 text-green-700",
      warning: "bg-amber-100 text-amber-700",
      danger: "bg-rose-100 text-rose-700",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-sm transition-all duration-200",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = "Badge"

export default Badge
