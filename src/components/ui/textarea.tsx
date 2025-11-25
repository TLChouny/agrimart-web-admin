import * as React from "react"
import { cn } from "../../utils/cn"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[110px] w-full rounded-2xl border border-transparent bg-white/80 px-4 py-3 text-sm text-gray-900 shadow-[0_12px_28px_rgba(15,118,110,0.08)] transition-all duration-300 placeholder:text-gray-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:border-emerald-500/60 focus-visible:ring-offset-2",
          "hover:border-emerald-200 hover:shadow-[0_16px_38px_rgba(15,118,110,0.12)]",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70",
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
