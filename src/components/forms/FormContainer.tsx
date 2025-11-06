import React from 'react'
import { Button } from '../ui/button'
import { Loader2 } from 'lucide-react'

interface FormContainerProps {
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  title?: string
  submitText?: string
  isLoading?: boolean
  disabled?: boolean
  className?: string
  submitButtonClassName?: string
}

export function FormContainer({ children, onSubmit, title, submitText = 'Gửi', isLoading = false, disabled = false, className = '', submitButtonClassName = 'w-full bg-green-600 hover:bg-green-700' }: FormContainerProps) {
  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {title && (
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
      )}
      <form onSubmit={onSubmit} className="space-y-6">
        {children}
        <Button type="submit" className={`text-sm sm:text-base ${submitButtonClassName}`} disabled={disabled || isLoading}>
          {isLoading && <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
          {isLoading ? 'Đang xử lý...' : submitText}
        </Button>
      </form>
    </div>
  )
}

