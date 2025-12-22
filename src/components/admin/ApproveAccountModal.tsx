import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import type { PendingAccount } from '../../types/approval'

interface ApproveAccountModalProps {
  account: PendingAccount | null
  isOpen: boolean
  onClose: () => void
  onConfirmApprove: (accountId: string) => void
  isApproving: boolean
}

const ApproveAccountModal: React.FC<ApproveAccountModalProps> = ({
  account,
  isOpen,
  onClose,
  onConfirmApprove,
  isApproving,
}) => {
  const handleConfirm = () => {
    if (account) {
      onConfirmApprove(account.id)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-emerald-600">Xác nhận duyệt tài khoản</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Bạn có chắc chắn muốn duyệt tài khoản này? Tài khoản sẽ được chuyển sang trạng thái "Đã duyệt" và người dùng có thể sử dụng tài khoản này.
          </p>
          {account && (
            <div className="rounded-lg bg-gray-50 p-3 space-y-1">
              <p className="text-sm font-medium text-gray-900">
                Tên: {account.fullName}
              </p>
              <p className="text-xs text-gray-600">
                Email: {account.email}
              </p>
              {account.role === 'farmer' && account.farmName && (
                <p className="text-xs text-gray-600">
                  Nông trại: {account.farmName}
                </p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isApproving}
              className="min-h-[40px] px-4"
            >
              Hủy
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isApproving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[40px] px-4"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang duyệt...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Xác nhận duyệt
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ApproveAccountModal

