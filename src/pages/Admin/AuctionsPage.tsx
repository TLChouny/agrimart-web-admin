import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { AuctionActionDialog } from '../../components/auction/auction-action-dialog'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import type { ApiEnglishAuction, AuctionStatus, APIResponse, PaginatedEnglishAuctions } from '../../types/api'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants'
import { useToastContext } from '../../contexts/ToastContext'
import { AUCTION_MESSAGES, TOAST_TITLES } from '../../services/constants/messages'
import { Search, Filter, ChevronDown, PauseCircle, PlayCircle } from 'lucide-react'

interface ExtendedAuction extends ApiEnglishAuction {
  farmName: string
  farmId?: string
  uiStatus: AuctionStatus
  verified: boolean
}

interface DialogState {
  isOpen: boolean
  auctionId: string | null
  actionType: 'approve' | 'reject' | 'pending' | 'stop' | 'cancel' | 'pause' | 'resume' | null
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(status: AuctionStatus) {
  switch (status) {
    case 'Draft':
      return <Badge variant="outline" className="text-gray-600 border-gray-600">Bản nháp</Badge>
    case 'Pending':
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Đợi xét duyệt</Badge>
    case 'Rejected':
      return <Badge variant="outline" className="text-red-600 border-red-600">Bị từ chối</Badge>
    case 'Approved':
      return <Badge variant="outline" className="text-green-600 border-green-600">Chấp nhận</Badge>
    case 'OnGoing':
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Đang diễn ra</Badge>
    case 'Pause':
      return <Badge variant="outline" className="text-amber-600 border-amber-600">Đang tạm dừng</Badge>
    case 'Completed':
      return <Badge variant="outline" className="text-gray-600 border-gray-600">Hoàn thành</Badge>
    case 'NoWinner':
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Không người chiến thắng</Badge>
    case 'Cancelled':
      return <Badge variant="outline" className="text-rose-600 border-rose-600">Hủy</Badge>
    default:
      return <Badge variant="outline" className="text-gray-600 border-gray-600">Không xác định</Badge>
  }
}

export default function AuctionsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<'all' | AuctionStatus>('all')
  const [auctions, setAuctions] = useState<ExtendedAuction[]>([])
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToastContext()
  const [pauseReason, setPauseReason] = useState('')
  const [resumeExtendMinute, setResumeExtendMinute] = useState('0')

  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    auctionId: null,
    actionType: null,
  })
  const [statusCounts, setStatusCounts] = useState<Record<'all' | AuctionStatus, number>>({
    all: 0,
    Draft: 0,
    Pending: 0,
    Rejected: 0,
    Approved: 0,
    OnGoing: 0,
    Pause: 0,
    Completed: 0,
    NoWinner: 0,
    Cancelled: 0,
  })

  const fetchAuctions = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsLoading(true)
    try {
      let allMappedAuctions: ExtendedAuction[] = []
      let totalCountValue = 0
      let totalPagesValue = 0

      const farmRes = await farmApi.getFarms()
      if (!farmRes.isSuccess || !farmRes.data) {
        throw new Error('Không thể tải danh sách nông trại')
      }
      const farmsData = farmRes.data

      if (statusFilter === 'all') {
        // Khi xem "Tất cả", fetch tất cả các status (trừ Draft) và merge lại
        const statusesToFetch: AuctionStatus[] = [
          'Pending',
          'Approved',
          'Rejected',
          'OnGoing',
          'Pause',
          'Completed',
          'NoWinner',
          'Cancelled',
        ]
        const allResults = await Promise.all(
          statusesToFetch.map(status =>
            auctionApi.getEnglishAuctions(status, 1, 1000) as Promise<APIResponse<PaginatedEnglishAuctions>>
          )
        )

        allMappedAuctions = []
        allResults.forEach((res) => {
          if (res.isSuccess && res.data) {
            const mapped = res.data.items.map((a) => {
              const farm = farmsData.find((f) => f.userId === a.farmerId)
              return {
                ...a,
                farmName: farm ? farm.name : 'Unknown',
                farmId: farm ? farm.id : undefined,
                uiStatus: a.status as AuctionStatus,
                verified: false,
              }
            })
            allMappedAuctions.push(...mapped)
            totalCountValue += res.data.totalCount
          }
        })

        // Phân trang ở client-side
        const startIndex = (pageNumber - 1) * pageSize
        const endIndex = startIndex + pageSize
        const paginatedAuctions = allMappedAuctions.slice(startIndex, endIndex)
        totalPagesValue = Math.ceil(allMappedAuctions.length / pageSize)

        setAuctions(paginatedAuctions)
        setTotalPages(totalPagesValue)
        setTotalCount(totalCountValue)
      } else {
        // Khi filter theo status cụ thể, dùng pagination từ API
        const auctionRes = (await auctionApi.getEnglishAuctions(
          statusFilter,
          pageNumber,
          pageSize,
        )) as APIResponse<PaginatedEnglishAuctions>

        if (auctionRes.isSuccess && auctionRes.data) {
          const mappedAuctions: ExtendedAuction[] = auctionRes.data.items.map((a) => {
            const farm = farmsData.find((f) => f.userId === a.farmerId)
            return {
              ...a,
              farmName: farm ? farm.name : 'Unknown',
              farmId: farm ? farm.id : undefined,
              uiStatus: a.status as AuctionStatus,
              verified: false,
            }
          })

          setAuctions(mappedAuctions)
          setTotalPages(auctionRes.data.totalPages)
          setTotalCount(auctionRes.data.totalCount)
        } else {
          const message = auctionRes.message || AUCTION_MESSAGES.FETCH_ERROR
          toast({
            title: TOAST_TITLES.ERROR,
            description: message,
            variant: 'destructive',
          })
          return
        }
      }

      if (!silent) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: AUCTION_MESSAGES.FETCH_SUCCESS,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : AUCTION_MESSAGES.FETCH_ERROR
      console.error('Error fetching auctions:', err)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [pageNumber, pageSize, statusFilter, toast])

  useEffect(() => {
    fetchAuctions({ silent: true })
  }, [fetchAuctions])

  const fetchStatusCounts = useCallback(async () => {
    const statusKeys: Array<'all' | AuctionStatus> = [
      'all',
      'Pending',
      'Approved',
      'Rejected',
      'OnGoing',
      'Pause',
      'Completed',
      'Draft',
      'NoWinner',
      'Cancelled',
    ]
    try {
      const entries = await Promise.all(
        statusKeys.map(async (key) => {
          const res = await auctionApi.getEnglishAuctions(key === 'all' ? undefined : key, 1, 1) as APIResponse<PaginatedEnglishAuctions>
          const data = res.data as PaginatedEnglishAuctions | undefined
          const count = res.isSuccess && data ? data.totalCount : data?.items?.length ?? 0
          return [key, count] as const
        })
      )
      setStatusCounts(Object.fromEntries(entries) as Record<'all' | AuctionStatus, number>)
    } catch (error) {
      console.error('Không thể tải số lượng phiên theo trạng thái:', error)
    }
  }, [])

  useEffect(() => {
    fetchStatusCounts()
  }, [fetchStatusCounts])

  const handleActionClick = (
    auctionId: string,
    actionType: 'approve' | 'reject' | 'pending' | 'stop' | 'cancel' | 'pause' | 'resume'
  ) => {
    if (actionType === 'pause') {
      setPauseReason('')
    }
    if (actionType === 'resume') {
      setResumeExtendMinute('0')
    }
    setDialogState({
      isOpen: true,
      auctionId,
      actionType,
    })
  }

  const handleConfirmAction = async () => {
    if (!dialogState.auctionId || !dialogState.actionType) return

    if (dialogState.actionType === 'pause') {
      const reason = pauseReason.trim()
      if (!reason) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: 'Vui lòng nhập lý do tạm dừng.',
          variant: 'destructive',
        })
        throw new Error('PAUSE_REASON_REQUIRED')
      }
      try {
        const res = await auctionApi.pauseEnglishAuction({
          auctionId: dialogState.auctionId,
          reason,
        })
        if (res.isSuccess) {
          setAuctions(prev =>
            prev.map(item =>
              item.id === dialogState.auctionId ? { ...item, status: 'Pause', uiStatus: 'Pause' } : item
            )
          )
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: AUCTION_MESSAGES.PAUSE_SUCCESS,
          })
          fetchStatusCounts()
          fetchAuctions({ silent: true })
        } else {
          const message = res.message || AUCTION_MESSAGES.PAUSE_ERROR
          toast({
            title: TOAST_TITLES.ERROR,
            description: message,
            variant: 'destructive',
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : AUCTION_MESSAGES.PAUSE_ERROR
        console.error(err)
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
        throw err
      }
      return
    }

    if (dialogState.actionType === 'resume') {
      const extendMinute = Math.max(0, Number(resumeExtendMinute) || 0)
      try {
        const res = await auctionApi.resumeEnglishAuction({
          auctionId: dialogState.auctionId,
          extendMinute,
        })
        if (res.isSuccess) {
          setAuctions(prev =>
            prev.map(item =>
              item.id === dialogState.auctionId ? { ...item, status: 'OnGoing', uiStatus: 'OnGoing' } : item
            )
          )
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: AUCTION_MESSAGES.RESUME_SUCCESS,
          })
          fetchStatusCounts()
          fetchAuctions({ silent: true })
        } else {
          const message = res.message || AUCTION_MESSAGES.RESUME_ERROR
          toast({
            title: TOAST_TITLES.ERROR,
            description: message,
            variant: 'destructive',
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : AUCTION_MESSAGES.RESUME_ERROR
        console.error(err)
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
        throw err
      }
      return
    }

    const statusMap: Record<'approve' | 'reject' | 'pending' | 'stop' | 'cancel', AuctionStatus> = {
      approve: 'Approved',
      reject: 'Rejected',
      pending: 'Pending',
      stop: 'Completed',
      cancel: 'Cancelled',
    }

    const newStatus = statusMap[dialogState.actionType]

    try {
      const res = await auctionApi.updateEnglishAuctionStatus(dialogState.auctionId, newStatus)

      if (res.isSuccess) {
        setAuctions(prev =>
          prev.map(item =>
            item.id === dialogState.auctionId
              ? { ...item, status: newStatus, uiStatus: newStatus }
              : item
          )
        )
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: AUCTION_MESSAGES.STATUS_UPDATE_SUCCESS,
        })
        fetchStatusCounts()
      } else {
        const message = res.message || AUCTION_MESSAGES.STATUS_UPDATE_ERROR
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
        fetchStatusCounts()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : AUCTION_MESSAGES.STATUS_UPDATE_ERROR
      console.error(err)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
      fetchStatusCounts()
      throw err
    }
  }

  const getDialogContent = () => {
    if (!dialogState.actionType) return null

    const actionConfig = {
      approve: {
        title: 'Xác nhận duyệt phiên đấu giá',
        description: 'Bạn có chắc chắn muốn duyệt phiên đấu giá này? Phiên sẽ được kích hoạt và có sẵn cho người dùng.',
        actionLabel: 'Duyệt',
        variant: 'approve' as const,
      },
      reject: {
        title: 'Xác nhận từ chối phiên đấu giá',
        description: 'Bạn có chắc chắn muốn từ chối phiên đấu giá này? Hành động này không thể hoàn tác.',
        actionLabel: 'Từ chối',
        variant: 'reject' as const,
      },
      pending: {
        title: 'Đặt phiên đấu giá về trạng thái "Đợi xét duyệt"',
        description: 'Bạn có chắc chắn muốn đặt lại phiên này về trạng thái "Đợi xét duyệt"?',
        actionLabel: 'Xác nhận',
        variant: 'pending' as const,
      },
      stop: {
        title: 'Xác nhận dừng phiên đấu giá',
        description: 'Bạn có chắc chắn muốn dừng phiên đấu giá này? Phiên sẽ kết thúc ngay lập tức.',
        actionLabel: 'Dừng',
        variant: 'reject' as const,
      },
      cancel: {
        title: 'Xác nhận hủy phiên đấu giá',
        description: 'Bạn có chắc chắn muốn hủy phiên đấu giá này? Hành động này không thể hoàn tác.',
        actionLabel: 'Hủy',
        variant: 'reject' as const,
      },
      pause: {
        title: 'Tạm dừng phiên đấu giá',
        description: 'Nhập lý do tạm dừng, phiên sẽ tạm thời bị khóa với người tham gia.',
        actionLabel: 'Tạm dừng',
        variant: 'pending' as const,
      },
      resume: {
        title: 'Tiếp tục phiên đấu giá',
        description: 'Thiết lập thời gian gia hạn (nếu cần) và mở lại phiên đấu giá.',
        actionLabel: 'Tiếp tục',
        variant: 'approve' as const,
      },
    }

    return actionConfig[dialogState.actionType]
  }

  const dialogConfig = getDialogContent()

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      setDialogState(prev => ({ ...prev, isOpen: open }))
      return
    }
    setDialogState({
      isOpen: false,
      auctionId: null,
      actionType: null,
    })
    setPauseReason('')
    setResumeExtendMinute('0')
  }

  const dialogFields = (() => {
    if (dialogState.actionType === 'pause') {
      return (
        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-gray-700" htmlFor="pause-reason">
            Lý do tạm dừng<span className="text-red-500">*</span>
          </label>
          <Textarea
            id="pause-reason"
            rows={3}
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Nhập lý do tạm dừng phiên đấu giá..."
          />
          <p className="text-xs text-gray-500">Đây sẽ được ghi nhận trong lịch sử hoạt động của phiên.</p>
        </div>
      )
    }
    if (dialogState.actionType === 'resume') {
      return (
        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-gray-700" htmlFor="resume-extend">
            Gia hạn thêm (phút)
          </label>
          <Input
            id="resume-extend"
            type="number"
            min={0}
            value={resumeExtendMinute}
            onChange={(e) => setResumeExtendMinute(e.target.value)}
          />
          <p className="text-xs text-gray-500">Đặt 0 nếu không muốn gia hạn thời gian.</p>
        </div>
      )
    }
    return null
  })()

  const tabs: { key: 'all' | AuctionStatus; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'Pending', label: 'Đợi xét duyệt' },
    { key: 'Approved', label: 'Đã duyệt' },
    { key: 'Rejected', label: 'Từ chối' },
    { key: 'OnGoing', label: 'Đang diễn ra' },
    { key: 'Pause', label: 'Tạm dừng' },
  ]

  const additionalStatuses: { key: AuctionStatus; label: string }[] = [
    { key: 'Completed', label: 'Hoàn thành' },
    { key: 'NoWinner', label: 'Không người chiến thắng' },
    { key: 'Cancelled', label: 'Hủy' },
    // { key: 'Draft', label: 'Bản nháp' },
  ]

  const filteredAuctions = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    return auctions
      .filter(a =>
        !keyword ||
        a.sessionCode.toLowerCase().includes(keyword) ||
        a.farmName.toLowerCase().includes(keyword) ||
        a.note.toLowerCase().includes(keyword)
      )
  }, [auctions, searchTerm])

  const visibleTotalCount = useMemo(() => {
    if (statusFilter === 'all') {
      const all = statusCounts['all'] ?? 0
      const draft = statusCounts['Draft'] ?? 0
      return Math.max(0, all - draft)
    }
    return statusCounts[statusFilter] ?? 0
  }, [statusCounts, statusFilter])

  return (
    <div className="mx-auto max-w-[1800px] p-6">
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-600 mb-2">Đấu giá</p>
            <h1 className="text-responsive-2xl font-bold text-gray-900">Quản lý phiên đấu giá</h1>
            <p className="text-responsive-base text-gray-600">Theo dõi danh sách phiên, phê duyệt hoặc từ chối.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo mã phiên hoặc nông trại"
                className="pl-9"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => fetchAuctions()} disabled={isLoading}>
              {isLoading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map(tab => {
            const count = tab.key === 'all'
              // ? Math.max(0, (statusCounts['all'] ?? 0) - (statusCounts['Draft'] ?? 0))
              ? statusCounts['all'] ?? 0
              : statusCounts[tab.key] ?? 0
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setStatusFilter(tab.key); setPageNumber(1) }}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  statusFilter === tab.key
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:text-emerald-700'
                }`}
              >
                {tab.label} <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs">{count}</span>
              </button>
            )
          })}
          <div className="relative">
            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${
              additionalStatuses.find(s => s.key === statusFilter) ? 'text-emerald-600' : 'text-gray-400'
            }`} />
            <select
              value={additionalStatuses.find(s => s.key === statusFilter) ? statusFilter : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setStatusFilter(e.target.value as AuctionStatus)
                  setPageNumber(1)
                } else {
                  setStatusFilter('all')
                  setPageNumber(1)
                }
              }}
              className={`appearance-none rounded-2xl border px-10 py-2 pr-8 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                additionalStatuses.find(s => s.key === statusFilter)
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:text-emerald-700'
              }`}
            >
              <option value="">Lọc thêm...</option>
              {additionalStatuses.map(status => {
                const count = statusCounts[status.key] ?? 0
                return (
                  <option key={status.key} value={status.key}>
                    {status.label} ({count})
                  </option>
                )
              })}
            </select>
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${
              additionalStatuses.find(s => s.key === statusFilter) ? 'text-emerald-600' : 'text-gray-400'
            }`} />
          </div>
        </div>
      </div>

      <Card className="card-responsive">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-responsive-xl font-semibold text-gray-900">Danh sách phiên đấu giá</h2>
            <p className="text-responsive-sm text-gray-600">
              {isLoading ? 'Đang tải...' : `Hiển thị ${filteredAuctions.length} / ${visibleTotalCount || totalCount} phiên`}
            </p>
          </div>
          <div className="text-sm text-gray-500">Trang {pageNumber}/{totalPages || 1}</div>
        </div>
        <div className="overflow-x-auto">
          <SimpleTable>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[10%] whitespace-nowrap text-left">Mã phiên</TableHead>
                {/* <TableHead className="w-[18%] whitespace-nowrap text-left">Ghi chú</TableHead> */}
                <TableHead className="hidden md:table-cell w-[15%] whitespace-nowrap text-left">Nông trại</TableHead>
                <TableHead className="hidden md:table-cell w-[12%] whitespace-nowrap text-left">Bắt đầu</TableHead>
                <TableHead className="hidden md:table-cell w-[12%] whitespace-nowrap text-left">Kết thúc</TableHead>
                <TableHead className="w-[10%] text-left">Trạng thái</TableHead>
                <TableHead className="w-[18%] text-left">Thao tác</TableHead>
                <TableHead className="w-[5%] text-left"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuctions.map((a) => (
                <TableRow key={a.id} className="hover:bg-gray-50">
                  <TableCell className="w-[10%] font-mono text-xs whitespace-nowrap text-left">{a.sessionCode}</TableCell>
                  {/* <TableCell className="w-[18%] font-medium text-xs md:text-sm truncate text-left">{a.note}</TableCell> */}
                  <TableCell className="w-[15%] text-xs truncate hidden md:table-cell text-left">{a.farmName}</TableCell>
                  <TableCell className="w-[12%] text-xs hidden md:table-cell whitespace-nowrap text-left">{formatDateTime(a.publishDate)}</TableCell>
                  <TableCell className="w-[12%] text-xs hidden md:table-cell whitespace-nowrap text-left">{formatDateTime(a.endDate)}</TableCell>
                  <TableCell className="w-[10%] text-left">{getStatusBadge(a.uiStatus)}</TableCell>
                  <TableCell className="w-[18%]">
                    {a.uiStatus === 'Pending' && (
                      <div className="flex gap-1.5 flex max-w-[180px]">
                        <Button
                          size="sm"
                          onClick={() => handleActionClick(a.id, 'approve')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 min-w-[90px] text-xs"
                        >
                          ✓ Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActionClick(a.id, 'reject')}
                          className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-600 flex-1 min-w-[90px] text-xs"
                        >
                          ✕ Không duyệt
                        </Button>
                      </div>
                    )}

                    {a.uiStatus === 'OnGoing' && (
                      <div className="flex gap-1.5 justify-start flex-wrap">
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => handleActionClick(a.id, 'pause')}
                        >
                          <PauseCircle className="w-4 h-4 mr-1.5" />
                          Tạm dừng
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleActionClick(a.id, 'cancel')}
                        >
                          ✕ Hủy
                        </Button>
                      </div>
                    )}

                    {a.uiStatus === 'Pause' && (
                      <div className="flex gap-1.5 justify-start flex-wrap">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleActionClick(a.id, 'resume')}
                        >
                          <PlayCircle className="w-4 h-4 mr-1.5" />
                          Tiếp tục
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleActionClick(a.id, 'cancel')}
                        >
                          ✕ Hủy
                        </Button>
                      </div>
                    )}

                    {a.uiStatus !== 'Pending' && a.uiStatus !== 'OnGoing' && a.uiStatus !== 'Pause' && (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>

                  <TableCell className="w-[5%] text-left">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs px-2 py-1"
                      onClick={() => navigate(ROUTES.ADMIN_AUCTIONS_BY_ID.replace(':id', a.id))}
                    >
                      Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </SimpleTable>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 text-sm px-4">
              <span className="text-gray-600">
                Trang {pageNumber}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                  disabled={pageNumber >= totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {dialogConfig && (
        <AuctionActionDialog
          isOpen={dialogState.isOpen}
          onOpenChange={handleDialogOpenChange}
          onConfirm={handleConfirmAction}
          title={dialogConfig.title}
          description={dialogConfig.description}
          actionLabel={dialogConfig.actionLabel}
          actionVariant={dialogConfig.variant}
        >
          {dialogFields}
        </AuctionActionDialog>
      )}
    </div>
  )
}