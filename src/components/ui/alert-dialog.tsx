import * as React from 'react'

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        open ? 'block' : 'hidden'
      }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  )
}

interface AlertDialogContentProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogContent({ children, className }: AlertDialogContentProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 z-50 relative ${className || ''}`}
    >
      {children}
    </div>
  )
}

interface AlertDialogHeaderProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogHeader({ children, className }: AlertDialogHeaderProps) {
  return <div className={`mb-4 ${className || ''}`}>{children}</div>
}

interface AlertDialogTitleProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogTitle({ children, className }: AlertDialogTitleProps) {
  return <h2 className={`text-lg font-semibold ${className || ''}`}>{children}</h2>
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogDescription({ children, className }: AlertDialogDescriptionProps) {
  return <p className={`text-sm text-gray-600 ${className || ''}`}>{children}</p>
}

interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function AlertDialogCancel({ children, ...props }: AlertDialogCancelProps) {
  return (
    <button
      {...props}
      type="button"
      className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 transition-all"
    >
      {children}
    </button>
  )
}
