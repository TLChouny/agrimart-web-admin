import React, { useState, useEffect, useCallback } from 'react'
import type { PendingAccount } from '../../types/approval'
import ApprovalTabs from '../../components/admin/ApprovalTabs'
import AccountDetailModal from '../../components/admin/AccountDetailModal'
import RejectModal from '../../components/admin/RejectModal'
import ApproveAccountModal from '../../components/admin/ApproveAccountModal'
import CertificationDetailModal from '../../components/admin/CertificationDetailModal'
import RejectCertificationModal from '../../components/admin/RejectCertificationModal'
import ApproveCertificationModal from '../../components/admin/ApproveCertificationModal'
import { formatApprovalDate, getApprovalStatusConfig } from '../../utils/approvalUtils'
import { Badge } from '../../components/ui/badge'
import { userApi } from '../../services/api/userApi'
import { farmApi } from '../../services/api/farmApi'
import { certificationApi } from '../../services/api/certificationApi'
import type { User as ApiUser, ApiCertification } from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES, APPROVAL_MESSAGES, CERTIFICATION_MESSAGES } from '../../services/constants/messages'

const ApprovalPage: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState<PendingAccount | null>(null)
  const [selectedAccountForAction, setSelectedAccountForAction] = useState<PendingAccount | null>(null)
  const [isAccountDetailModalOpen, setIsAccountDetailModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isApproveAccountModalOpen, setIsApproveAccountModalOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([])
  const [approvedAccounts, setApprovedAccounts] = useState<PendingAccount[]>([])
  const [rejectedAccounts, setRejectedAccounts] = useState<PendingAccount[]>([])
  const [pendingCertifications, setPendingCertifications] = useState<ApiCertification[]>([])
  const [selectedCertification, setSelectedCertification] = useState<ApiCertification | null>(null)
  const [isCertificationDetailModalOpen, setIsCertificationDetailModalOpen] = useState(false)
  const [isCertificationRejectModalOpen, setIsCertificationRejectModalOpen] = useState(false)
  const [isCertificationApproveModalOpen, setIsCertificationApproveModalOpen] = useState(false)
  const [certificationRejectReason, setCertificationRejectReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usersMap, setUsersMap] = useState<Record<string, ApiUser>>({})
  const { toast } = useToastContext()

  // Helper function to map User to PendingAccount
  const mapUserToPendingAccount = useCallback((user: ApiUser, farmsMap: Record<string, { name: string }>): PendingAccount => {
    let farmName = 'Chưa có thông tin'
    let farmAddress = 'Chưa có thông tin'
    let farmSize = 'Chưa có thông tin'
    let farmType = 'Chưa có thông tin'

    // Get farm info if user is a farmer
    if (user.role === 'farmer' && farmsMap[user.id]) {
      const farm = farmsMap[user.id]
      farmName = farm.name || 'Chưa có thông tin'
      farmAddress = `${user.address}, ${user.communes}, ${user.province}`
      farmSize = 'Chưa có thông tin' // Farm API doesn't have size
      farmType = 'Chưa có thông tin' // Farm API doesn't have type
    }

    // Map status: 0 = pending, 1 = approved, 2 = rejected
    const statusMap: Record<number, 'pending' | 'approved' | 'rejected'> = {
      0: 'pending',
      1: 'approved',
      2: 'rejected',
    }

    return {
      id: user.id,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phoneNumber || 'Chưa có',
      address: `${user.address}, ${user.communes}, ${user.province}`,
      farmName,
      farmAddress,
      farmSize,
      farmType,
      submittedAt: user.createdAt,
      status: statusMap[user.status ?? 0] || 'pending',
      documents: [], // API doesn't provide documents yet
      verifications: user.verifications || [],
    }
  }, [])

  // API functions
  const loadAccounts = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch users and farms in parallel
      const [usersRes, farmsRes] = await Promise.all([
        userApi.list(),
        farmApi.getFarms().catch(() => ({ isSuccess: false, data: [] })) // Don't fail if farms API fails
      ])

      if (usersRes.isSuccess) {
        const payload = usersRes.data as ApiUser[] | { items: ApiUser[] }
        const apiUsers: ApiUser[] = Array.isArray(payload) ? payload : (payload?.items ?? [])
        
        // Build farms map for quick lookup
        const farmsMap: Record<string, { name: string }> = {}
        if (farmsRes.isSuccess && farmsRes.data && Array.isArray(farmsRes.data)) {
          farmsRes.data.forEach(farm => {
            if (farm.userId && !farmsMap[farm.userId]) {
              farmsMap[farm.userId] = { name: farm.name }
            }
          })
        }
        
        // Map all users to PendingAccount format
        const mappedAccounts = apiUsers.map(user => mapUserToPendingAccount(user, farmsMap))

        // Filter by status: 0 = Pending, 1 = Active (Approved), 2 = Banned (Rejected)
        const pending = mappedAccounts.filter(acc => acc.status === 'pending')
        const approved = mappedAccounts.filter(acc => acc.status === 'approved')
        const rejected = mappedAccounts.filter(acc => acc.status === 'rejected')

        setPendingAccounts(pending)
        setApprovedAccounts(approved)
        setRejectedAccounts(rejected)

        if (!silent) {
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: APPROVAL_MESSAGES.FETCH_SUCCESS,
          })
        }
      } else {
        const message = usersRes.message || APPROVAL_MESSAGES.FETCH_ERROR
        setError(message)
        if (!silent) {
          toast({
            title: TOAST_TITLES.ERROR,
            description: message,
            variant: 'destructive',
          })
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : APPROVAL_MESSAGES.FETCH_ERROR
      setError(message)
      console.error('Lỗi khi tải danh sách tài khoản:', err)
      if (!silent) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [mapUserToPendingAccount, toast])

  // Load certifications
  const loadCertifications = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await certificationApi.getPending()
      if (res.isSuccess) {
        const certifications = Array.isArray(res.data) ? res.data : []
        setPendingCertifications(certifications)
        
        // Fetch users for certifications to get user names
        if (certifications.length > 0) {
          try {
            const userIds = [...new Set(certifications.map(c => c.userId))]
            const usersRes = await userApi.list()
            if (usersRes.isSuccess) {
              const payload = usersRes.data as ApiUser[] | { items: ApiUser[] }
              const apiUsers: ApiUser[] = Array.isArray(payload) ? payload : (payload?.items ?? [])
              const newUsersMap: Record<string, ApiUser> = {}
              apiUsers.forEach(user => {
                if (userIds.includes(user.id)) {
                  newUsersMap[user.id] = user
                }
              })
              setUsersMap(prev => ({ ...prev, ...newUsersMap }))
            }
          } catch (err) {
            console.error('Lỗi khi tải thông tin người dùng:', err)
          }
        }
        
        if (!silent) {
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: CERTIFICATION_MESSAGES.FETCH_SUCCESS,
          })
        }
      } else {
        const message = res.message || CERTIFICATION_MESSAGES.FETCH_ERROR
        setError(message)
        if (!silent) {
          toast({
            title: TOAST_TITLES.ERROR,
            description: message,
            variant: 'destructive',
          })
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : CERTIFICATION_MESSAGES.FETCH_ERROR
      setError(message)
      console.error('Lỗi khi tải danh sách chứng chỉ:', err)
      if (!silent) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAccounts({ silent: true })
    loadCertifications({ silent: true })
  }, [loadAccounts, loadCertifications])

  // Event handlers
  const handleApproveAccountClick = (account: PendingAccount) => {
    setSelectedAccountForAction(account)
    setIsApproveAccountModalOpen(true)
  }

  const handleApprove = async (accountId: string) => {
    setIsApproving(true)
    try {
      const res = await userApi.updateStatus(accountId, {
        status: 1, // Active
        reason: 'Tài khoản đã được duyệt bởi quản trị viên',
      })

      if (res.isSuccess) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: APPROVAL_MESSAGES.APPROVE_SUCCESS,
        })
        setIsApproveAccountModalOpen(false)
        setSelectedAccountForAction(null)
        await loadAccounts({ silent: true })
      } else {
        const message = res.message || APPROVAL_MESSAGES.APPROVE_ERROR
        setError(message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error approving account:', error)
      const message = error instanceof Error ? error.message : APPROVAL_MESSAGES.APPROVE_ERROR
      setError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async (accountId: string, reason: string) => {
    setIsRejecting(true)
    try {
      const res = await userApi.updateStatus(accountId, {
        status: 2, // Banned
        reason: reason || 'Tài khoản bị từ chối bởi quản trị viên',
      })

      if (res.isSuccess) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: APPROVAL_MESSAGES.REJECT_SUCCESS,
        })
        setIsRejectModalOpen(false)
        setRejectReason('')
        setSelectedAccountForAction(null)
        await loadAccounts({ silent: true })
      } else {
        const message = res.message || APPROVAL_MESSAGES.REJECT_ERROR
        setError(message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error rejecting account:', error)
      const message = error instanceof Error ? error.message : APPROVAL_MESSAGES.REJECT_ERROR
      setError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const handleViewAccount = (account: PendingAccount) => {
    setSelectedAccount(account)
    setIsAccountDetailModalOpen(true)
  }
  const handleRejectAccount = (account: PendingAccount) => {
    setSelectedAccountForAction(account)
    setIsRejectModalOpen(true)
  }
  const handleCloseDetailModal = () => {
    setSelectedAccount(null)
    setIsAccountDetailModalOpen(false)
  }
  const handleCloseRejectModal = () => {
    setIsRejectModalOpen(false)
    setRejectReason('')
    setSelectedAccountForAction(null)
  }

  // Certification handlers
  const handleApproveCertificationClick = (certification: ApiCertification) => {
    setSelectedCertification(certification)
    setIsCertificationApproveModalOpen(true)
  }

  const handleApproveCertification = async (certificationId: string) => {
    setIsApproving(true)
    try {
      const res = await certificationApi.approve(certificationId, {
        status: 1, // Active
      })

      if (res.isSuccess) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: CERTIFICATION_MESSAGES.APPROVE_SUCCESS,
        })
        setIsCertificationApproveModalOpen(false)
        setSelectedCertification(null)
        await loadCertifications({ silent: true })
      } else {
        const message = res.message || CERTIFICATION_MESSAGES.APPROVE_ERROR
        setError(message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error approving certification:', error)
      const message = error instanceof Error ? error.message : CERTIFICATION_MESSAGES.APPROVE_ERROR
      setError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleRejectCertification = async (certificationId: string, reason: string) => {
    setIsRejecting(true)
    try {
      const res = await certificationApi.approve(certificationId, {
        status: 2, // Reject
        rejectionReason: reason,
      })

      if (res.isSuccess) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: CERTIFICATION_MESSAGES.REJECT_SUCCESS,
        })
        setIsCertificationRejectModalOpen(false)
        setCertificationRejectReason('')
        await loadCertifications({ silent: true })
      } else {
        const message = res.message || CERTIFICATION_MESSAGES.REJECT_ERROR
        setError(message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error rejecting certification:', error)
      const message = error instanceof Error ? error.message : CERTIFICATION_MESSAGES.REJECT_ERROR
      setError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const handleViewCertification = (certification: ApiCertification) => {
    setSelectedCertification(certification)
    setIsCertificationDetailModalOpen(true)
  }

  const handleRejectCertificationClick = (certification: ApiCertification) => {
    setSelectedCertification(certification)
    setIsCertificationRejectModalOpen(true)
  }

  const handleCloseCertificationDetailModal = () => {
    setSelectedCertification(null)
    setIsCertificationDetailModalOpen(false)
  }

  const handleCloseCertificationRejectModal = () => {
    setIsCertificationRejectModalOpen(false)
    setCertificationRejectReason('')
  }

  // Helper functions
  const getStatusBadge = (status: string) => {
    const config = getApprovalStatusConfig(status)
    return (<Badge variant="outline" className={config.className}>{config.text}</Badge>)
  }

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
        pendingCertifications={pendingCertifications}
        isLoading={isLoading}
        error={error}
        onViewAccount={handleViewAccount}
        onApproveAccount={handleApproveAccountClick}
        onRejectAccount={handleRejectAccount}
        onViewCertification={handleViewCertification}
        onApproveCertification={handleApproveCertificationClick}
        onRejectCertification={handleRejectCertificationClick}
        isApproving={isApproving}
        isRejecting={isRejecting}
        formatDate={formatApprovalDate}
        getStatusBadge={getStatusBadge}
        getCertificationStatusBadge={getCertificationStatusBadge}
      />

      <AccountDetailModal account={selectedAccount} isOpen={isAccountDetailModalOpen} onClose={handleCloseDetailModal} formatDate={formatApprovalDate} />

      <ApproveAccountModal
        account={selectedAccountForAction}
        isOpen={isApproveAccountModalOpen}
        onClose={() => {
          setIsApproveAccountModalOpen(false)
          setSelectedAccountForAction(null)
        }}
        onConfirmApprove={handleApprove}
        isApproving={isApproving}
      />

      <RejectModal account={selectedAccountForAction} isOpen={isRejectModalOpen} onClose={handleCloseRejectModal} rejectReason={rejectReason} setRejectReason={setRejectReason} onConfirmReject={handleReject} isRejecting={isRejecting} />

      <CertificationDetailModal
        certification={selectedCertification}
        user={selectedCertification ? usersMap[selectedCertification.userId] : null}
        isOpen={isCertificationDetailModalOpen}
        onClose={handleCloseCertificationDetailModal}
        formatDate={formatApprovalDate}
        getStatusBadge={getCertificationStatusBadge}
      />

      <RejectCertificationModal
        certification={selectedCertification}
        isOpen={isCertificationRejectModalOpen}
        onClose={handleCloseCertificationRejectModal}
        rejectReason={certificationRejectReason}
        setRejectReason={setCertificationRejectReason}
        onConfirmReject={handleRejectCertification}
        isRejecting={isRejecting}
      />

      <ApproveCertificationModal
        certification={selectedCertification}
        isOpen={isCertificationApproveModalOpen}
        onClose={() => {
          setIsCertificationApproveModalOpen(false)
          setSelectedCertification(null)
        }}
        onConfirmApprove={handleApproveCertification}
        isApproving={isApproving}
      />
    </div>
  )
}

export default ApprovalPage

