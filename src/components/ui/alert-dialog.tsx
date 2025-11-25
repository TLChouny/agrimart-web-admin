import * as React from "react"
import { cn } from "../../utils/cn"
import { Button, type ButtonProps } from "./button"

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-50 flex min-h-full items-center justify-center px-4 py-6 transition-all duration-200",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-lg">{children}</div>
    </div>
  )
}

interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AlertDialogContent = React.forwardRef<HTMLDivElement, AlertDialogContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl border border-white/30 bg-white/95 p-7 shadow-[0_30px_80px_rgba(15,118,110,0.18)] backdrop-blur-2xl",
        "animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    />
  )
)
AlertDialogContent.displayName = "AlertDialogContent"

export const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-2 text-center sm:text-left", className)} {...props} />
)

export const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-2xl font-bold tracking-tight text-slate-900", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = "AlertDialogTitle"

export const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-slate-500", className)} {...props} />
))
AlertDialogDescription.displayName = "AlertDialogDescription"

export const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)} {...props} />
)

type AlertDialogButtonProps = ButtonProps

export const AlertDialogCancel = React.forwardRef<HTMLButtonElement, AlertDialogButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="outline"
      className={cn("w-full sm:w-auto", className)}
      {...props}
    />
  )
)
AlertDialogCancel.displayName = "AlertDialogCancel"

export const AlertDialogAction = React.forwardRef<HTMLButtonElement, AlertDialogButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      className={cn("w-full sm:w-auto", className)}
      {...props}
    />
  )
)
AlertDialogAction.displayName = "AlertDialogAction"
