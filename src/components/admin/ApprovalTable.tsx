"use client"

import type React from "react"
import { Button } from "../../components/ui/button"
import { Eye, Check, X, User, Mail, MapPin, Calendar } from "lucide-react"
import type { PendingAccount } from "../../types/approval"

interface ApprovalTableProps {
  accounts: PendingAccount[]
  onViewAccount: (account: PendingAccount) => void
  onApproveAccount: (accountId: string) => void
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
    <div className="space-y-4">
      {accounts.map((account) => (
        <div key={account.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{account.fullName}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1"><Mail className="w-4 h-4" /><span>{account.email}</span></div>
                    <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /><span>{account.farmName}</span></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div><span className="font-medium text-gray-700">Số điện thoại:</span><p className="text-gray-600">{account.phone}</p></div>
                <div><span className="font-medium text-gray-700">Diện tích:</span><p className="text-gray-600">{account.farmSize}</p></div>
                <div className="flex items-center gap-1"><Calendar className="w-4 h-4 text-gray-500" /><span className="text-gray-600">{formatDate(account.submittedAt)}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {getStatusBadge(account.status)}
              <Button variant="outline" size="sm" onClick={() => onViewAccount(account)} className="flex items-center gap-2">
                <Eye className="w-4 h-4" />Chi tiết
              </Button>
              {account.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => onApproveAccount(account.id)} disabled={isApproving || isRejecting} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                    <Check className="w-4 h-4" />{isApproving ? "Đang duyệt..." : "Duyệt"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onRejectAccount(account)} disabled={isApproving || isRejecting} className="text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-2">
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

export default ApprovalTable

