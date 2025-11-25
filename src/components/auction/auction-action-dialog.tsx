import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface AuctionActionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  title: string
  description: string
  actionLabel: string
  actionVariant: 'approve' | 'reject' | 'pending'
  isLoading?: boolean
}

export function AuctionActionDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  actionLabel,
  actionVariant,
  isLoading = false,
}: AuctionActionDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      onOpenChange(false)
    }
  }

  const getActionStyles = () => {
    switch (actionVariant) {
      case 'approve':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-emerald-600 hover:bg-emerald-700',
          borderColor: 'border-emerald-200',
          textColor: 'text-emerald-900',
          lightBg: 'bg-emerald-50',
        }
      case 'reject':
        return {
          icon: XCircle,
          bgColor: 'bg-red-600 hover:bg-red-700',
          borderColor: 'border-red-200',
          textColor: 'text-red-900',
          lightBg: 'bg-red-50',
        }
      case 'pending':
        return {
          icon: Clock,
          bgColor: 'bg-amber-600 hover:bg-amber-700',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-900',
          lightBg: 'bg-amber-50',
        }
      default:
        return {
          icon: AlertCircle,
          bgColor: 'bg-gray-600 hover:bg-gray-700',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-900',
          lightBg: 'bg-gray-50',
        }
    }
  }

  const styles = getActionStyles()
  const IconComponent = styles.icon

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <div className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full ${styles.lightBg}`}>
          <IconComponent className={`w-6 h-6 ${styles.textColor}`} />
        </div>

        <AlertDialogHeader className="text-center">
          <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex gap-3 justify-end mt-6">
          <AlertDialogCancel
            disabled={loading || isLoading}
            className="px-4 py-2 font-medium"
            onClick={() => {
              if (!loading && !isLoading) {
                onOpenChange(false)
              }
            }}
          >
            Hủy
          </AlertDialogCancel>
          <button
            onClick={handleConfirm}
            disabled={loading || isLoading}
            className={`${styles.bgColor} text-white px-4 py-2 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {loading || isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Đang xử lý...
              </>
            ) : (
              <>
                <IconComponent className="w-4 h-4" />
                {actionLabel}
              </>
            )}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
