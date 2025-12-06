import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { walletApi } from '../../services/api/walletApi'
import { userApi } from '../../services/api/userApi'
import type { ApiWallet, ApiLedger, WalletStatus, ApiWithdrawRequest, WithdrawRequestStatus, ApiUserBankAccount, User, ApiTransaction } from '../../types/api'
import { formatCurrencyVND } from '../../utils/currency'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { Wallet, RefreshCw, Search, Eye, CheckCircle2, XCircle, CircleCheck, Loader2 } from 'lucide-react'

const WALLET_STATUS_LABELS: Record<WalletStatus, string> = {
  0: 'Hoạt động',
  1: 'Tạm ngưng',
  2: 'Đã đóng',
}

const WITHDRAW_REQUEST_STATUS_LABELS: Record<WithdrawRequestStatus, string> = {
  0: 'Chờ duyệt',
  1: 'Đã duyệt',
  2: 'Đã từ chối',
  3: 'Đã hoàn thành',
  4: 'Đã hủy',
}

const getWalletStatusBadge = (status: WalletStatus) => {
  const colors: Record<WalletStatus, string> = {
    0: 'text-green-600 border-green-600',
    1: 'text-yellow-600 border-yellow-600',
    2: 'text-red-600 border-red-600',
  }
  return (
    <Badge variant="outline" className={colors[status]}>
      {WALLET_STATUS_LABELS[status]}
    </Badge>
  )
}

const getWithdrawRequestStatusBadge = (status: WithdrawRequestStatus) => {
  const colors: Record<WithdrawRequestStatus, string> = {
    0: 'text-yellow-600 border-yellow-600 bg-yellow-50',
    1: 'text-blue-600 border-blue-600 bg-blue-50',
    2: 'text-red-600 border-red-600 bg-red-50',
    3: 'text-green-600 border-green-600 bg-green-50',
    4: 'text-gray-600 border-gray-600 bg-gray-50',
  }
  return (
    <Badge variant="outline" className={colors[status]}>
      {WITHDRAW_REQUEST_STATUS_LABELS[status]}
    </Badge>
  )
}

