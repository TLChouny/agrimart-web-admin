import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { XCircle, Loader2 } from 'lucide-react'
import type { ApiCertification } from '../../types/api'

interface RejectCertificationModalProps {
  certification: ApiCertification | null
  isOpen: boolean
  onClose: () => void
  rejectReason: string
  setRejectReason: (reason: string) => void
  onConfirmReject: (certificationId: string, reason: string) => void
  isRejecting: boolean
}

const RejectCertificationModal: React.FC<RejectCertificationModalProps> = ({
  certification,
  isOpen,
  onClose,
  rejectReason,
  setRejectReason,
  onConfirmReject,
  isRejecting,
}) => {
  const handleSubmit = () => {
    if (certification && rejectReason.trim()) {
      onConfirmReject(certification.id, rejectReason.trim())
    }
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-red-600">Xác nhận từ chối chứng chỉ</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Bạn có chắc chắn muốn từ chối chứng chỉ này? Hành động này không thể hoàn tác.
          </p>
          {certification && (
            <div className="rounded-lg bg-gray-50 p-3 space-y-1">
              <p className="text-sm font-medium text-gray-900">
                Chứng chỉ: {certification.certificationName}
              </p>
              <p className="text-xs text-gray-600">
                Tổ chức cấp: {certification.issuingOrganization}
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="rejectReason" className="text-sm font-medium text-gray-700">
              Lý do từ chối *
            </Label>
            <Textarea
              id="rejectReason"
              placeholder="Nhập lý do từ chối chứng chỉ này..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-1"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isRejecting}
              className="min-h-[40px] px-4"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!rejectReason.trim() || isRejecting}
              className="bg-red-600 hover:bg-red-700 text-white min-h-[40px] px-4"
            >
              {isRejecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang từ chối...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Xác nhận từ chối
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RejectCertificationModal

