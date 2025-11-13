import React, { useState, useEffect } from 'react'
import type { PendingAccount } from '../../types/approval'
import ApprovalTabs from '../../components/admin/ApprovalTabs'
import AccountDetailModal from '../../components/admin/AccountDetailModal'
import RejectModal from '../../components/admin/RejectModal'
import { formatApprovalDate, getApprovalStatusConfig, mockPendingAccounts } from '../../utils/approvalUtils'
import { Badge } from '../../components/ui/badge'

const ApprovalPage: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState<PendingAccount | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([])
  const [approvedAccounts, setApprovedAccounts] = useState<PendingAccount[]>([])
  const [rejectedAccounts, setRejectedAccounts] = useState<PendingAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // API functions
  const loadAccounts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setPendingAccounts(mockPendingAccounts)
      setApprovedAccounts([])
      setRejectedAccounts([])
    } catch (err) {
      setError('Không thể tải danh sách tài khoản')
      console.error('Lỗi khi tải danh sách tài khoản:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  // Event handlers
  const handleApprove = async (_accountId: string) => {
    setIsApproving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await loadAccounts()
    } catch (error) {
      console.error('Error approving account:', error)
      setError('Không thể duyệt tài khoản')
    } finally { setIsApproving(false) }
  }

  const handleReject = async (_accountId: string, _reason: string) => {
    setIsRejecting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await loadAccounts(); setIsRejectModalOpen(false); setRejectReason('')
    } catch (error) {
      console.error('Error rejecting account:', error)
      setError('Không thể từ chối tài khoản')
    } finally { setIsRejecting(false) }
  }

  const handleViewAccount = (account: PendingAccount) => setSelectedAccount(account)
  const handleRejectAccount = (account: PendingAccount) => { setSelectedAccount(account); setIsRejectModalOpen(true) }
  const handleCloseDetailModal = () => setSelectedAccount(null)
  const handleCloseRejectModal = () => {
    setIsRejectModalOpen(false)
    setRejectReason('')
  }

  // Helper functions
  const getStatusBadge = (status: string) => {
    const config = getApprovalStatusConfig(status)
    return (<Badge variant="outline" className={config.className}>{config.text}</Badge>)
  }

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Quản lý xét duyệt tài khoản</h1>
        <p className="text-responsive-base text-gray-600">Duyệt và quản lý các tài khoản nông dân đang chờ xét duyệt</p>
      </div>

      <ApprovalTabs
        pendingAccounts={pendingAccounts}
        approvedAccounts={approvedAccounts}
        rejectedAccounts={rejectedAccounts}
        isLoading={isLoading}
        error={error}
        onViewAccount={handleViewAccount}
        onApproveAccount={handleApprove}
        onRejectAccount={handleRejectAccount}
        isApproving={isApproving}
        isRejecting={isRejecting}
        formatDate={formatApprovalDate}
        getStatusBadge={getStatusBadge}
      />

      <AccountDetailModal account={selectedAccount} isOpen={!!selectedAccount} onClose={handleCloseDetailModal} formatDate={formatApprovalDate} />

      <RejectModal account={selectedAccount} isOpen={isRejectModalOpen} onClose={handleCloseRejectModal} rejectReason={rejectReason} setRejectReason={setRejectReason} onConfirmReject={handleReject} isRejecting={isRejecting} />
    </div>
  )
}

export default ApprovalPage

