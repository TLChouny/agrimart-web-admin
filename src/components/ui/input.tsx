import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { variant?: "default" | "error" }

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, variant = "default", ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "default" && "border-gray-300 focus-visible:ring-green-400 focus-visible:border-green-400 hover:border-green-300",
        variant === "error" && "border-red-300 focus-visible:ring-red-400 focus-visible:border-red-400 hover:border-red-300",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }

