import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Label } from "../ui/label"
import { User, Calendar, MapPin, Award, Eye } from "lucide-react"
import type { PendingAccount } from "../../types/approval"
import { certificationApi } from "../../services/api/certificationApi"
import type { ApiCertification } from "../../types/api"
import { Badge } from "../ui/badge"

interface AccountDetailModalProps {
  account: PendingAccount | null
  isOpen: boolean
  onClose: () => void
  formatDate: (dateString: string) => string
}

const AccountDetailModal: React.FC<AccountDetailModalProps> = ({ account, isOpen, onClose, formatDate }) => {
  const [certifications, setCertifications] = useState<ApiCertification[]>([])
  const [isLoadingCertifications, setIsLoadingCertifications] = useState(false)

  useEffect(() => {
    if (account && isOpen) {
      setIsLoadingCertifications(true)
      certificationApi.getByUserId(account.id)
        .then(res => {
          if (res.isSuccess && res.data) {
            setCertifications(Array.isArray(res.data) ? res.data : [])
          }
        })
        .catch(() => setCertifications([]))
        .finally(() => setIsLoadingCertifications(false))
    } else {
      setCertifications([])
    }
  }, [account, isOpen])

  const getCertificationStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Chờ duyệt</Badge>
      case 1:
        return <Badge variant="outline" className="text-green-600 border-green-600">Đã duyệt</Badge>
      case 2:
        return <Badge variant="outline" className="text-red-600 border-red-600">Đã từ chối</Badge>
      case 3:
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Hết hạn</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (!account) return null
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="text-2xl font-semibold text-gray-900">Chi tiết tài khoản: {account.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-8 py-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3"><User className="h-4 w-4 text-emerald-600" /></div>
              Thông tin cá nhân
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Họ và tên</Label><p className="text-gray-900 font-medium">{account.fullName}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Email</Label><p className="text-gray-900 break-all">{account.email}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Số điện thoại</Label><p className="text-gray-900">{account.phone}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Địa chỉ</Label><p className="text-gray-900 break-words">{account.address}</p></div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3"><MapPin className="h-4 w-4 text-emerald-600" /></div>
              Thông tin nông trại
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Tên nông trại</Label><p className="text-gray-900 font-medium">{account.farmName}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Địa chỉ nông trại</Label><p className="text-gray-900 break-words">{account.farmAddress}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Diện tích</Label><p className="text-gray-900">{account.farmSize}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Loại hình</Label><p className="text-gray-900">{account.farmType}</p></div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3"><Eye className="h-4 w-4 text-emerald-600" /></div>
              Tài liệu xác minh
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              {account.verifications && account.verifications.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {account.verifications.map((verification) => (
                    <div key={verification.id} className="space-y-3">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {verification.documentType === 0 
                          ? 'CCCD mặt trước' 
                          : verification.documentType === 1 
                          ? 'CCCD mặt sau' 
                          : 'Giấy phép lái xe'}
                      </h4>
                      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-emerald-400 transition-colors">
                        <div className="aspect-[16/10] bg-gray-100 rounded-lg overflow-hidden mb-3">
                          <img
                            src={verification.url}
                            alt={verification.documentType === 0 ? 'CCCD mặt trước' : 'CCCD mặt sau'}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs text-gray-400">Không thể tải hình ảnh</div>'
                              }
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 text-center">
                          {verification.documentType === 0 
                            ? 'Căn cước công dân - Mặt trước' 
                            : 'Căn cước công dân - Mặt sau'}
                        </p>
                        <p className="text-xs text-gray-500 text-center mt-1">
                          Tải lên: {formatDate(verification.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Chưa có tài liệu xác minh nào</p>
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3"><Calendar className="h-4 w-4 text-emerald-600" /></div>
              Thông tin nộp đơn
            </h3>
            <div className="bg-gray-50 rounded-lg p-6"><p className="text-gray-900"><span className="font-medium">Ngày nộp:</span> {formatDate(account.submittedAt)}</p></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3"><Award className="h-4 w-4 text-emerald-600" /></div>
              Chứng chỉ đã duyệt
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              {isLoadingCertifications ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Đang tải chứng chỉ...</p>
                </div>
              ) : certifications.length > 0 ? (
                <div className="space-y-4">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{cert.certificationName}</h4>
                          <p className="text-sm text-gray-600">{cert.issuingOrganization}</p>
                        </div>
                        {getCertificationStatusBadge(cert.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Ngày cấp:</span>
                          <p className="text-gray-900 font-medium">{formatDate(cert.issueDate)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Ngày hết hạn:</span>
                          <p className="text-gray-900 font-medium">{formatDate(cert.expiryDate)}</p>
                        </div>
                      </div>
                      {cert.certificateUrl && (
                        <div className="mt-3">
                          <img
                            src={cert.certificateUrl}
                            alt={cert.certificationName}
                            className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Chưa có chứng chỉ nào được duyệt</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AccountDetailModal

