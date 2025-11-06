import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import type { PendingAccount } from '../../types/approval'

interface RejectModalProps {
  account: PendingAccount | null
  isOpen: boolean
  onClose: () => void
  rejectReason: string
  setRejectReason: (reason: string) => void
  onConfirmReject: (accountId: string, reason: string) => void
  isRejecting: boolean
}

const RejectModal: React.FC<RejectModalProps> = ({ account, isOpen, onClose, rejectReason, setRejectReason, onConfirmReject, isRejecting }) => {
  const handleSubmit = () => {
    if (account && rejectReason.trim()) {
      onConfirmReject(account.id, rejectReason.trim())
    }
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-red-600">Từ chối tài khoản</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label className="text-sm font-medium text-gray-700">Tài khoản: {account?.fullName}</Label></div>
          <div>
            <Label htmlFor="rejectReason" className="text-sm font-medium text-gray-700">Lý do từ chối *</Label>
            <Textarea id="rejectReason" placeholder="Nhập lý do từ chối tài khoản này..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="mt-1" rows={4} />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isRejecting}>Hủy</Button>
            <Button variant="outline" onClick={handleSubmit} disabled={!rejectReason.trim() || isRejecting} className="text-red-600 border-red-600 hover:bg-red-50">{isRejecting ? 'Đang từ chối...' : 'Từ chối'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RejectModal