const formatDateTime = (iso: string) => {
  return new Date(iso).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WalletPage() {
  const { toast } = useToastContext()
  // System wallet state
  const [wallet, setWallet] = useState<ApiWallet | null>(null)
  const [ledgers, setLedgers] = useState<ApiLedger[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [ledgersLoading, setLedgersLoading] = useState<boolean>(false)
  const [searchValue, setSearchValue] = useState<string>('')
  

  // Withdraw requests state
  const [withdrawRequests, setWithdrawRequests] = useState<ApiWithdrawRequest[]>([])
  const [withdrawRequestsLoading, setWithdrawRequestsLoading] = useState<boolean>(false)
  const [withdrawRequestsSearchValue, setWithdrawRequestsSearchValue] = useState<string>('')
  const [withdrawRequestsStatusFilter, setWithdrawRequestsStatusFilter] = useState<WithdrawRequestStatus | 'all'>('all')
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false)
  const [selectedWithdrawRequest, setSelectedWithdrawRequest] = useState<ApiWithdrawRequest | null>(null)
  const [rejectReason, setRejectReason] = useState<string>('')
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)

  // Withdraw request detail state
  const [withdrawRequestDetail, setWithdrawRequestDetail] = useState<ApiWithdrawRequest | null>(null)
  const [showWithdrawRequestDetailModal, setShowWithdrawRequestDetailModal] = useState<boolean>(false)
  const [userBankAccount, setUserBankAccount] = useState<ApiUserBankAccount | null>(null)
  const [bankAccountLoading, setBankAccountLoading] = useState<boolean>(false)
  const [userInfo, setUserInfo] = useState<User | null>(null)
  const [userInfoLoading, setUserInfoLoading] = useState<boolean>(false)
  const [walletInfo, setWalletInfo] = useState<ApiWallet | null>(null)
  const [walletInfoLoading, setWalletInfoLoading] = useState<boolean>(false)

  // Transaction detail state for ledger
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [transactionDetail, setTransactionDetail] = useState<ApiTransaction | null>(null)
  const [transactionDetailLoading, setTransactionDetailLoading] = useState<boolean>(false)
  const [showTransactionDetailModal, setShowTransactionDetailModal] = useState<boolean>(false)
  const [fromWalletInfo, setFromWalletInfo] = useState<ApiWallet | null>(null)
  const [fromWalletLoading, setFromWalletLoading] = useState<boolean>(false)
  const [toWalletInfo, setToWalletInfo] = useState<ApiWallet | null>(null)
  const [toWalletLoading, setToWalletLoading] = useState<boolean>(false)

  // Fetch system wallet
  const fetchSystemWallet = useCallback(async () => {
    try {
      console.log('[WalletPage] Fetching system wallet...')
      const res = await walletApi.getSystemWallet()
      console.log('[WalletPage] System wallet response:', res)
      
      if (res.isSuccess && res.data) {
        console.log('[WalletPage] Wallet data:', res.data)
        setWallet(res.data)
        return res.data
      } else {
        console.error('[WalletPage] Failed to get wallet:', res.message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể tải thông tin ví',
          variant: 'destructive',
        })
        return null
      }
    } catch (err) {
      console.error('[WalletPage] Error fetching wallet:', err)
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải thông tin ví'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
      return null
    }
  }, [toast])

  // Fetch ledgers for system wallet
  const fetchLedgers = useCallback(async (walletId: string) => {
    try {
      setLedgersLoading(true)
      console.log('[WalletPage] Fetching ledgers for wallet:', walletId)
      const res = await walletApi.getLedgersByWallet(walletId)
      console.log('[WalletPage] Ledgers response:', res)
      
      if (res.isSuccess && res.data) {
        console.log('[WalletPage] Ledgers data:', res.data)
        const sortedLedgers = [...res.data].sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          }
          return b.balanceAfter - a.balanceAfter
        })
        setLedgers(sortedLedgers)
      } else {
        console.error('[WalletPage] Failed to get ledgers:', res.message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể tải lịch sử giao dịch',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('[WalletPage] Error fetching ledgers:', err)
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải lịch sử giao dịch'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLedgersLoading(false)
    }
  }, [toast])



  // Fetch withdraw requests
  const fetchWithdrawRequests = useCallback(async () => {
    try {
      setWithdrawRequestsLoading(true)
      const res = await walletApi.getWithdrawRequests()
      
      if (res.isSuccess && res.data) {
        const sortedRequests = [...res.data].sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          }
          return 0
        })
        setWithdrawRequests(sortedRequests)
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể tải danh sách yêu cầu rút tiền',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải danh sách yêu cầu rút tiền'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setWithdrawRequestsLoading(false)
    }
  }, [toast])

  // Handle approve withdraw request
  const handleApproveWithdrawRequest = useCallback(async (id: string) => {
    try {
      setProcessingRequest(id)
      const res = await walletApi.approveWithdrawRequest(id)
      
      if (res.isSuccess && res.data) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Duyệt yêu cầu rút tiền thành công',
          variant: 'default',
        })
        await fetchWithdrawRequests()
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể duyệt yêu cầu rút tiền',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi duyệt yêu cầu rút tiền'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setProcessingRequest(null)
    }
  }, [toast, fetchWithdrawRequests])

  // Handle reject withdraw request
  const handleRejectWithdrawRequest = useCallback(async (id: string, reason?: string) => {
    try {
      setProcessingRequest(id)
      const res = await walletApi.rejectWithdrawRequest(id, reason ? { reason } : undefined)
      
      if (res.isSuccess && res.data) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Từ chối yêu cầu rút tiền thành công',
          variant: 'default',
        })
        setShowRejectModal(false)
        setRejectReason('')
        setSelectedWithdrawRequest(null)
        await fetchWithdrawRequests()
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể từ chối yêu cầu rút tiền',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi từ chối yêu cầu rút tiền'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setProcessingRequest(null)
    }
  }, [toast, fetchWithdrawRequests])

  // Handle complete withdraw request
  const handleCompleteWithdrawRequest = useCallback(async (id: string) => {
    try {
      setProcessingRequest(id)
      const res = await walletApi.completeWithdrawRequest(id)
      
      if (res.isSuccess && res.data) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Hoàn thành yêu cầu rút tiền thành công',
          variant: 'default',
        })
        await fetchWithdrawRequests()
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể hoàn thành yêu cầu rút tiền',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi hoàn thành yêu cầu rút tiền'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setProcessingRequest(null)
    }
  }, [toast, fetchWithdrawRequests])


  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const walletData = await fetchSystemWallet()
      if (walletData) {
        await fetchLedgers(walletData.id)
      }
      setLoading(false)
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchWithdrawRequests()
  }, [fetchWithdrawRequests])

  // Fetch withdraw request detail
  const fetchWithdrawRequestDetail = useCallback(async (id: string) => {
    try {
      const res = await walletApi.getWithdrawRequestById(id)
      if (res.isSuccess && res.data) {
        setWithdrawRequestDetail(res.data)
        
        // Fetch user info
        if (res.data.userId) {
          try {
            setUserInfoLoading(true)
            const userRes = await userApi.getById(res.data.userId)
            if (userRes.isSuccess && userRes.data) {
              setUserInfo(userRes.data)
            }
          } catch (err) {
            console.error('Error fetching user info:', err)
          } finally {
            setUserInfoLoading(false)
          }
        }

        // Fetch wallet info
        if (res.data.walletId) {
          try {
            setWalletInfoLoading(true)
            const walletRes = await walletApi.getWalletById(res.data.walletId)
            if (walletRes.isSuccess && walletRes.data) {
              setWalletInfo(walletRes.data)
            }
          } catch (err) {
            console.error('Error fetching wallet info:', err)
          } finally {
            setWalletInfoLoading(false)
          }
        }

        // Fetch bank account if userBankAccountId exists
        if (res.data.userBankAccountId) {
          try {
            setBankAccountLoading(true)
            const bankAccountRes = await walletApi.getUserBankAccountById(res.data.userBankAccountId)
            if (bankAccountRes.isSuccess && bankAccountRes.data) {
              setUserBankAccount(bankAccountRes.data)
            }
          } catch (err) {
            console.error('Error fetching bank account:', err)
          } finally {
            setBankAccountLoading(false)
          }
        }
      }
    } catch (err) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: 'Không thể tải chi tiết yêu cầu rút tiền',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleRefresh = () => {
    const loadData = async () => {
      setLoading(true)
      const walletData = await fetchSystemWallet()
      if (walletData) {
        await fetchLedgers(walletData.id)
      }
      setLoading(false)
    }
    loadData()
    fetchWithdrawRequests()
  }

  const handleViewWithdrawRequestDetail = async (request: ApiWithdrawRequest) => {
    setSelectedWithdrawRequest(request)
    setUserBankAccount(null)
    setUserInfo(null)
    setWalletInfo(null)
    setShowWithdrawRequestDetailModal(true)
    await fetchWithdrawRequestDetail(request.id)
  }

  const filteredLedgers = useMemo(() => {
    if (!searchValue) return ledgers
    const searchLower = searchValue.toLowerCase()
    return ledgers.filter(
      (ledger) =>
        ledger.description.toLowerCase().includes(searchLower) ||
        ledger.transactionId.toLowerCase().includes(searchLower) ||
        ledger.walletId.toLowerCase().includes(searchLower)
    )
  }, [ledgers, searchValue])

  const filteredWithdrawRequests = useMemo(() => {
    let filtered = withdrawRequests

    if (withdrawRequestsSearchValue) {
      const searchLower = withdrawRequestsSearchValue.toLowerCase()
      filtered = filtered.filter(
        (request) =>
          request.id.toLowerCase().includes(searchLower) ||
          request.userId.toLowerCase().includes(searchLower) ||
          request.walletId.toLowerCase().includes(searchLower) ||
          request.userBankAccountId.toLowerCase().includes(searchLower)
      )
    }

    if (withdrawRequestsStatusFilter !== 'all') {
      filtered = filtered.filter((request) => request.status === withdrawRequestsStatusFilter)
    }

    return filtered
  }, [withdrawRequests, withdrawRequestsSearchValue, withdrawRequestsStatusFilter])

  const handleOpenRejectModal = (request: ApiWithdrawRequest) => {
    setSelectedWithdrawRequest(request)
    setRejectReason('')
    setShowRejectModal(true)
  }

  const handleConfirmReject = () => {
    if (selectedWithdrawRequest) {
      handleRejectWithdrawRequest(selectedWithdrawRequest.id, rejectReason)
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý ví</h1>
        <p className="text-gray-600">Quản lý số dư, lịch sử giao dịch và yêu cầu rút tiền</p>
      </div>

      {/* System Wallet Balance Card */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">Số dư hiện tại</p>
              {loading ? (
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
              ) : (
                <h2 className="text-3xl font-bold text-gray-900">
                  {wallet ? formatCurrencyVND(wallet.balance) : '—'}
                </h2>
              )}
              {wallet && (
                <div className="mt-3 flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Trạng thái:</span>{' '}
                    {getWalletStatusBadge(wallet.walletStatus)}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleRefresh} disabled={loading || ledgersLoading || withdrawRequestsLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading || ledgersLoading || withdrawRequestsLoading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="system-wallet" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="system-wallet">Ví hệ thống</TabsTrigger>
          <TabsTrigger value="withdraw-requests">Yêu cầu rút tiền</TabsTrigger>
        </TabsList>

        {/* Tab 1: System Wallet Ledgers */}
        <TabsContent value="system-wallet">
          <Card>
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lịch sử giao dịch</h3>
            <p className="text-sm text-gray-600">
              {ledgersLoading ? 'Đang tải...' : `Tổng ${ledgers.length} giao dịch`}
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo mô tả, mã giao dịch..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Ledgers Table */}
          {ledgersLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Đang tải lịch sử giao dịch...</p>
            </div>
          ) : filteredLedgers.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">Số tiền</TableHead>
                    <TableHead className="w-[15%]">Số dư sau</TableHead>
                    <TableHead className="w-[30%]">Mô tả</TableHead>
                    <TableHead className="w-[20%]">Mã giao dịch</TableHead>
                    <TableHead className="w-[20%]">Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedgers.map((ledger, index) => (
                    <TableRow key={ledger.id || `${ledger.transactionId}-${index}`} className="hover:bg-gray-50">
                      <TableCell>
                        <span
                          className={`font-semibold ${
                            ledger.direction === 1 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {ledger.direction === 1 ? '+' : '-'}
                          {formatCurrencyVND(ledger.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">
                          {formatCurrencyVND(ledger.balanceAfter)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="truncate max-w-[300px]" title={ledger.description}>
                          {ledger.description || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            setSelectedTransactionId(ledger.transactionId)
                            setShowTransactionDetailModal(true)
                            setTransactionDetailLoading(true)
                            setFromWalletInfo(null)
                            setToWalletInfo(null)
                            try {
                              const res = await walletApi.getTransactionById(ledger.transactionId)
                              if (res.isSuccess && res.data) {
                                setTransactionDetail(res.data)
                                
                                // Fetch from wallet info
                                if (res.data.fromWalletId) {
                                  try {
                                    setFromWalletLoading(true)
                                    const fromWalletRes = await walletApi.getWalletById(res.data.fromWalletId)
                                    if (fromWalletRes.isSuccess && fromWalletRes.data) {
                                      setFromWalletInfo(fromWalletRes.data)
                                    }
                                  } catch (err) {
                                    console.error('Error fetching from wallet:', err)
                                  } finally {
                                    setFromWalletLoading(false)
                                  }
                                }
                                
                                // Fetch to wallet info
                                if (res.data.toWalletId) {
                                  try {
                                    setToWalletLoading(true)
                                    const toWalletRes = await walletApi.getWalletById(res.data.toWalletId)
                                    if (toWalletRes.isSuccess && toWalletRes.data) {
                                      setToWalletInfo(toWalletRes.data)
                                    }
                                  } catch (err) {
                                    console.error('Error fetching to wallet:', err)
                                  } finally {
                                    setToWalletLoading(false)
                                  }
                                }
                              }
                            } catch (err) {
                              toast({
                                title: TOAST_TITLES.ERROR,
                                description: 'Không thể tải thông tin giao dịch',
                                variant: 'destructive',
                              })
                            } finally {
                              setTransactionDetailLoading(false)
                            }
                          }}
                          className="h-auto p-0 text-xs font-mono text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          {ledger.transactionId.slice(0, 8)}...
                        </Button>
                      </TableCell>
                      <TableCell>
                        {ledger.createdAt ? (
                          <span className="text-sm text-gray-600">
                            {formatDateTime(ledger.createdAt)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
            </div>
          )}
        </div>
      </Card>
        </TabsContent>

        {/* Tab 2: Withdraw Requests */}
        <TabsContent value="withdraw-requests">
      <Card>
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Yêu cầu rút tiền</h3>
              <p className="text-sm text-gray-600">
                    {withdrawRequestsLoading ? 'Đang tải...' : `Tổng ${filteredWithdrawRequests.length} yêu cầu`}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                    placeholder="Tìm kiếm theo ID, User ID, Wallet ID..."
                    value={withdrawRequestsSearchValue}
                    onChange={(e) => setWithdrawRequestsSearchValue(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                    value={withdrawRequestsStatusFilter}
                    onChange={(e) => setWithdrawRequestsStatusFilter(e.target.value as WithdrawRequestStatus | 'all')}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả trạng thái</option>
                    <option value={0}>Chờ duyệt</option>
                    <option value={1}>Đã duyệt</option>
                    <option value={2}>Đã từ chối</option>
                    <option value={3}>Đã hoàn thành</option>
                    <option value={4}>Đã hủy</option>
              </select>
            </div>
          </div>

              {/* Withdraw Requests Table */}
              {withdrawRequestsLoading ? (
            <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-500">Đang tải danh sách yêu cầu rút tiền...</p>
            </div>
              ) : filteredWithdrawRequests.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Không tìm thấy yêu cầu rút tiền nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                        <TableHead className="w-[10%]">ID</TableHead>
                    <TableHead className="w-[12%]">User ID</TableHead>
                        <TableHead className="w-[12%]">Wallet ID</TableHead>
                        <TableHead className="w-[10%]">Số tiền</TableHead>
                        <TableHead className="w-[10%]">Trạng thái</TableHead>
                    <TableHead className="w-[12%]">Ngày tạo</TableHead>
                        <TableHead className="w-[12%]">Lý do</TableHead>
                        <TableHead className="w-[12%] text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {filteredWithdrawRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-gray-50">
                          <TableCell>
                            <span className="text-xs font-mono text-gray-600">
                              {request.id.slice(0, 8)}...
                            </span>
                          </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-gray-600">
                              {request.userId.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-gray-600">
                              {request.walletId.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-900">
                              {formatCurrencyVND(request.amount)}
                        </span>
                      </TableCell>
                          <TableCell>{getWithdrawRequestStatusBadge(request.status)}</TableCell>
                      <TableCell>
                            <span className="text-sm text-gray-600">
                              {formatDateTime(request.createdAt)}
                            </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                              {request.reason || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                                onClick={() => handleViewWithdrawRequestDetail(request)}
                          className="h-8 px-3 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                                Chi tiết
                              </Button>
                              {request.status === 0 && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApproveWithdrawRequest(request.id)}
                                    disabled={processingRequest === request.id}
                                    className="h-8 px-3 text-xs text-green-600 border-green-600 hover:bg-green-50"
                                  >
                                    {processingRequest === request.id ? (
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                    )}
                                    Duyệt
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenRejectModal(request)}
                                    disabled={processingRequest === request.id}
                                    className="h-8 px-3 text-xs text-red-600 border-red-600 hover:bg-red-50"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Từ chối
                                  </Button>
                                </>
                              )}
                              {request.status === 1 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCompleteWithdrawRequest(request.id)}
                                  disabled={processingRequest === request.id}
                                  className="h-8 px-3 text-xs text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  {processingRequest === request.id ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <CircleCheck className="w-3 h-3 mr-1" />
                                  )}
                                  Hoàn thành
                        </Button>
                              )}
                            </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
            </div>
          )}
        </div>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-600">Từ chối yêu cầu rút tiền</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Yêu cầu ID: {selectedWithdrawRequest?.id.slice(0, 8)}...
              </Label>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Số tiền: {selectedWithdrawRequest ? formatCurrencyVND(selectedWithdrawRequest.amount) : '—'}
              </Label>
            </div>
            <div>
              <Label htmlFor="rejectReason" className="text-sm font-medium text-gray-700">
                Lý do từ chối (tùy chọn)
              </Label>
              <Textarea
                id="rejectReason"
                placeholder="Nhập lý do từ chối yêu cầu rút tiền này..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRejectModal(false)} disabled={processingRequest === selectedWithdrawRequest?.id}>
                Hủy
              </Button>
              <Button
                variant="outline"
                onClick={handleConfirmReject}
                disabled={processingRequest === selectedWithdrawRequest?.id}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                {processingRequest === selectedWithdrawRequest?.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang từ chối...
                  </>
                ) : (
                  'Từ chối'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Request Detail Modal */}
      {showWithdrawRequestDetailModal && selectedWithdrawRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowWithdrawRequestDetailModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Chi tiết yêu cầu rút tiền - {selectedWithdrawRequest.id.slice(0, 8)}...
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Số tiền: {formatCurrencyVND(selectedWithdrawRequest.amount)} | 
                  {' '}Trạng thái: {getWithdrawRequestStatusBadge(selectedWithdrawRequest.status)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWithdrawRequestDetailModal(false)}
                className="h-8"
              >
                Đóng
              </Button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Thông tin người dùng</Label>
                  {userInfoLoading ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      <p className="text-sm text-gray-500">Đang tải thông tin người dùng...</p>
                    </div>
                  ) : userInfo ? (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {userInfo.firstName} {userInfo.lastName}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600">Email</Label>
                            <p className="text-sm text-gray-900 mt-1">{userInfo.email}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Số điện thoại</Label>
                            <p className="text-sm text-gray-900 mt-1">{userInfo.phoneNumber || '—'}</p>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-600">Địa chỉ</Label>
                            <p className="text-sm text-gray-900 mt-1">
                              {userInfo.address}, {userInfo.communes}, {userInfo.province}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500">Không thể tải thông tin người dùng</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Thông tin ví</Label>
                  {walletInfoLoading ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      <p className="text-sm text-gray-500">Đang tải thông tin ví...</p>
                    </div>
                  ) : walletInfo ? (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Số dư: {formatCurrencyVND(walletInfo.balance)}
                            </p>
                          </div>
                          {getWalletStatusBadge(walletInfo.walletStatus)}
                        </div>
                        <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600">Loại tiền</Label>
                            <p className="text-sm text-gray-900 mt-1">{walletInfo.currency}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Loại ví</Label>
                            <p className="text-sm text-gray-900 mt-1">
                              {walletInfo.isSystemWallet ? 'Hệ thống' : 'Người dùng'}
                            </p>
                          </div>
                        </div>
                </div>
                </div>
              ) : (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500">Không thể tải thông tin ví</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Số tiền</Label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {formatCurrencyVND(withdrawRequestDetail?.amount || selectedWithdrawRequest.amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Trạng thái</Label>
                  <div className="mt-1">
                    {getWithdrawRequestStatusBadge(withdrawRequestDetail?.status || selectedWithdrawRequest.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Thông tin tài khoản ngân hàng</Label>
                  {bankAccountLoading ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      <p className="text-sm text-gray-500">Đang tải thông tin ngân hàng...</p>
                    </div>
                  ) : userBankAccount ? (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          {userBankAccount.bank?.logo && (
                            <img
                              src={userBankAccount.bank.logo}
                              alt={userBankAccount.bank.name}
                              className="w-10 h-10 object-contain"
                            />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {userBankAccount.bank?.name || userBankAccount.bank?.shortName || 'N/A'}
                            </p>
                            {userBankAccount.bank?.code && (
                              <p className="text-xs text-gray-600">Code: {userBankAccount.bank.code}</p>
                            )}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-gray-600">Số tài khoản</Label>
                              <p className="text-sm font-mono text-gray-900 mt-1">
                                {userBankAccount.accountNumber}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Tên chủ tài khoản</Label>
                              <p className="text-sm font-semibold text-gray-900 mt-1">
                                {userBankAccount.accountName}
                              </p>
                            </div>
                          </div>
                          {userBankAccount.isPrimary && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50">
                                Tài khoản chính
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                            </div>
                  ) : (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500">Không thể tải thông tin tài khoản ngân hàng</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Lý do</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {withdrawRequestDetail?.reason || selectedWithdrawRequest.reason || '—'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Ngày tạo</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatDateTime(withdrawRequestDetail?.createdAt || selectedWithdrawRequest.createdAt)}
                  </p>
                            </div>
                {withdrawRequestDetail?.updatedAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Ngày cập nhật</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatDateTime(withdrawRequestDetail.updatedAt)}
                    </p>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {showTransactionDetailModal && selectedTransactionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => {
            setShowTransactionDetailModal(false)
            setSelectedTransactionId(null)
            setTransactionDetail(null)
            setFromWalletInfo(null)
            setToWalletInfo(null)
          }} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Chi tiết giao dịch - {selectedTransactionId.slice(0, 8)}...
                </h3>
                {transactionDetail && (
                  <p className="text-sm text-gray-600 mt-1">
                    Số tiền: {formatCurrencyVND(transactionDetail.amount)} | 
                    {' '}Loại tiền: {transactionDetail.currency}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowTransactionDetailModal(false)
                  setSelectedTransactionId(null)
                  setTransactionDetail(null)
                  setFromWalletInfo(null)
                  setToWalletInfo(null)
                }}
                className="h-8"
              >
                Đóng
              </Button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              {transactionDetailLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-500">Đang tải thông tin giao dịch...</p>
                </div>
              ) : transactionDetail ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Code</Label>
                      <p className="text-sm text-gray-900 mt-1">{transactionDetail.code || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Mô tả</Label>
                      <p className="text-sm text-gray-900 mt-1">{transactionDetail.desc || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Trạng thái</Label>
                      <div className="mt-1">
                        {transactionDetail.success ? (
                          <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
                            Thành công
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50">
                            Thất bại
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Order Code</Label>
                      <p className="text-sm text-gray-900 mt-1">{transactionDetail.orderCode || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Số tiền</Label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {formatCurrencyVND(transactionDetail.amount)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Loại tiền</Label>
                      <p className="text-sm text-gray-900 mt-1">{transactionDetail.currency}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Loại giao dịch</Label>
                      <p className="text-sm text-gray-900 mt-1">Type {transactionDetail.transactionType}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Payment Type</Label>
                      <p className="text-sm text-gray-900 mt-1">Type {transactionDetail.paymentType}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Ví gửi (From Wallet)</Label>
                      {fromWalletLoading ? (
                        <div className="mt-2 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          <p className="text-xs text-gray-500">Đang tải...</p>
                        </div>
                      ) : fromWalletInfo ? (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-900">
                              Số dư: {formatCurrencyVND(fromWalletInfo.balance)}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-600">Loại tiền: {fromWalletInfo.currency}</p>
                              {getWalletStatusBadge(fromWalletInfo.walletStatus)}
                            </div>
                            <p className="text-xs text-gray-500">
                              {fromWalletInfo.isSystemWallet ? 'Ví hệ thống' : 'Ví người dùng'}
                            </p>
                          </div>
                        </div>
                      ) : transactionDetail.fromWalletId ? (
                        <p className="text-xs font-mono text-gray-500 mt-1">
                          {transactionDetail.fromWalletId}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1">—</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Ví nhận (To Wallet)</Label>
                      {toWalletLoading ? (
                        <div className="mt-2 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          <p className="text-xs text-gray-500">Đang tải...</p>
                        </div>
                      ) : toWalletInfo ? (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-900">
                              Số dư: {formatCurrencyVND(toWalletInfo.balance)}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-600">Loại tiền: {toWalletInfo.currency}</p>
                              {getWalletStatusBadge(toWalletInfo.walletStatus)}
                            </div>
                            <p className="text-xs text-gray-500">
                              {toWalletInfo.isSystemWallet ? 'Ví hệ thống' : 'Ví người dùng'}
                            </p>
                          </div>
                        </div>
                      ) : transactionDetail.toWalletId ? (
                        <p className="text-xs font-mono text-gray-500 mt-1">
                          {transactionDetail.toWalletId}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1">—</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Escrow ID</Label>
                      <p className="text-xs font-mono text-gray-600 mt-1">
                        {transactionDetail.escrowId !== '00000000-0000-0000-0000-000000000000' 
                          ? transactionDetail.escrowId 
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Payment Link ID</Label>
                      <p className="text-xs font-mono text-gray-600 mt-1">
                        {transactionDetail.paymentLinkId || '—'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Thời gian giao dịch</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {transactionDetail.transactionDateTime && transactionDetail.transactionDateTime !== '0001-01-01T00:00:00' 
                        ? formatDateTime(transactionDetail.transactionDateTime)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Ngày tạo</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatDateTime(transactionDetail.createdAt)}
                    </p>
                  </div>
                  {transactionDetail.updatedAt && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Ngày cập nhật</Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {formatDateTime(transactionDetail.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Không thể tải thông tin giao dịch</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
