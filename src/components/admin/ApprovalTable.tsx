"use client"

import type React from "react"
import { Button } from "../../components/ui/button"
import { Eye, Check, X, User, Mail, MapPin, Calendar } from "lucide-react"
import type { PendingAccount } from "../../types/approval"

interface ApprovalTableProps {
  accounts: PendingAccount[]
  onViewAccount: (account: PendingAccount) => void
  onApproveAccount: (account: PendingAccount) => void
  onRejectAccount: (account: PendingAccount) => void
  isApproving: boolean
  isRejecting: boolean
  formatDate: (dateString: string) => string
  getStatusBadge: (status: string) => React.ReactNode
}

const ApprovalTable: React.FC<ApprovalTableProps> = ({ accounts, onViewAccount, onApproveAccount, onRejectAccount, isApproving, isRejecting, formatDate, getStatusBadge, }) => {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có tài khoản nào</h3>
        <p className="text-gray-600">Hiện tại không có tài khoản nào cần xét duyệt</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {accounts.map((account) => (
        <div key={account.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">{account.fullName}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1 min-w-0">
                      <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{account.email}</span>
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{account.farmName}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-gray-700">Số điện thoại:</span>
                  <p className="text-gray-600 truncate">{account.phone}</p>
                </div>
                <div className="min-w-0">
                  <span className="font-medium text-gray-700">Diện tích:</span>
                  <p className="text-gray-600 truncate">{account.farmSize}</p>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-600 truncate">{formatDate(account.submittedAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
              {getStatusBadge(account.status)}
              <Button 
                size="sm"
                variant="outline" 
                onClick={() => onViewAccount(account)} 
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                Chi tiết
              </Button>
              {account.status === "pending" && (
                <>
                  <Button 
                    size="sm"
                    onClick={() => onApproveAccount(account)} 
                    disabled={isApproving || isRejecting} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {isApproving ? "Đang duyệt..." : "Duyệt"}
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => onRejectAccount(account)} 
                    disabled={isApproving || isRejecting} 
                    className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-600 text-xs h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Từ chối
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

export default ApprovalTable

