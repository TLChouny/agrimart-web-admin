import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Label } from "../ui/label"
import { Award, FileText } from "lucide-react"
import type { ApiCertification } from "../../types/api"

interface CertificationDetailModalProps {
  certification: ApiCertification | null
  isOpen: boolean
  onClose: () => void
  formatDate: (dateString: string) => string
  getStatusBadge: (status: number) => React.ReactNode
}

const CertificationDetailModal: React.FC<CertificationDetailModalProps> = ({
  certification,
  isOpen,
  onClose,
  formatDate,
  getStatusBadge,
}) => {
  if (!certification) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Award className="h-6 w-6 text-emerald-600" />
            Chi tiết chứng chỉ: {certification.certificationName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-8 py-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                <FileText className="h-4 w-4 text-emerald-600" />
              </div>
              Thông tin chứng chỉ
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Tên chứng chỉ</Label>
                  <p className="text-gray-900 font-medium">{certification.certificationName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Trạng thái</Label>
                  <div className="mt-1">{getStatusBadge(certification.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Tổ chức cấp</Label>
                  <p className="text-gray-900">{certification.issuingOrganization}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Loại chứng chỉ</Label>
                  <p className="text-gray-900">Loại {certification.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Ngày cấp</Label>
                  <p className="text-gray-900">{formatDate(certification.issueDate)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Ngày hết hạn</Label>
                  <p className="text-gray-900">{formatDate(certification.expiryDate)}</p>
                </div>
                {certification.rejectionReason && (
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Lý do từ chối</Label>
                    <p className="text-red-600">{certification.rejectionReason}</p>
                  </div>
                )}
                {certification.reviewedAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Ngày xét duyệt</Label>
                    <p className="text-gray-900">{formatDate(certification.reviewedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                <Award className="h-4 w-4 text-emerald-600" />
              </div>
              Hình ảnh chứng chỉ
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex justify-center">
                <div className="max-w-2xl w-full">
                  <img
                    src={certification.certificateUrl}
                    alt={certification.certificationName}
                    className="w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder-certificate.jpg'
                      target.alt = 'Không thể tải hình ảnh'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CertificationDetailModal

