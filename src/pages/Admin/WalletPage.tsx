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
import { auctionApi } from '../../services/api/auctionApi'
import type { ApiWallet, ApiLedger, WalletStatus, ApiWithdrawRequest, WithdrawRequestStatus, ApiUserBankAccount, User, ApiTransaction, ApiEnglishAuction } from '../../types/api'
import { formatCurrencyVND } from '../../utils/currency'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { Wallet, RefreshCw, Search, Eye, CheckCircle2, XCircle, CircleCheck, Loader2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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

const PAYMENT_TYPE_LABELS: Record<number, string> = {
  0: 'PayOS',
  1: 'Wallet',
}

const TRANSACTION_TYPE_LABELS: Record<number, string> = {
  1: 'Thanh toán Escrow',
  2: 'Giải phóng Escrow',
  3: 'Hoàn tiền Escrow',
  4: 'Nạp tiền',
  5: 'Rút tiền',
  6: 'Thanh toán phần còn lại Escrow',
  7: 'Phí tham gia đấu giá',
  8: 'Hoàn phí tham gia đấu giá',
  9: 'Phí đấu giá',
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

// Clean description để loại bỏ ID auction và các UUID không cần thiết
const cleanDescription = (description: string | null | undefined): string => {
  if (!description) return '—'
  
  // Loại bỏ UUID pattern (8-4-4-4-12)
  let cleaned = description.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ''
  )
  
  // Loại bỏ các pattern như "auction: {id}" hoặc "auctionId: {id}"
  cleaned = cleaned.replace(/auction\s*:?\s*[0-9a-f-]+/gi, '')
  cleaned = cleaned.replace(/auctionId\s*:?\s*[0-9a-f-]+/gi, '')
  
  // Loại bỏ các khoảng trắng thừa và dấu phẩy/cột thừa
  cleaned = cleaned.replace(/\s*[,:]\s*/g, ' ').replace(/\s+/g, ' ').trim()
  
  return cleaned || '—'
}

export default function WalletPage() {
  const { toast } = useToastContext()
  const navigate = useNavigate()
  // System wallet state
  const [wallet, setWallet] = useState<ApiWallet | null>(null)
  const [ledgers, setLedgers] = useState<ApiLedger[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [ledgersLoading, setLedgersLoading] = useState<boolean>(false)
  const [searchValue, setSearchValue] = useState<string>('')
  const [directionFilter, setDirectionFilter] = useState<1 | 2 | 'all'>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  

  // Withdraw requests state
  const [withdrawRequests, setWithdrawRequests] = useState<ApiWithdrawRequest[]>([])
  const [withdrawRequestsLoading, setWithdrawRequestsLoading] = useState<boolean>(false)
  const [withdrawRequestsSearchValue, setWithdrawRequestsSearchValue] = useState<string>('')
  const [withdrawRequestsStatusFilter, setWithdrawRequestsStatusFilter] = useState<WithdrawRequestStatus | 'all'>('all')
  const [ledgersPage, setLedgersPage] = useState<number>(1)
  const [withdrawRequestsPage, setWithdrawRequestsPage] = useState<number>(1)
  const PAGE_SIZE = 10
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false)
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false)
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false)
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
  // Wallet info is fetched but not currently displayed in the modal
  const [_walletInfo, setWalletInfo] = useState<ApiWallet | null>(null)
  const [_walletInfoLoading, setWalletInfoLoading] = useState<boolean>(false)

  // Transaction detail state for ledger
  const [_selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [transactionDetail, setTransactionDetail] = useState<ApiTransaction | null>(null)
  const [transactionDetailLoading, setTransactionDetailLoading] = useState<boolean>(false)
  const [showTransactionDetailModal, setShowTransactionDetailModal] = useState<boolean>(false)
  const [fromWalletDetail, setFromWalletDetail] = useState<ApiWallet | null>(null)
  const [toWalletDetail, setToWalletDetail] = useState<ApiWallet | null>(null)
  const [fromUserDetail, setFromUserDetail] = useState<User | null>(null)
  const [toUserDetail, setToUserDetail] = useState<User | null>(null)
  const [partyInfoLoading, setPartyInfoLoading] = useState<boolean>(false)
  const [relatedAuction, setRelatedAuction] = useState<ApiEnglishAuction | null>(null)
  const [relatedEntityLoading, setRelatedEntityLoading] = useState<boolean>(false)

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

  // Handle approve withdraw request click
  const handleApproveWithdrawRequestClick = useCallback((request: ApiWithdrawRequest) => {
    setSelectedWithdrawRequest(request)
    setShowApproveModal(true)
  }, [])

  // Handle approve withdraw request
  const handleApproveWithdrawRequest = useCallback(async () => {
    if (!selectedWithdrawRequest) return
    
    try {
      setProcessingRequest(selectedWithdrawRequest.id)
      const res = await walletApi.approveWithdrawRequest(selectedWithdrawRequest.id)
      
      if (res.isSuccess && res.data) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Duyệt yêu cầu rút tiền thành công',
          variant: 'default',
        })
        setShowApproveModal(false)
        setSelectedWithdrawRequest(null)
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
  }, [toast, fetchWithdrawRequests, selectedWithdrawRequest])

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

  // Handle complete withdraw request click
  const handleCompleteWithdrawRequestClick = useCallback((request: ApiWithdrawRequest) => {
    setSelectedWithdrawRequest(request)
    setShowCompleteModal(true)
  }, [])

  // Handle complete withdraw request
  const handleCompleteWithdrawRequest = useCallback(async () => {
    if (!selectedWithdrawRequest) return
    
    try {
      setProcessingRequest(selectedWithdrawRequest.id)
      const res = await walletApi.completeWithdrawRequest(selectedWithdrawRequest.id)
      
      if (res.isSuccess && res.data) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Hoàn thành yêu cầu rút tiền thành công',
          variant: 'default',
        })
        setShowCompleteModal(false)
        setSelectedWithdrawRequest(null)
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
  }, [toast, fetchWithdrawRequests, selectedWithdrawRequest])


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

  // Load thông tin ví và người gửi / nhận cho 1 giao dịch
  const loadTransactionParties = useCallback(
    async (tx: ApiTransaction) => {
      setFromWalletDetail(null)
      setToWalletDetail(null)
      setFromUserDetail(null)
      setToUserDetail(null)

      if (!tx.fromWalletId && !tx.toWalletId) return

      try {
        setPartyInfoLoading(true)

        if (tx.fromWalletId) {
          try {
            const fromWalletRes = await walletApi.getWalletById(tx.fromWalletId)
            if (fromWalletRes.isSuccess && fromWalletRes.data) {
              setFromWalletDetail(fromWalletRes.data)

              if (fromWalletRes.data.userId) {
                const userRes = await userApi.getById(fromWalletRes.data.userId)
                if (userRes.isSuccess && userRes.data) {
                  setFromUserDetail(userRes.data)
                }
              }
            }
          } catch (err) {
            console.error('Error fetching from wallet/user:', err)
          }
        }

        if (tx.toWalletId) {
          try {
            const toWalletRes = await walletApi.getWalletById(tx.toWalletId)
            if (toWalletRes.isSuccess && toWalletRes.data) {
              setToWalletDetail(toWalletRes.data)

              if (toWalletRes.data.userId) {
                const userRes = await userApi.getById(toWalletRes.data.userId)
                if (userRes.isSuccess && userRes.data) {
                  setToUserDetail(userRes.data)
                }
              }
            }
          } catch (err) {
            console.error('Error fetching to wallet/user:', err)
          }
        }
      } finally {
        setPartyInfoLoading(false)
      }
    },
    []
  )

  // Load thông tin đối tượng liên quan (Auction/BuyRequest) dựa trên relatedEntityId, relatedEntityType hoặc escrowId
  const loadRelatedEntityInfo = useCallback(
    async (tx: ApiTransaction) => {
      setRelatedAuction(null)

      try {
        setRelatedEntityLoading(true)

        console.log('[loadRelatedEntityInfo] Transaction:', {
          transactionType: tx.transactionType,
          escrowId: tx.escrowId,
          relatedEntityId: tx.relatedEntityId,
          relatedEntityType: tx.relatedEntityType,
        })

        // Với giao dịch nhận cọc (type 1) và nhận tiền còn lại (type 6), dùng escrowId để lấy thông tin
        if ((tx.transactionType === 1 || tx.transactionType === 6) && 
            tx.escrowId && 
            tx.escrowId !== '00000000-0000-0000-0000-000000000000') {
          try {
            console.log('[loadRelatedEntityInfo] Loading escrow:', tx.escrowId)
            // Bước 1: Load escrow detail để lấy auctionId hoặc buyRequestId
            const escrowRes = await walletApi.getEscrowById(tx.escrowId)
            console.log('[loadRelatedEntityInfo] Escrow response:', escrowRes)
            
            if (escrowRes.isSuccess && escrowRes.data) {
              const escrow = escrowRes.data
              console.log('[loadRelatedEntityInfo] Escrow data:', escrow)
              
              // Bước 2: Nếu escrow có auctionId, gọi GET /escrow/auction/{auctionId}
              if (escrow.auctionId && escrow.auctionId !== '00000000-0000-0000-0000-000000000000') {
                try {
                  console.log('[loadRelatedEntityInfo] Loading escrow by auctionId:', escrow.auctionId)
                  const escrowByAuctionRes = await walletApi.getEscrowByAuctionId(escrow.auctionId)
                  console.log('[loadRelatedEntityInfo] Escrow by auction response:', escrowByAuctionRes)
                  
                  // Sau đó load auction detail để hiển thị
                  const auctionRes = await auctionApi.getEnglishAuctionById(escrow.auctionId)
                  if (auctionRes.isSuccess && auctionRes.data) {
                    console.log('[loadRelatedEntityInfo] Auction loaded successfully:', auctionRes.data)
                    setRelatedAuction(auctionRes.data)
                    return
                  }
                } catch (err) {
                  console.error('[loadRelatedEntityInfo] Error fetching escrow/auction or auction:', err)
                }
              }
              
              // Bước 3: Nếu escrow có buyRequestId, gọi GET /escrow/buyrequest/{buyRequestId}
              if (escrow.buyRequestId && escrow.buyRequestId !== '00000000-0000-0000-0000-000000000000') {
                try {
                  console.log('[loadRelatedEntityInfo] Loading escrow by buyRequestId:', escrow.buyRequestId)
                  const escrowByBuyRequestRes = await walletApi.getEscrowByBuyRequestId(escrow.buyRequestId)
                  console.log('[loadRelatedEntityInfo] Escrow by buyRequest response:', escrowByBuyRequestRes)
                  
                  // TODO: Load buyrequest detail khi có API
                  // const buyRequestRes = await buyRequestApi.getById(escrow.buyRequestId)
                  // ...
                } catch (err) {
                  console.error('[loadRelatedEntityInfo] Error fetching escrow/buyrequest:', err)
                }
              }
              
              // Fallback: Nếu không có auctionId/buyRequestId trong escrow, thử load auction trực tiếp từ escrowId
              // (có thể escrowId chính là auctionId trong một số trường hợp)
              if (!escrow.auctionId && !escrow.buyRequestId) {
                console.log('[loadRelatedEntityInfo] Escrow does not have auctionId or buyRequestId, trying fallback')
              }
            } else {
              console.warn('[loadRelatedEntityInfo] Escrow API failed:', escrowRes.message)
            }
          } catch (err) {
            console.error('[loadRelatedEntityInfo] Error fetching escrow detail:', err)
          }
        }

        // Nếu có relatedEntityId hợp lệ, thử load trực tiếp (cho các transaction type khác hoặc fallback)
        if (tx.relatedEntityId && 
            tx.relatedEntityId !== '00000000-0000-0000-0000-000000000000') {
          // Xác định loại entity từ relatedEntityType hoặc suy đoán từ transactionType
          const entityType = tx.relatedEntityType || 
            (tx.transactionType === 7 || tx.transactionType === 8 || tx.transactionType === 9 ? 'Auction' : null)

          // Nếu có relatedEntityType rõ ràng từ backend
          if (entityType === 'Auction' && tx.relatedEntityId) {
            try {
              console.log('[loadRelatedEntityInfo] Loading auction from relatedEntityId:', tx.relatedEntityId)
              const auctionRes = await auctionApi.getEnglishAuctionById(tx.relatedEntityId)
              if (auctionRes.isSuccess && auctionRes.data) {
                console.log('[loadRelatedEntityInfo] Auction loaded from relatedEntityId:', auctionRes.data)
                setRelatedAuction(auctionRes.data)
                return
              }
            } catch (err) {
              console.error('[loadRelatedEntityInfo] Error fetching auction detail:', err)
            }
          }
        }

        // TODO: Thêm case cho BuyRequest khi có API
        // if (entityType === 'BuyRequest' && tx.relatedEntityId) {
        //   const buyRequestRes = await buyRequestApi.getById(tx.relatedEntityId)
        //   ...
        // }
      } finally {
        setRelatedEntityLoading(false)
      }
    },
    []
  )

  // Open withdraw request detail directly from a transaction (using relatedEntityId)
  const openWithdrawRequestDetailById = useCallback(
    async (withdrawRequestId: string) => {
      // Reset previous detail
      setUserBankAccount(null)
      setUserInfo(null)
      setWalletInfo(null)

      // Show modal immediately, data sẽ được fill sau khi fetch xong
      setShowWithdrawRequestDetailModal(true)

      try {
        const res = await walletApi.getWithdrawRequestById(withdrawRequestId)
        if (res.isSuccess && res.data) {
          // Đồng bộ selected + detail để modal hiển thị đầy đủ
          setSelectedWithdrawRequest(res.data)
          setWithdrawRequestDetail(res.data)

          // Load thêm thông tin liên quan (user, bank, wallet)
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
        } else {
          toast({
            title: TOAST_TITLES.ERROR,
            description: res.message || 'Không thể tải chi tiết yêu cầu rút tiền',
            variant: 'destructive',
          })
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải chi tiết yêu cầu rút tiền'
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    },
    [toast]
  )

  const filteredLedgers = useMemo(() => {
    let filtered = ledgers

    // Filter by search value
    if (searchValue) {
      const searchLower = searchValue.toLowerCase()
      filtered = filtered.filter(
        (ledger) =>
          ledger.description.toLowerCase().includes(searchLower) ||
          ledger.transactionId.toLowerCase().includes(searchLower) ||
          ledger.walletId.toLowerCase().includes(searchLower)
      )
    }

    // Filter by direction (1 = vào, 2 = ra)
    if (directionFilter !== 'all') {
      filtered = filtered.filter((ledger) => ledger.direction === Number(directionFilter))
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter((ledger) => {
        if (!ledger.createdAt) return false
        const ledgerDate = new Date(ledger.createdAt)
        ledgerDate.setHours(0, 0, 0, 0)
        return ledgerDate >= fromDate
      })
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((ledger) => {
        if (!ledger.createdAt) return false
        const ledgerDate = new Date(ledger.createdAt)
        return ledgerDate <= toDate
      })
    }

    return filtered
  }, [ledgers, searchValue, directionFilter, dateFrom, dateTo])

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

  // Paginated data
  const paginatedLedgers = useMemo(() => {
    const start = (ledgersPage - 1) * PAGE_SIZE
    return filteredLedgers.slice(start, start + PAGE_SIZE)
  }, [filteredLedgers, ledgersPage])

  const paginatedWithdrawRequests = useMemo(() => {
    const start = (withdrawRequestsPage - 1) * PAGE_SIZE
    return filteredWithdrawRequests.slice(start, start + PAGE_SIZE)
  }, [filteredWithdrawRequests, withdrawRequestsPage])

  // Total pages
  const ledgersTotalPages = Math.max(1, Math.ceil(filteredLedgers.length / PAGE_SIZE))
  const withdrawRequestsTotalPages = Math.max(1, Math.ceil(filteredWithdrawRequests.length / PAGE_SIZE))

  // Reset page when filters change
  useEffect(() => {
    setLedgersPage(1)
  }, [searchValue, directionFilter, dateFrom, dateTo])

  useEffect(() => {
    setWithdrawRequestsPage(1)
  }, [withdrawRequestsSearchValue, withdrawRequestsStatusFilter])

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
              {ledgersLoading ? 'Đang tải...' : (
                <>
                  Hiển thị {paginatedLedgers.length} / {filteredLedgers.length} giao dịch (Tổng {ledgers.length})
                </>
              )}
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo mô tả, mã giao dịch..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <select
                  value={directionFilter}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'all') {
                      setDirectionFilter('all')
                    } else {
                      setDirectionFilter(Number(value) as 1 | 2)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả giao dịch</option>
                  <option value="1">Tiền vào</option>
                  <option value="2">Tiền ra</option>
                </select>
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="Từ ngày"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="Đến ngày"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full"
                  min={dateFrom || undefined}
                />
              </div>
            </div>
            {(searchValue || directionFilter !== 'all' || dateFrom || dateTo) && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchValue('')
                    setDirectionFilter('all')
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className="h-8 px-3 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Xóa bộ lọc
                </Button>
              </div>
            )}
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
                    <TableHead className="w-[20%]">Thời gian</TableHead>
                    <TableHead className="w-[20%] text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLedgers.map((ledger, index) => (
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
                        <div className="truncate max-w-[300px]" title={cleanDescription(ledger.description)}>
                          {cleanDescription(ledger.description)}
                        </div>
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
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setSelectedTransactionId(ledger.transactionId)
                            setShowTransactionDetailModal(true)
                            setTransactionDetailLoading(true)
                            try {
                              const res = await walletApi.getTransactionById(ledger.transactionId)
                              if (res.isSuccess && res.data) {
                                setTransactionDetail(res.data)
                                // Load thêm thông tin ví + user gửi/nhận cho giao dịch này
                                await loadTransactionParties(res.data)
                                // Load thông tin đối tượng liên quan (Auction/BuyRequest)
                                await loadRelatedEntityInfo(res.data)
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
                          className="h-8 px-3 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
            </div>
          )}

          {/* Pagination for Ledgers */}
          {!ledgersLoading && filteredLedgers.length > 0 && ledgersTotalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-4 mt-4 pt-4 border-t border-gray-200">
              <span className="text-xs sm:text-sm text-gray-600">
                Trang {ledgersPage} / {ledgersTotalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLedgersPage(p => Math.max(1, p - 1))}
                  disabled={ledgersPage === 1}
                  className="text-xs sm:text-sm"
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLedgersPage(p => Math.min(ledgersTotalPages, p + 1))}
                  disabled={ledgersPage === ledgersTotalPages}
                  className="text-xs sm:text-sm"
                >
                  Sau
                </Button>
              </div>
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
                    {withdrawRequestsLoading ? 'Đang tải...' : `Hiển thị ${paginatedWithdrawRequests.length} / ${filteredWithdrawRequests.length} yêu cầu`}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                    placeholder="Tìm kiếm theo số tiền, lý do..."
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
                        <TableHead className="w-[15%]">Số tiền</TableHead>
                        <TableHead className="w-[15%]">Trạng thái</TableHead>
                    <TableHead className="w-[18%]">Ngày tạo</TableHead>
                        <TableHead className="w-[20%]">Lý do</TableHead>
                        <TableHead className="w-[32%] text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {paginatedWithdrawRequests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-gray-50">
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
                                <div className="flex gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveWithdrawRequestClick(request)}
                                    disabled={Boolean(processingRequest)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 min-w-[90px] text-xs"
                                  >
                                    ✓ Duyệt
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenRejectModal(request)}
                                    disabled={Boolean(processingRequest)}
                                    className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-600 flex-1 min-w-[90px] text-xs"
                                  >
                                    ✕ Từ chối
                                  </Button>
                                </div>
                              )}
                              {request.status === 1 && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteWithdrawRequestClick(request)}
                                  disabled={Boolean(processingRequest)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                >
                                  <CircleCheck className="w-3 h-3 mr-1" />
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

          {/* Pagination for Withdraw Requests */}
          {!withdrawRequestsLoading && filteredWithdrawRequests.length > 0 && withdrawRequestsTotalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-4 mt-4 pt-4 border-t border-gray-200">
              <span className="text-xs sm:text-sm text-gray-600">
                Trang {withdrawRequestsPage} / {withdrawRequestsTotalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawRequestsPage(p => Math.max(1, p - 1))}
                  disabled={withdrawRequestsPage === 1}
                  className="text-xs sm:text-sm"
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawRequestsPage(p => Math.min(withdrawRequestsTotalPages, p + 1))}
                  disabled={withdrawRequestsPage === withdrawRequestsTotalPages}
                  className="text-xs sm:text-sm"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Confirmation Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-emerald-600">Xác nhận duyệt yêu cầu rút tiền</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Bạn có chắc chắn muốn duyệt yêu cầu rút tiền này? Yêu cầu sẽ được chuyển sang trạng thái "Đã duyệt".
            </p>
            {selectedWithdrawRequest && (
              <div className="rounded-lg bg-gray-50 p-3 space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  Số tiền: {formatCurrencyVND(selectedWithdrawRequest.amount)}
                </p>
                {selectedWithdrawRequest.reason && (
                  <p className="text-xs text-gray-600 line-clamp-2" title={selectedWithdrawRequest.reason}>
                    Lý do: {selectedWithdrawRequest.reason}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveModal(false)
                  setSelectedWithdrawRequest(null)
                }}
                disabled={Boolean(processingRequest)}
                className="min-h-[40px] px-4"
              >
                Hủy
              </Button>
              <Button
                onClick={handleApproveWithdrawRequest}
                disabled={Boolean(processingRequest)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[40px] px-4"
              >
                {processingRequest === selectedWithdrawRequest?.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang duyệt...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Xác nhận duyệt
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Confirmation Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-blue-600">Xác nhận hoàn thành yêu cầu rút tiền</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Bạn có chắc chắn muốn hoàn thành yêu cầu rút tiền này? Yêu cầu sẽ được chuyển sang trạng thái "Đã hoàn thành" và tiền sẽ được chuyển vào tài khoản ngân hàng.
            </p>
            {selectedWithdrawRequest && (
              <div className="rounded-lg bg-gray-50 p-3 space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  Số tiền: {formatCurrencyVND(selectedWithdrawRequest.amount)}
                </p>
                {selectedWithdrawRequest.reason && (
                  <p className="text-xs text-gray-600 line-clamp-2" title={selectedWithdrawRequest.reason}>
                    Lý do: {selectedWithdrawRequest.reason}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompleteModal(false)
                  setSelectedWithdrawRequest(null)
                }}
                disabled={Boolean(processingRequest)}
                className="min-h-[40px] px-4"
              >
                Hủy
              </Button>
              <Button
                onClick={handleCompleteWithdrawRequest}
                disabled={Boolean(processingRequest)}
                className="bg-blue-600 hover:bg-blue-700 text-white min-h-[40px] px-4"
              >
                {processingRequest === selectedWithdrawRequest?.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang hoàn thành...
                  </>
                ) : (
                  <>
                    <CircleCheck className="w-4 h-4 mr-2" />
                    Xác nhận hoàn thành
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-600">Xác nhận từ chối yêu cầu rút tiền</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Bạn có chắc chắn muốn từ chối yêu cầu rút tiền này? Hành động này không thể hoàn tác.
            </p>
            {selectedWithdrawRequest && (
              <div className="rounded-lg bg-gray-50 p-3 space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  Số tiền: {formatCurrencyVND(selectedWithdrawRequest.amount)}
                </p>
                {selectedWithdrawRequest.reason && (
                  <p className="text-xs text-gray-600 line-clamp-2" title={selectedWithdrawRequest.reason}>
                    Lý do: {selectedWithdrawRequest.reason}
                  </p>
                )}
              </div>
            )}
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
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                  setSelectedWithdrawRequest(null)
                }}
                disabled={Boolean(processingRequest)}
                className="min-h-[40px] px-4"
              >
                Hủy
              </Button>
              <Button
                onClick={handleConfirmReject}
                disabled={Boolean(processingRequest)}
                className="bg-red-600 hover:bg-red-700 text-white min-h-[40px] px-4"
              >
                {processingRequest === selectedWithdrawRequest?.id ? (
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

      {/* Withdraw Request Detail Modal */}
      <Dialog open={showWithdrawRequestDetailModal} onOpenChange={setShowWithdrawRequestDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedWithdrawRequest && (
            <>
              <DialogHeader className="pb-4 border-b border-gray-200">
                <DialogTitle className="text-2xl font-semibold text-gray-900">
                  Chi tiết yêu cầu rút tiền
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
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
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Modal */}
      <Dialog
        open={showTransactionDetailModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowTransactionDetailModal(false)
            setSelectedTransactionId(null)
            setTransactionDetail(null)
            setFromWalletDetail(null)
            setToWalletDetail(null)
            setFromUserDetail(null)
            setToUserDetail(null)
            setRelatedAuction(null)
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-200">
            <DialogTitle className="text-2xl font-semibold text-gray-900">
              Chi tiết giao dịch
            </DialogTitle>
            {transactionDetail && (
              <p className="text-sm text-gray-600 mt-1">
                Số tiền: {formatCurrencyVND(transactionDetail.amount)} | 
                {' '}Loại tiền: {transactionDetail.currency}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-6">
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
                      <p className="text-sm text-gray-900 mt-1">
                        {TRANSACTION_TYPE_LABELS[transactionDetail.transactionType] || `Type ${transactionDetail.transactionType}`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Loại thanh toán</Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {PAYMENT_TYPE_LABELS[transactionDetail.paymentType] !== undefined 
                          ? PAYMENT_TYPE_LABELS[transactionDetail.paymentType]
                          : `Type ${transactionDetail.paymentType}`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Escrow ID</Label>
                      <p className="text-xs font-mono text-gray-600 mt-1">
                        {transactionDetail.escrowId !== '00000000-0000-0000-0000-000000000000' 
                          ? transactionDetail.escrowId 
                          : '—'}
                      </p>
                    </div>
                    {transactionDetail.relatedEntityId && (
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-gray-700">Related Entity ID</Label>
                        <p className="text-xs font-mono text-gray-700 mt-1 break-all">
                          {transactionDetail.relatedEntityId}
                        </p>
                      </div>
                    )}
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

                  <div className="pt-2 border-t border-gray-200 mt-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Thông tin người gửi / người nhận
                    </Label>
                    {partyInfoLoading ? (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tải thông tin ví và người dùng...
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Người gửi</p>
                          <p className="font-medium text-gray-900">
                            {fromUserDetail
                              ? `${fromUserDetail.firstName} ${fromUserDetail.lastName}`
                              : fromWalletDetail
                              ? `Wallet ${fromWalletDetail.id}`
                              : transactionDetail.fromWalletId || '—'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Wallet ID:{' '}
                            <span className="font-mono">
                              {fromWalletDetail?.id || transactionDetail.fromWalletId || '—'}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Người nhận</p>
                          <p className="font-medium text-gray-900">
                            {toUserDetail
                              ? `${toUserDetail.firstName} ${toUserDetail.lastName}`
                              : toWalletDetail
                              ? `Wallet ${toWalletDetail.id}`
                              : transactionDetail.toWalletId || '—'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Wallet ID:{' '}
                            <span className="font-mono">
                              {toWalletDetail?.id || transactionDetail.toWalletId || '—'}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hiển thị đối tượng liên quan nếu có relatedEntityId hoặc escrowId (cho type 1, 6) */}
                  {(transactionDetail.relatedEntityId || 
                    ((transactionDetail.transactionType === 1 || transactionDetail.transactionType === 6) && 
                     transactionDetail.escrowId && 
                     transactionDetail.escrowId !== '00000000-0000-0000-0000-000000000000')) && (
                    <div className="pt-2 border-t border-gray-200 mt-2 space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Đối tượng liên quan</Label>
                      
                      {relatedEntityLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang tải thông tin đối tượng liên quan...
                        </div>
                      ) : (
                        <>
                          <div className="text-sm">
                            <p className="text-gray-700">
                              Loại:{' '}
                              <span className="font-medium">
                                {transactionDetail.relatedEntityType || 
                                  (relatedAuction ? 'Auction' : 
                                  (transactionDetail.transactionType === 7 || transactionDetail.transactionType === 8 || transactionDetail.transactionType === 9 
                                    ? 'Auction' 
                                    : transactionDetail.transactionType === 1 || transactionDetail.transactionType === 6
                                    ? 'Auction/BuyRequest'
                                    : '—'))}
                              </span>
                            </p>
                            {(transactionDetail.relatedEntityId && 
                              transactionDetail.relatedEntityId !== '00000000-0000-0000-0000-000000000000') ? (
                              <p className="text-xs text-gray-500 mt-1">
                                Related Entity ID:{' '}
                                <span className="font-mono break-all">
                                  {transactionDetail.relatedEntityId}
                                </span>
                              </p>
                            ) : null}
                            {transactionDetail.escrowId && 
                             transactionDetail.escrowId !== '00000000-0000-0000-0000-000000000000' && (
                              <p className="text-xs text-gray-500 mt-1">
                                Escrow ID:{' '}
                                <span className="font-mono break-all">
                                  {transactionDetail.escrowId}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Hiển thị thông tin chi tiết Auction nếu đã load được */}
                          {relatedAuction && (
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
                              <p className="text-sm font-semibold text-emerald-900">
                                Phiên đấu giá #{relatedAuction.sessionCode}
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                                <div>
                                  <span className="text-gray-500">Giá khởi điểm:</span>{' '}
                                  <span className="font-medium">{formatCurrencyVND(relatedAuction.startingPrice)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Giá hiện tại:</span>{' '}
                                  <span className="font-medium">
                                    {relatedAuction.currentPrice ? formatCurrencyVND(relatedAuction.currentPrice) : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Trạng thái:</span>{' '}
                                  <Badge variant="outline" className="text-xs">
                                    {relatedAuction.status}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-gray-500">Ngày kết thúc:</span>{' '}
                                  <span className="font-medium">
                                    {formatDateTime(relatedAuction.endDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Nút điều hướng - hiển thị nếu đã load được auction hoặc có relatedEntityType là Auction */}
                          {(relatedAuction || 
                            transactionDetail.relatedEntityType === 'Auction' || 
                            transactionDetail.transactionType === 7 || 
                            transactionDetail.transactionType === 8 || 
                            transactionDetail.transactionType === 9 ||
                            (transactionDetail.transactionType === 1 || transactionDetail.transactionType === 6)) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-700 border-emerald-600 hover:bg-emerald-50"
                              onClick={() => {
                                if (!transactionDetail.relatedEntityId) return
                                navigate(`/admin/auctions/${transactionDetail.relatedEntityId}`)
                              }}
                            >
                              Đi tới phiên đấu giá
                            </Button>
                          )}

                          {/* TODO: Thêm case cho BuyRequest khi có API */}
                          {transactionDetail.relatedEntityType === 'BuyRequest' && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm text-gray-700">
                                Yêu cầu mua ID: <span className="font-mono">{transactionDetail.relatedEntityId}</span>
                              </p>
                              {/* TODO: Load và hiển thị chi tiết BuyRequest khi có API */}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {transactionDetail.relatedEntityId &&
                    (transactionDetail.relatedEntityType === 'WithdrawRequest' ||
                      transactionDetail.transactionType === 5) && (
                    <div className="pt-2 border-t border-gray-200 mt-2">
                      <p className="text-sm text-gray-700 mb-2">
                        Giao dịch này liên quan tới một yêu cầu rút tiền. Bạn có thể mở chi tiết để xem đầy đủ thông tin.
                      </p>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => {
                          setShowTransactionDetailModal(false)
                          if (transactionDetail.relatedEntityId) {
                            openWithdrawRequestDetailById(transactionDetail.relatedEntityId)
                          }
                        }}
                      >
                        Xem chi tiết yêu cầu rút tiền
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Không thể tải thông tin giao dịch</p>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
