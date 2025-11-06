import type React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Card } from "../ui/card"
import { CheckCircle, XCircle } from "lucide-react"
import type { PendingAccount } from "../../types/approval"
import ApprovalTable from "./ApprovalTable"

interface ApprovalTabsProps {
  pendingAccounts: PendingAccount[]
  approvedAccounts: PendingAccount[]
  rejectedAccounts: PendingAccount[]
  isLoading: boolean
  error: string | null
  onViewAccount: (account: PendingAccount) => void
  onApproveAccount: (accountId: string) => void
  onRejectAccount: (account: PendingAccount) => void
  isApproving: boolean
  isRejecting: boolean
  formatDate: (dateString: string) => string
  getStatusBadge: (status: string) => React.ReactNode
}

const ApprovalTabs: React.FC<ApprovalTabsProps> = ({ pendingAccounts, approvedAccounts, rejectedAccounts, isLoading, error, onViewAccount, onApproveAccount, onRejectAccount, isApproving, isRejecting, formatDate, getStatusBadge, }) => {
  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="pending" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Chờ duyệt ({pendingAccounts.length})</TabsTrigger>
        <TabsTrigger value="approved" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Đã duyệt ({approvedAccounts.length})</TabsTrigger>
        <TabsTrigger value="rejected" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Đã từ chối ({rejectedAccounts.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-4">
        <Card className="p-6 border-0 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Danh sách tài khoản chờ duyệt</h2>
            <p className="text-gray-600">Có {pendingAccounts.length} tài khoản đang chờ xét duyệt</p>
          </div>
          {error && (<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>)}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <ApprovalTable accounts={pendingAccounts} onViewAccount={onViewAccount} onApproveAccount={onApproveAccount} onRejectAccount={onRejectAccount} isApproving={isApproving} isRejecting={isRejecting} formatDate={formatDate} getStatusBadge={getStatusBadge} />
          )}
        </Card>
      </TabsContent>

      <TabsContent value="approved" className="space-y-4">
        <Card className="p-6 border-0 shadow-sm">
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có tài khoản nào được duyệt</h3>
            <p className="text-gray-600">Các tài khoản được duyệt sẽ hiển thị ở đây</p>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="rejected" className="space-y-4">
        <Card className="p-6 border-0 shadow-sm">
          <div className="text-center py-12">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có tài khoản nào bị từ chối</h3>
            <p className="text-gray-600">Các tài khoản bị từ chối sẽ hiển thị ở đây</p>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default ApprovalTabs

