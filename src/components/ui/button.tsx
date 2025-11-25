import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../utils/cn"

const buttonVariants = cva(
  "group relative inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold tracking-tight ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-safe:active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)] hover:shadow-[0_16px_32px_rgba(15,23,42,0.22)] hover:-translate-y-0.5",
        destructive:
          "border border-transparent bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)] hover:shadow-[0_16px_32px_rgba(15,23,42,0.22)] hover:-translate-y-0.5",
        outline:
          "border border-emerald-100 bg-white text-emerald-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:bg-emerald-50/60 hover:text-emerald-800",
        secondary:
          "border border-transparent bg-emerald-50/80 text-emerald-700 shadow-inner shadow-white/60 hover:bg-emerald-100/90",
        ghost:
          "text-emerald-700 hover:bg-emerald-50/70 hover:text-emerald-800",
        link:
          "text-emerald-600 underline-offset-4 hover:text-emerald-700 hover:underline",
        soft:
          "border border-emerald-100/60 bg-white/70 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md hover:border-emerald-200 hover:bg-white",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-11 w-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        <span className={cn("flex items-center gap-2 transition-opacity", isLoading && "opacity-0")}>
          {leftIcon && <span className="text-base">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="text-base">{rightIcon}</span>}
        </span>

        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent" />
          </span>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }

