import * as React from "react"
import { cn } from "../../utils/cn"

const Label = React.forwardRef<React.ElementRef<"label">, React.ComponentPropsWithoutRef<"label">>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-semibold uppercase tracking-wide text-gray-500",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }

