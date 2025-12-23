import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { disputeApi } from '../../services/api/disputeApi'
import { walletApi } from '../../services/api/walletApi'
import { auctionApi } from '../../services/api/auctionApi'
import { buyRequestApi } from '../../services/api/buyRequestApi'
import type { ApiBuyRequest, ApiDispute, ApiDisputeResolve, ApiEnglishAuction, DisputeStatus } from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { Loader2, ShieldAlert, Search, ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react'
import { formatCurrencyVND } from '../../utils/currency'

const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  0: 'Chờ phản hồi',
  1: 'Hai bên đã đồng ý',
  2: 'Người dùng từ chối',
  3: 'Admin đang xử lý',
  4: 'Đã kết thúc',
}

const DISPUTE_STATUS_COLORS: Record<DisputeStatus, string> = {
  0: 'bg-amber-100 text-amber-800 border-amber-200',
  1: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  2: 'bg-red-100 text-red-700 border-red-200',
  3: 'bg-blue-100 text-blue-800 border-blue-200',
  4: 'bg-slate-100 text-slate-800 border-slate-200',
}

const AUCTION_STATUS_LABELS: Record<string, string> = {
  Draft: 'Bản nháp',
  Pending: 'Chờ duyệt',
  Rejected: 'Đã từ chối',
  Approved: 'Đã duyệt',
  OnGoing: 'Đang diễn ra',
  Pause: 'Tạm dừng',
  Completed: 'Đã hoàn thành',
  NoWinner: 'Không có người thắng',
  Cancelled: 'Đã hủy',
}

const BUY_REQUEST_STATUS_LABELS: Record<string, string> = {
  Pending: 'Đang chờ xử lý',
  Accepted: 'Đã chấp nhận',
  Approved: 'Đã chấp nhận',
  Rejected: 'Đã từ chối',
  Cancelled: 'Đã hủy',
  '0': 'Đang chờ xử lý',
  '1': 'Đã chấp nhận',
  '2': 'Đã từ chối',
  '3': 'Đã hủy',
}

const getDisputeStatusBadge = (status: DisputeStatus) => (
  <Badge variant="outline" className={DISPUTE_STATUS_COLORS[status]}>
    {DISPUTE_STATUS_LABELS[status]}
  </Badge>
)

const getAuctionStatusLabel = (status: string) => AUCTION_STATUS_LABELS[status] ?? status

const getBuyRequestStatusLabel = (status?: string | number) => {
  if (status === undefined || status === null) return '—'
  const key = String(status)
  return BUY_REQUEST_STATUS_LABELS[key] ?? key
}

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatQuantity = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  return `${new Intl.NumberFormat('vi-VN').format(value)} kg`
}

export default function DisputesPage() {
  const { toast } = useToastContext()

  const [disputes, setDisputes] = useState<ApiDispute[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all')
  const [searchValue, setSearchValue] = useState<string>('')
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [pageSize] = useState<number>(10)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [resolveInfoMap, setResolveInfoMap] = useState<Record<string, ApiDisputeResolve>>({})
  const [relatedAuction, setRelatedAuction] = useState<ApiEnglishAuction | null>(null)
  const [relatedBuyRequest, setRelatedBuyRequest] = useState<ApiBuyRequest | null>(null)
  const [auctionMap, setAuctionMap] = useState<Record<string, ApiEnglishAuction>>({})
  const [buyRequestMap, setBuyRequestMap] = useState<Record<string, ApiBuyRequest>>({})

  const [selectedDispute, setSelectedDispute] = useState<ApiDispute | null>(null)
  const [resolveInfo, setResolveInfo] = useState<ApiDisputeResolve | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false)
  const [adminNote, setAdminNote] = useState<string>('')
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [isFinalDecision, setIsFinalDecision] = useState<boolean>(true)
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState<boolean>(false)
  const [disputeToUpdate, setDisputeToUpdate] = useState<ApiDispute | null>(null)
  const [updateStatusNote, setUpdateStatusNote] = useState<string>('')
  const [escrowLoading, setEscrowLoading] = useState<boolean>(false)

  const loadDisputes = useCallback(
    async (page: number, status: DisputeStatus | 'all') => {
      try {
        setLoading(true)
        const res = await disputeApi.getDisputes({
          pageNumber: page,
          pageSize,
          status: status === 'all' ? undefined : status,
        })

        if (res.isSuccess && res.data) {
          // Normalize status cho mỗi dispute để đảm bảo type đúng
          // Backend trả về "distupeStatus" (lỗi chính tả) thay vì "disputeStatus"
          // Backend enum: Pending=0, Approved=1, Rejected=2, InAdminReview=3, Resolved=4
          const statusMap: Record<string, number> = {
            'Pending': 0,
            'Approved': 1,
            'Rejected': 2,
            'InAdminReview': 3,
            'Resolved': 4,
            '0': 0,
            '1': 1,
            '2': 2,
            '3': 3,
            '4': 4,
          }
          
          const normalizedDisputes = res.data.data.map((dispute: any) => {
            // Backend trả về "distupeStatus" thay vì "disputeStatus"
            const rawStatus = dispute.distupeStatus ?? dispute.disputeStatus
            
            let normalizedStatus: number
            if (typeof rawStatus === 'string') {
              // Nếu là string, có thể là enum name hoặc số dạng string
              normalizedStatus = statusMap[rawStatus] ?? Number(rawStatus)
            } else {
              normalizedStatus = rawStatus ?? 0
            }
            
            return {
              ...dispute,
              disputeStatus: normalizedStatus as DisputeStatus,
              // Map thêm các field có thể bị sai chính tả
              isWholesalerCreated: dispute.isWholeSalerCreated ?? dispute.isWholesalerCreated ?? false,
            }
          })
          setDisputes(normalizedDisputes as ApiDispute[])
          setTotalPages(res.data.totalPages)
          setTotalCount(res.data.totalCount)
          
          // Load resolveInfo cho tất cả disputes bằng escrowId (không phân biệt status)
          const resolvePromises = normalizedDisputes.map(async (dispute: any) => {
            try {
              const resolveRes = await disputeApi.getResolveByEscrowId(dispute.escrowId)
              if (resolveRes.isSuccess && resolveRes.data) {
                return { disputeId: dispute.id, resolveInfo: resolveRes.data }
              }
            } catch (error) {
              // Không log error vì có thể escrow chưa có resolve, chỉ log khi cần debug
              // console.error(`Failed to load resolve info for escrow ${dispute.escrowId}`, error)
            }
            return null
          })
          
          const resolveResults = await Promise.all(resolvePromises)
          const newResolveInfoMap: Record<string, ApiDisputeResolve> = {}
          resolveResults.forEach((result) => {
            if (result) {
              newResolveInfoMap[result.disputeId] = result.resolveInfo
            }
          })
          setResolveInfoMap((prev) => ({ ...prev, ...newResolveInfoMap }))

          // Load escrow và related auction/buy request cho mỗi dispute
          const escrowPromises = normalizedDisputes.map(async (dispute: any) => {
            try {
              const escrowRes = await walletApi.getEscrowById(dispute.escrowId)
              if (escrowRes.isSuccess && escrowRes.data) {
                const escrow = escrowRes.data
                const zeroGuid = '00000000-0000-0000-0000-000000000000'
                
                if (escrow.auctionId && escrow.auctionId !== zeroGuid) {
                  try {
                    const auctionRes = await auctionApi.getEnglishAuctionById(escrow.auctionId)
                    if (auctionRes.isSuccess && auctionRes.data) {
                      return { disputeId: dispute.id, type: 'auction' as const, data: auctionRes.data }
                    }
                  } catch (error) {
                    console.error(`Failed to load auction for dispute ${dispute.id}:`, error)
                  }
                } else if (escrow.buyRequestId && escrow.buyRequestId !== zeroGuid) {
                  try {
                    const buyRequestRes = await buyRequestApi.getById(escrow.buyRequestId)
                    if (buyRequestRes.isSuccess && buyRequestRes.data) {
                      return { disputeId: dispute.id, type: 'buyRequest' as const, data: buyRequestRes.data }
                    }
                  } catch (error) {
                    console.error(`Failed to load buy request for dispute ${dispute.id}:`, error)
                  }
                }
              }
            } catch (error) {
              // Escrow có thể không tồn tại, không cần log
            }
            return null
          })

          const escrowResults = await Promise.all(escrowPromises)
          const newAuctionMap: Record<string, ApiEnglishAuction> = {}
          const newBuyRequestMap: Record<string, ApiBuyRequest> = {}
          
          escrowResults.forEach((result) => {
            if (result) {
              if (result.type === 'auction') {
                newAuctionMap[result.disputeId] = result.data as ApiEnglishAuction
              } else if (result.type === 'buyRequest') {
                newBuyRequestMap[result.disputeId] = result.data as ApiBuyRequest
              }
            }
          })
          
          setAuctionMap((prev) => ({ ...prev, ...newAuctionMap }))
          setBuyRequestMap((prev) => ({ ...prev, ...newBuyRequestMap }))
        } else {
          toast({
            title: TOAST_TITLES.ERROR,
            description: res.message || 'Không thể tải danh sách tranh chấp',
            variant: 'destructive',
          })
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải danh sách tranh chấp'
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [pageSize, toast]
  )

  useEffect(() => {
    loadDisputes(pageNumber, statusFilter)
  }, [loadDisputes, pageNumber, statusFilter])

  const filteredDisputes = useMemo(() => {
    let items = disputes
    if (searchValue) {
      const q = searchValue.toLowerCase()
      items = items.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.escrowId.toLowerCase().includes(q) ||
          (d.disputeMessage || '').toLowerCase().includes(q)
      )
    }
    return items
  }, [disputes, searchValue])

  const loadEscrowAndRelated = useCallback(
    async (escrowId: string) => {
      if (!escrowId) return
      setEscrowLoading(true)
      setRelatedAuction(null)
      setRelatedBuyRequest(null)

      try {
        const escrowRes = await walletApi.getEscrowById(escrowId)
        if (escrowRes.isSuccess && escrowRes.data) {
          const detail = escrowRes.data

          const zeroGuid = '00000000-0000-0000-0000-000000000000'
          if (detail.auctionId && detail.auctionId !== zeroGuid) {
            const auctionRes = await auctionApi.getEnglishAuctionById(detail.auctionId)
            if (auctionRes.isSuccess && auctionRes.data) {
              setRelatedAuction(auctionRes.data)
            }
          } else if (detail.buyRequestId && detail.buyRequestId !== zeroGuid) {
            const buyRequestRes = await buyRequestApi.getById(detail.buyRequestId)
            if (buyRequestRes.isSuccess && buyRequestRes.data) {
              setRelatedBuyRequest(buyRequestRes.data)
            }
          }
        } else {
          toast({
            title: TOAST_TITLES.ERROR,
            description: escrowRes.message || 'Không thể tải thông tin escrow',
            variant: 'destructive',
          })
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải thông tin escrow'
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      } finally {
        setEscrowLoading(false)
      }
    },
    [toast]
  )

  const handleOpenDetail = async (dispute: ApiDispute) => {
    // Normalize status để đảm bảo so sánh đúng
    const normalizedDispute = {
      ...dispute,
      disputeStatus: typeof dispute.disputeStatus === 'string' 
        ? Number(dispute.disputeStatus) 
        : dispute.disputeStatus
    } as ApiDispute
    
    setSelectedDispute(normalizedDispute)
    setResolveInfo(null)
    setRelatedAuction(null)
    setRelatedBuyRequest(null)
    setAdminNote('')
    setRefundAmount('')
    setIsFinalDecision(true)
    setShowDetailModal(true)
    loadEscrowAndRelated(normalizedDispute.escrowId)

    // Load resolveInfo cho tất cả status nếu có (không chỉ status = 4)
    try {
      setDetailLoading(true)
      const res = await disputeApi.getResolveByEscrowId(normalizedDispute.escrowId)
      if (res.isSuccess && res.data) {
        const resolveData = res.data
        setResolveInfo(resolveData)
        setAdminNote(resolveData.adminNote || '')
        setRefundAmount(resolveData.refundAmount.toString())
        // Cập nhật resolveInfoMap
        setResolveInfoMap((prev) => ({
          ...prev,
          [normalizedDispute.id]: resolveData,
        }))
      }
    } catch (error) {
      // Không toast quá ồn, chỉ log khi cần debug
      // Có thể escrow chưa có resolve, đây là trường hợp bình thường
      // console.error('Failed to load dispute resolve info', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleStartAdminReview = async () => {
    if (!selectedDispute) return
    try {
      setActionLoading(true)
      const res = await disputeApi.updateDisputeStatus(selectedDispute.id, {
        status: 3, // InAdminReview
        adminNote: adminNote || 'Bắt đầu xem xét tranh chấp',
      })
      if (res.isSuccess && res.data) {
        // Normalize response để đảm bảo status đúng
        const updatedDispute = res.data as any
        const normalizedStatus = typeof updatedDispute.distupeStatus !== 'undefined' 
          ? Number(updatedDispute.distupeStatus)
          : typeof updatedDispute.disputeStatus !== 'undefined'
          ? Number(updatedDispute.disputeStatus)
          : 3 // Fallback về 3 nếu không có
        
        const normalizedDispute: ApiDispute = {
          ...updatedDispute,
          disputeStatus: normalizedStatus as DisputeStatus,
          isWholesalerCreated: updatedDispute.isWholeSalerCreated ?? updatedDispute.isWholesalerCreated ?? false,
        }
        
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Đã chuyển tranh chấp sang trạng thái admin đang xử lý',
        })
        setSelectedDispute(normalizedDispute)
        await loadDisputes(pageNumber, statusFilter)
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể cập nhật trạng thái tranh chấp',
          variant: 'destructive',
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật trạng thái tranh chấp'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenUpdateStatusModal = (dispute: ApiDispute) => {
    setDisputeToUpdate(dispute)
    setUpdateStatusNote('')
    setShowUpdateStatusModal(true)
  }

  const handleUpdateToInAdminReview = async (dispute?: ApiDispute, note?: string) => {
    const disputeToUse = dispute || disputeToUpdate
    if (!disputeToUse) return
    
    // Đảm bảo dispute đang ở trạng thái Approved (1)
    const currentStatus = Number(disputeToUse.disputeStatus)
    if (currentStatus !== 1) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: 'Chỉ có thể chuyển trạng thái từ "Hai bên đã đồng ý" sang "Admin đang xử lý"',
        variant: 'destructive',
      })
      return
    }
    
    const noteToUse = note || updateStatusNote || adminNote || 'Chuyển sang trạng thái admin đang xem xét'
    if (!noteToUse.trim()) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: 'Vui lòng nhập ghi chú trước khi cập nhật trạng thái',
        variant: 'destructive',
      })
      return
    }

    try {
      setActionLoading(true)
      // Chuyển từ status 1 (Approved - Hai bên đã đồng ý) sang status 3 (InAdminReview - Admin đang xử lý)
      console.log('Updating dispute status:', {
        disputeId: disputeToUse.id,
        currentStatus: disputeToUse.disputeStatus,
        newStatus: 3,
        note: noteToUse
      })
      
      const statusRes = await disputeApi.updateDisputeStatus(disputeToUse.id, {
        status: 3, // InAdminReview - Admin đang xử lý
        adminNote: noteToUse,
      })
      
      console.log('Update status response:', statusRes)
      
      if (statusRes.isSuccess && statusRes.data) {
        // Normalize response để đảm bảo status đúng
        const updatedDispute = statusRes.data as any
        console.log('Raw response data:', updatedDispute)
        console.log('distupeStatus:', updatedDispute.distupeStatus)
        console.log('disputeStatus:', updatedDispute.disputeStatus)
        
        const normalizedStatus = typeof updatedDispute.distupeStatus !== 'undefined' 
          ? Number(updatedDispute.distupeStatus)
          : typeof updatedDispute.disputeStatus !== 'undefined'
          ? Number(updatedDispute.disputeStatus)
          : 3 // Fallback về 3 nếu không có
        
        console.log('Normalized status:', normalizedStatus)
        
        const normalizedDispute: ApiDispute = {
          ...updatedDispute,
          disputeStatus: normalizedStatus as DisputeStatus,
          isWholesalerCreated: updatedDispute.isWholeSalerCreated ?? updatedDispute.isWholesalerCreated ?? false,
        }
        
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Đã cập nhật trạng thái từ "Hai bên đã đồng ý" sang "Admin đang xử lý"',
        })
        // Nếu đang xem chi tiết dispute này, cập nhật selectedDispute
        if (selectedDispute?.id === disputeToUse.id) {
          setSelectedDispute(normalizedDispute)
        }
        setShowUpdateStatusModal(false)
        setDisputeToUpdate(null)
        setUpdateStatusNote('')
        // Reload danh sách để đảm bảo status mới được hiển thị
        await loadDisputes(pageNumber, statusFilter)
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: statusRes.message || 'Không thể cập nhật trạng thái tranh chấp',
          variant: 'destructive',
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật trạng thái tranh chấp'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateToResolved = async (dispute?: ApiDispute, note?: string) => {
    const disputeToUse = dispute || disputeToUpdate || selectedDispute
    if (!disputeToUse) return
    
    // Đảm bảo dispute đang ở trạng thái Approved (1) và đã có resolveInfo
    const currentStatus = Number(disputeToUse.disputeStatus)
    if (currentStatus !== 1) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: 'Chỉ có thể chuyển trạng thái từ "Hai bên đã đồng ý" sang "Đã kết thúc"',
        variant: 'destructive',
      })
      return
    }
    
    // Kiểm tra resolveInfo
    const currentResolveInfo = resolveInfo || resolveInfoMap[disputeToUse.id]
    if (!currentResolveInfo) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: 'Chưa có thông tin giải quyết tranh chấp. Vui lòng tạo giải quyết trước.',
        variant: 'destructive',
      })
      return
    }
    
    const noteToUse = note || updateStatusNote || adminNote || 'Kết thúc tranh chấp'
    if (!noteToUse.trim()) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: 'Vui lòng nhập ghi chú trước khi cập nhật trạng thái',
        variant: 'destructive',
      })
      return
    }

    try {
      setActionLoading(true)
      // Chuyển từ status 1 (Approved - Hai bên đã đồng ý) sang status 4 (Resolved - Đã kết thúc)
      const statusRes = await disputeApi.updateDisputeStatus(disputeToUse.id, {
        status: 4, // Resolved - Đã kết thúc
        adminNote: noteToUse,
      })
      
      if (statusRes.isSuccess && statusRes.data) {
        // Normalize response để đảm bảo status đúng
        const updatedDispute = statusRes.data as any
        const normalizedStatus = typeof updatedDispute.distupeStatus !== 'undefined' 
          ? Number(updatedDispute.distupeStatus)
          : typeof updatedDispute.disputeStatus !== 'undefined'
          ? Number(updatedDispute.disputeStatus)
          : 4 // Fallback về 4 nếu không có
        
        const normalizedDispute: ApiDispute = {
          ...updatedDispute,
          disputeStatus: normalizedStatus as DisputeStatus,
          isWholesalerCreated: updatedDispute.isWholeSalerCreated ?? updatedDispute.isWholesalerCreated ?? false,
        }
        
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Đã cập nhật trạng thái từ "Hai bên đã đồng ý" sang "Đã kết thúc"',
        })
        // Nếu đang xem chi tiết dispute này, cập nhật selectedDispute
        if (selectedDispute?.id === disputeToUse.id) {
          setSelectedDispute(normalizedDispute)
        }
        setShowUpdateStatusModal(false)
        setDisputeToUpdate(null)
        setUpdateStatusNote('')
        // Reload danh sách để đảm bảo status mới được hiển thị
        await loadDisputes(pageNumber, statusFilter)
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: statusRes.message || 'Không thể cập nhật trạng thái tranh chấp',
          variant: 'destructive',
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật trạng thái tranh chấp'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateResolve = async () => {
    if (!selectedDispute) return
    const refund = Number(refundAmount || '0')
    if (Number.isNaN(refund) || refund < 0) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: 'Số tiền hoàn phải là số không âm',
        variant: 'destructive',
      })
      return
    }
    
    if (!adminNote.trim()) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: 'Vui lòng nhập ghi chú quyết định của admin',
        variant: 'destructive',
      })
      return
    }

    try {
      setActionLoading(true)

      // Tạo resolve
      const resolveRes = await disputeApi.createDisputeResolve({
        escrowId: selectedDispute.escrowId,
        refundAmount: refund,
        isFinalDecision,
        adminNote,
      })

      if (resolveRes.isSuccess && resolveRes.data) {
        const resolveData = resolveRes.data
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Đã tạo bản ghi giải quyết tranh chấp thành công',
        })
        setResolveInfo(resolveData)
        // Cập nhật resolveInfoMap
        setResolveInfoMap((prev) => ({
          ...prev,
          [selectedDispute.id]: resolveData,
        }))
        await loadDisputes(pageNumber, statusFilter)
      } else {
        // Hiển thị thông báo lỗi chi tiết từ API
        const errorMessage = resolveRes.message || 'Không thể tạo bản ghi giải quyết tranh chấp'
        let displayMessage = errorMessage
        
        // Xử lý các loại lỗi phổ biến
        if (errorMessage.includes('exceed') || errorMessage.includes('vượt quá')) {
          // Extract số tiền tối đa từ message nếu có
          const maxAmountMatch = errorMessage.match(/\((\d+)\)/)
          const maxAmount = maxAmountMatch ? Number(maxAmountMatch[1]) : null
          displayMessage = `Số tiền hoàn (${formatCurrencyVND(refund)}) không được vượt quá tổng số tiền escrow${maxAmount ? ` (${formatCurrencyVND(maxAmount)})` : ''}. Vui lòng nhập lại số tiền hoàn.`
        } else if (errorMessage.includes('auction')) {
          displayMessage = 'Escrow này không có liên kết với auction. Vui lòng kiểm tra lại thông tin escrow.'
        }
        
        toast({
          title: TOAST_TITLES.ERROR,
          description: displayMessage,
          variant: 'destructive',
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo bản ghi giải quyết tranh chấp'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }


  const canStartAdminReview = selectedDispute && Number(selectedDispute.disputeStatus) === 2
  // Có thể update status từ Approved (1) lên InAdminReview (3) nếu chưa có resolveInfo
  // Status 1 = "Hai bên đã đồng ý" (Approved) -> chuyển sang status 3 = "Admin đang xử lý" (InAdminReview)
  const canUpdateToInAdminReview = selectedDispute && Number(selectedDispute.disputeStatus) === 1 && !resolveInfo
  // Có thể update status từ Approved (1) lên Resolved (4) nếu đã có resolveInfo
  const canUpdateToResolved = selectedDispute && Number(selectedDispute.disputeStatus) === 1 && !!resolveInfo
  // Có thể tạo resolve nếu chưa có resolve info và dispute ở trạng thái InAdminReview (3)
  const canCreateResolve = selectedDispute && !resolveInfo && Number(selectedDispute.disputeStatus) === 3
  // Kiểm tra nếu dispute đã kết thúc (status = 4)
  const isResolved = selectedDispute && Number(selectedDispute.disputeStatus) === 4
  // Kiểm tra nếu dispute đang ở trạng thái Admin đang xem xét (status = 3)
  const isInAdminReview = selectedDispute && Number(selectedDispute.disputeStatus) === 3

  const handlePageChange = (next: number) => {
    if (next < 1 || next > totalPages || next === pageNumber) return
    setPageNumber(next)
  }

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý tranh chấp</h1>
        <p className="text-gray-600">
          Theo dõi và xử lý các tranh chấp giữa Nông dân và Thương lái liên quan.
        </p>
      </div>

      <Card className="mb-6">
        <div className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-600" />
                Danh sách tranh chấp
              </h2>
              <p className="text-sm text-gray-600">
                {loading ? 'Đang tải...' : `Tổng ${totalCount} tranh chấp`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Tìm theo ID, Mã giao dịch, nội dung..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as DisputeStatus)
                }
                className="w-full sm:w-[220px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value={0}>Chờ phản hồi</option>
                <option value={1}>Hai bên đã đồng ý</option>
                <option value={2}>Người dùng từ chối</option>
                <option value={3}>Admin đang xử lý</option>
                <option value={4}>Đã kết thúc</option>
              </select>
              <Button
                variant="outline"
                onClick={() => loadDisputes(pageNumber, statusFilter)}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-emerald-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Đang tải danh sách tranh chấp...</p>
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-1">Chưa có tranh chấp nào phù hợp bộ lọc</p>
              <p className="text-sm text-gray-500">
                Khi có tranh chấp mới, chúng sẽ xuất hiện tại đây để bạn xử lý.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <SimpleTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[18%]">ID</TableHead>
                      <TableHead className="w-[16%] text-right">Số tiền tranh chấp mong muốn</TableHead>
                      <TableHead className="w-[14%]">Trạng thái</TableHead>
                      <TableHead className="w-[18%]">Thời gian tạo / cập nhật</TableHead>
                      <TableHead className="w-[18%] text-center">Cập nhật trạng thái</TableHead>
                      <TableHead className="w-[16%] text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDisputes.map((dispute) => {
                      // Normalize status để đảm bảo so sánh đúng
                      // Backend enum: Pending=0, Approved=1, Rejected=2, InAdminReview=3, Resolved=4
                      const statusMap: Record<string, number> = {
                        'Pending': 0,
                        'Approved': 1,
                        'Rejected': 2,
                        'InAdminReview': 3,
                        'Resolved': 4,
                      }
                      
                      let normalizedStatus: number
                      if (typeof dispute.disputeStatus === 'string') {
                        normalizedStatus = statusMap[dispute.disputeStatus] ?? Number(dispute.disputeStatus)
                      } else {
                        normalizedStatus = dispute.disputeStatus
                      }
                      
                      const isApproved = normalizedStatus === 1 // Approved = 1
                      const hasResolveInfo = !!resolveInfoMap[dispute.id]
                      const relatedAuction = auctionMap[dispute.id]
                      const relatedBuyRequest = buyRequestMap[dispute.id]
                      
                      // Format ID: AUC-... hoặc BR-...
                      let displayId = ''
                      if (relatedAuction) {
                        const sessionCode = relatedAuction.sessionCode || relatedAuction.id
                        displayId = sessionCode.startsWith('AUC-') ? sessionCode : `AUC-${sessionCode}`
                      } else if (relatedBuyRequest) {
                        const requestCode = relatedBuyRequest.requestCode || relatedBuyRequest.id
                        const codeUpper = requestCode.toUpperCase()
                        // Nếu code đã có tiền tố BR/BRQ thì giữ nguyên, không thêm BR-
                        displayId = codeUpper.startsWith('BR') ? requestCode : `BR-${requestCode}`
                      } else {
                        // Đang tải, hiển thị escrow ID tạm thời
                        displayId = dispute.escrowId.slice(0, 8) + '...'
                      }
                      
                      return (
                      <TableRow key={dispute.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-gray-700 truncate max-w-[220px]">
                              {displayId}
                            </span>
                            {dispute.disputeMessage && (
                              <span className="text-xs text-gray-500 truncate max-w-[220px] mt-1">
                                {dispute.disputeMessage}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-gray-900">
                            {resolveInfoMap[dispute.id]?.refundAmount 
                              ? formatCurrencyVND(resolveInfoMap[dispute.id].refundAmount)
                              : '—'}
                          </span>
                        </TableCell>
                        <TableCell>{getDisputeStatusBadge(dispute.disputeStatus)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs text-gray-600">
                            <span>Tạo: {formatDateTime(dispute.createdAt)}</span>
                            <span>Cập nhật: {formatDateTime(dispute.updatedAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {isApproved ? (
                            hasResolveInfo ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenUpdateStatusModal(dispute)}
                                disabled={actionLoading}
                                className="text-xs border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                              >
                                Kết thúc tranh chấp
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenUpdateStatusModal(dispute)}
                                disabled={actionLoading}
                                className="text-xs border-purple-600 text-purple-600 hover:bg-purple-50"
                              >
                                Chuyển sang Admin xem xét
                              </Button>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetail(dispute)}
                              className="text-xs"
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              Chi tiết
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </SimpleTable>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <div>
                  Trang {pageNumber}/{totalPages} · {totalCount} tranh chấp
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pageNumber - 1)}
                    disabled={pageNumber <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1.5" />
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pageNumber + 1)}
                    disabled={pageNumber >= totalPages}
                  >
                    Sau
                    <ChevronRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      <Dialog
        open={showDetailModal}
        onOpenChange={(open) => {
          setShowDetailModal(open)
          if (!open) {
            setSelectedDispute(null)
            setResolveInfo(null)
            setRelatedAuction(null)
            setRelatedBuyRequest(null)
            setAdminNote('')
            setRefundAmount('')
            setIsFinalDecision(true)
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDispute && (
            <>
              <DialogHeader>
                <DialogTitle>Chi tiết tranh chấp</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Trạng thái</Label>
                    <div className="mt-1">{getDisputeStatusBadge(selectedDispute.disputeStatus)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Sản lượng (kg)</Label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {formatQuantity(selectedDispute.actualAmount)}
                    </p>
                  </div>
                  {resolveInfo && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Số tiền tranh chấp mong muốn</Label>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {formatCurrencyVND(resolveInfo.refundAmount)}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Thời gian tạo</Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDateTime(selectedDispute.createdAt)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Thời gian cập nhật</Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDateTime(selectedDispute.updatedAt)}
                    </p>
                  </div>
                  {selectedDispute.resolvedAt && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Thời gian kết thúc</Label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDateTime(selectedDispute.resolvedAt)}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Nội dung tranh chấp</Label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                    {selectedDispute.disputeMessage || '—'}
                  </p>
                </div>

                {selectedDispute.attachments && selectedDispute.attachments.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Hình ảnh đính kèm</Label>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {selectedDispute.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block group"
                        >
                          <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group-hover:border-emerald-500 transition-colors">
                            <img
                              src={att.url}
                              alt="Dispute attachment"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500 truncate">
                            {att.id}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {(escrowLoading || relatedAuction || relatedBuyRequest) && (
                  <div className="pt-2 border-t border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700">
                        Thông tin phiên đấu giá / yêu cầu mua
                      </Label>
                      {escrowLoading && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang tải dữ liệu liên quan...
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {relatedAuction && (
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 shadow-sm">
                          <p className="text-sm font-semibold text-emerald-900 mb-2">Phiên đấu giá</p>
                          <div className="space-y-1 text-sm text-emerald-900">
                            <div className="flex justify-between gap-2">
                              <span className="text-emerald-800">Mã phiên:</span>
                              <span className="font-mono text-xs">{relatedAuction.sessionCode}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-emerald-800">Giá khởi điểm:</span>
                              <span className="font-semibold">{formatCurrencyVND(relatedAuction.startingPrice)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-emerald-800">Giá hiện tại:</span>
                              <span className="font-semibold">
                                {relatedAuction.currentPrice ? formatCurrencyVND(relatedAuction.currentPrice) : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-emerald-800">Giá thắng:</span>
                              <span className="font-semibold">
                                {relatedAuction.winningPrice ? formatCurrencyVND(relatedAuction.winningPrice) : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-emerald-800">Trạng thái:</span>
                              <span className="font-semibold">
                                {getAuctionStatusLabel(relatedAuction.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {relatedBuyRequest && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 shadow-sm">
                          <p className="text-sm font-semibold text-blue-900 mb-2">Yêu cầu mua hàng</p>
                          <div className="space-y-1 text-sm text-blue-900">
                            <div className="flex justify-between gap-2">
                              <span className="text-blue-800">Mã yêu cầu:</span>
                              <span className="font-mono text-xs">{relatedBuyRequest.requestCode || relatedBuyRequest.id}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-blue-800">Giá kỳ vọng:</span>
                              <span className="font-semibold">
                                {relatedBuyRequest.expectedPrice
                                  ? formatCurrencyVND(relatedBuyRequest.expectedPrice)
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-blue-800">Sản lượng mong muốn:</span>
                              <span className="font-semibold">
                                {relatedBuyRequest.totalQuantity
                                  ? `${relatedBuyRequest.totalQuantity.toLocaleString('vi-VN')} kg`
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-blue-800">Trạng thái:</span>
                              <span className="font-semibold">
                                {getBuyRequestStatusLabel(relatedBuyRequest.status)}
                              </span>
                            </div>
                            {relatedBuyRequest.message && (
                              <div className="pt-1 text-xs text-blue-800">
                                <span className="font-medium">Ghi chú:</span>{' '}
                                <span className="text-blue-900">{relatedBuyRequest.message}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200 space-y-4">
                  {detailLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải thông tin giải quyết...
                    </div>
                  )}
                  
                  {isResolved && resolveInfo ? (
                    // Khi đã kết thúc, chỉ hiển thị thông tin resolve
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <p className="font-semibold text-sm text-emerald-900 mb-3">Thông tin giải quyết tranh chấp</p>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Số tiền hoàn: </span>
                          <span className="text-gray-900">{formatCurrencyVND(resolveInfo.refundAmount)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Ghi chú của admin: </span>
                          <p className="text-gray-900 mt-1 whitespace-pre-line">{resolveInfo.adminNote || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Quyết định cuối cùng: </span>
                          <span className="text-gray-900">{resolveInfo.isFinalDecision ? 'Có' : 'Không'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Ngày tạo: </span>
                          <span className="text-gray-900">{formatDateTime(resolveInfo.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ) : isInAdminReview ? (
                    // Chỉ hiển thị form nhập khi đang ở trạng thái Admin đang xem xét (status = 3)
                    <>
                      <div>
                        <Label htmlFor="adminNote" className="text-sm font-medium text-gray-700">
                          Ghi chú của admin
                        </Label>
                        <Textarea
                          id="adminNote"
                          rows={4}
                          placeholder="Ghi lại nhận định, quyết định xử lý tranh chấp..."
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          className="mt-1"
                          disabled={detailLoading}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="refundAmount" className="text-sm font-medium text-gray-700">
                            Số tiền hoàn (VND)
                          </Label>
                          <Input
                            id="refundAmount"
                            type="number"
                            min={0}
                            step={1000}
                            placeholder="Nhập số tiền hoàn..."
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            Quyết định cuối cùng
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="checkbox"
                              id="isFinalDecision"
                              checked={isFinalDecision}
                              onChange={(e) => setIsFinalDecision(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <Label htmlFor="isFinalDecision" className="text-sm text-gray-700 cursor-pointer">
                              Đây là quyết định cuối cùng
                            </Label>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Đánh dấu nếu đây là quyết định cuối cùng của admin.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : resolveInfo ? (
                    // Nếu có resolveInfo nhưng không phải status 3 hoặc 4, vẫn hiển thị thông tin
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="font-semibold text-sm text-blue-900 mb-3">Thông tin giải quyết tranh chấp</p>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Số tiền hoàn: </span>
                          <span className="text-gray-900">{formatCurrencyVND(resolveInfo.refundAmount)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Ghi chú của admin: </span>
                          <p className="text-gray-900 mt-1 whitespace-pre-line">{resolveInfo.adminNote || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Quyết định cuối cùng: </span>
                          <span className="text-gray-900">{resolveInfo.isFinalDecision ? 'Có' : 'Không'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Ngày tạo: </span>
                          <span className="text-gray-900">{formatDateTime(resolveInfo.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    <p>- Rejected → InAdminReview → Resolved (không được lùi trạng thái)</p>
                    <p>- Approved / Resolved là trạng thái cuối cùng, không chỉnh sửa lại.</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDetailModal(false)}
                      disabled={actionLoading}
                    >
                      Đóng
                    </Button>
                    {canStartAdminReview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleStartAdminReview}
                        disabled={actionLoading}
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        {actionLoading ? 'Đang cập nhật...' : 'Bắt đầu xem xét'}
                      </Button>
                    )}
                    {canUpdateToInAdminReview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenUpdateStatusModal(selectedDispute!)}
                        disabled={actionLoading}
                        className="border-purple-600 text-purple-600 hover:bg-purple-50"
                      >
                        Chuyển sang Admin xem xét
                      </Button>
                    )}
                    {canUpdateToResolved && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenUpdateStatusModal(selectedDispute!)}
                        disabled={actionLoading}
                        className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                      >
                        Kết thúc tranh chấp
                      </Button>
                    )}
                    {canCreateResolve && (
                      <Button
                        type="button"
                        onClick={handleCreateResolve}
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Đang tạo...' : 'Tạo giải quyết tranh chấp'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog
        open={showUpdateStatusModal}
        onOpenChange={(open) => {
          setShowUpdateStatusModal(open)
          if (!open) {
            setDisputeToUpdate(null)
            setUpdateStatusNote('')
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Cập nhật trạng thái tranh chấp
            </DialogTitle>
            <p className="mt-1 text-sm text-gray-600">
              {disputeToUpdate && resolveInfoMap[disputeToUpdate.id]
                ? 'Chuyển từ "Hai bên đã đồng ý" sang "Đã kết thúc"'
                : 'Chuyển từ "Hai bên đã đồng ý" sang "Admin đang xử lý"'}
            </p>
          </DialogHeader>

          {disputeToUpdate && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="updateStatusNote" className="text-sm font-medium text-gray-700">
                  Ghi chú <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="updateStatusNote"
                  rows={4}
                  placeholder="Nhập ghi chú về việc chuyển trạng thái..."
                  value={updateStatusNote}
                  onChange={(e) => setUpdateStatusNote(e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Ghi chú này sẽ được lưu lại trong lịch sử cập nhật trạng thái.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUpdateStatusModal(false)
                    setDisputeToUpdate(null)
                    setUpdateStatusNote('')
                  }}
                  disabled={actionLoading}
                >
                  Hủy
                </Button>
                <Button
                  onClick={() => {
                    const hasResolveInfo = !!resolveInfoMap[disputeToUpdate.id]
                    if (hasResolveInfo) {
                      handleUpdateToResolved()
                    } else {
                      handleUpdateToInAdminReview()
                    }
                  }}
                  disabled={actionLoading || !updateStatusNote.trim()}
                  className={
                    resolveInfoMap[disputeToUpdate.id]
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }
                >
                  {actionLoading
                    ? 'Đang cập nhật...'
                    : resolveInfoMap[disputeToUpdate.id]
                      ? 'Kết thúc tranh chấp'
                      : 'Cập nhật trạng thái'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


