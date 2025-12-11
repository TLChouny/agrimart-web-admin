"use client"

import type React from "react"
import { Button } from "../ui/button"
import { Eye, Check, X, Award, Calendar, Building2 } from "lucide-react"
import type { ApiCertification } from "../../types/api"

interface CertificationTableProps {
  certifications: ApiCertification[]
  onViewCertification: (certification: ApiCertification) => void
  onApproveCertification: (certificationId: string) => void
  onRejectCertification: (certification: ApiCertification) => void
  isApproving: boolean
  isRejecting: boolean
  formatDate: (dateString: string) => string
  getStatusBadge: (status: number) => React.ReactNode
}

const CertificationTable: React.FC<CertificationTableProps> = ({
  certifications,
  onViewCertification,
  onApproveCertification,
  onRejectCertification,
  isApproving,
  isRejecting,
  formatDate,
  getStatusBadge,
}) => {
  if (certifications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có chứng chỉ nào</h3>
        <p className="text-gray-600">Hiện tại không có chứng chỉ nào cần xét duyệt</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {certifications.map((certification) => (
        <div key={certification.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{certification.certificationName}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span>{certification.issuingOrganization}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Cấp ngày: {formatDate(certification.issueDate)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Hết hạn:</span>
                  <p className="text-gray-600">{formatDate(certification.expiryDate)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Ngày nộp:</span>
                  <p className="text-gray-600">{formatDate(certification.createdAt)}</p>
                </div>
                {certification.rejectionReason && (
                  <div>
                    <span className="font-medium text-gray-700">Lý do từ chối:</span>
                    <p className="text-red-600">{certification.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {getStatusBadge(certification.status)}
              <Button variant="outline" size="sm" onClick={() => onViewCertification(certification)} className="flex items-center gap-2">
                <Eye className="w-4 h-4" />Chi tiết
              </Button>
              {certification.status === 0 && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onApproveCertification(certification.id)}
                    disabled={isApproving || isRejecting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />{isApproving ? "Đang duyệt..." : "Duyệt"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRejectCertification(certification)}
                    disabled={isApproving || isRejecting}
                    className="text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />Từ chối
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CertificationTable

