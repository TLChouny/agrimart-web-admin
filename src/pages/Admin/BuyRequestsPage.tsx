import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { AuctionActionDialog } from '../../components/auction/auction-action-dialog'
import { buyRequestApi } from '../../services/api/buyRequestApi'
import type { ApiBuyRequest, BuyRequestStatus, APIResponse, PaginatedBuyRequests } from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { BUY_REQUEST_MESSAGES, TOAST_TITLES } from '../../services/constants/messages'
import { Search, Filter, ChevronDown } from 'lucide-react'

interface DialogState {
  isOpen: boolean
  buyRequestId: string | null
  actionType: 'approve' | 'reject' | null
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

function getStatusBadge(status: BuyRequestStatus) {
  switch (status) {
    case 'Pending':
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Đang chờ</Badge>
    case 'Approved':
      return <Badge variant="outline" className="text-green-600 border-green-600">Đã duyệt</Badge>
    case 'Rejected':
      return <Badge variant="outline" className="text-red-600 border-red-600">Đã từ chối</Badge>
    case 'Fulfilled':
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Đã hoàn thành</Badge>
    case 'Cancelled':
      return <Badge variant="outline" className="text-gray-600 border-gray-600">Đã hủy</Badge>
    default:
      return <Badge variant="outline" className="text-gray-600 border-gray-600">Không xác định</Badge>
  }
}

export default function BuyRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | BuyRequestStatus>('all')
  const [buyRequests, setBuyRequests] = useState<ApiBuyRequest[]>([])
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToastContext()

  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    buyRequestId: null,
    actionType: null,
  })

  const [statusCounts, setStatusCounts] = useState<Record<'all' | BuyRequestStatus, number>>({
    all: 0,
    Pending: 0,
    Approved: 0,
    Rejected: 0,
    Fulfilled: 0,
    Cancelled: 0,
  })

  const fetchBuyRequests = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsLoading(true)
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter
      const buyRequestRes = (await buyRequestApi.getBuyRequests(
        status,
        pageNumber,
        pageSize
      )) as APIResponse<PaginatedBuyRequests>

      if (buyRequestRes.isSuccess && buyRequestRes.data) {
        setBuyRequests(buyRequestRes.data.items)
        setTotalPages(buyRequestRes.data.totalPages)
        setTotalCount(buyRequestRes.data.totalCount)
        if (!silent) {
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: BUY_REQUEST_MESSAGES.FETCH_SUCCESS,
          })
        }
      } else {
        const message = buyRequestRes.message || BUY_REQUEST_MESSAGES.FETCH_ERROR
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : BUY_REQUEST_MESSAGES.FETCH_ERROR
      console.error('Error fetching buy requests:', err)
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
    fetchBuyRequests({ silent: true })
  }, [fetchBuyRequests])

  const fetchStatusCounts = useCallback(async () => {
    const statusKeys: Array<'all' | BuyRequestStatus> = ['all', 'Pending', 'Approved', 'Rejected', 'Fulfilled', 'Cancelled']
    try {
      const entries = await Promise.all(
        statusKeys.map(async (key) => {
          const res = await buyRequestApi.getBuyRequests(key === 'all' ? undefined : key, 1, 1) as APIResponse<PaginatedBuyRequests>
          const data = res.data as PaginatedBuyRequests | undefined
          const count = res.isSuccess && data ? data.totalCount : 0
          return [key, count] as const
        })
      )
      setStatusCounts(Object.fromEntries(entries) as Record<'all' | BuyRequestStatus, number>)
    } catch (error) {
      console.error('Không thể tải số lượng yêu cầu mua hàng theo trạng thái:', error)
    }
  }, [])

  useEffect(() => {
    fetchStatusCounts()
  }, [fetchStatusCounts])

  const handleActionClick = (buyRequestId: string, actionType: 'approve' | 'reject') => {
    setDialogState({
      isOpen: true,
      buyRequestId,
      actionType,
    })
  }

  const handleConfirmAction = async () => {
    if (!dialogState.buyRequestId || !dialogState.actionType) return

    const statusMap: Record<'approve' | 'reject', BuyRequestStatus> = {
      approve: 'Approved',
      reject: 'Rejected',
    }

    const newStatus = statusMap[dialogState.actionType]

    try {
      const res = await buyRequestApi.updateBuyRequestStatus(dialogState.buyRequestId, newStatus)

      if (res.isSuccess) {
        setBuyRequests(prev =>
          prev.map(item =>
            item.id === dialogState.buyRequestId
              ? { ...item, status: newStatus }
              : item
          )
        )
        // Hiển thị thông báo cụ thể cho từng hành động
        const successMessage = dialogState.actionType === 'approve' 
          ? BUY_REQUEST_MESSAGES.APPROVE_SUCCESS 
          : BUY_REQUEST_MESSAGES.REJECT_SUCCESS
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: successMessage,
        })
        fetchStatusCounts()
        fetchBuyRequests({ silent: true })
      } else {
        // Hiển thị thông báo lỗi cụ thể cho từng hành động
        const errorMessage = dialogState.actionType === 'approve'
          ? res.message || BUY_REQUEST_MESSAGES.APPROVE_ERROR
          : res.message || BUY_REQUEST_MESSAGES.REJECT_ERROR
        toast({
          title: TOAST_TITLES.ERROR,
          description: errorMessage,
          variant: 'destructive',
        })
        fetchStatusCounts()
      }
    } catch (err) {
      // Hiển thị thông báo lỗi cụ thể cho từng hành động
      const errorMessage = dialogState.actionType === 'approve'
        ? (err instanceof Error ? err.message : BUY_REQUEST_MESSAGES.APPROVE_ERROR)
        : (err instanceof Error ? err.message : BUY_REQUEST_MESSAGES.REJECT_ERROR)
      console.error(err)
      toast({
        title: TOAST_TITLES.ERROR,
        description: errorMessage,
        variant: 'destructive',
      })
      fetchStatusCounts()
    } finally {
      setDialogState(prev => ({ ...prev, isOpen: false }))
    }
  }

  const getDialogContent = () => {
    if (!dialogState.actionType) return null

    const actionConfig = {
      approve: {
        title: 'Xác nhận duyệt yêu cầu mua hàng',
        description: 'Bạn có chắc chắn muốn duyệt yêu cầu mua hàng này? Yêu cầu sẽ được chấp nhận và có sẵn cho người dùng.',
        actionLabel: 'Duyệt',
        variant: 'approve' as const,
      },
      reject: {
        title: 'Xác nhận từ chối yêu cầu mua hàng',
        description: 'Bạn có chắc chắn muốn từ chối yêu cầu mua hàng này? Hành động này không thể hoàn tác.',
        actionLabel: 'Từ chối',
        variant: 'reject' as const,
      },
    }

    return actionConfig[dialogState.actionType]
  }

  const dialogConfig = getDialogContent()

  const tabs: { key: 'all' | BuyRequestStatus; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'Pending', label: 'Đang chờ' },
    { key: 'Approved', label: 'Đã duyệt' },
    { key: 'Rejected', label: 'Đã từ chối' },
  ]

  const additionalStatuses: { key: BuyRequestStatus; label: string }[] = [
    { key: 'Fulfilled', label: 'Đã hoàn thành' },
    { key: 'Cancelled', label: 'Đã hủy' },
  ]

  const filteredBuyRequests = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    return buyRequests.filter(br =>
      !keyword ||
      br.title.toLowerCase().includes(keyword) ||
      br.location.toLowerCase().includes(keyword) ||
      (br.notes || '').toLowerCase().includes(keyword)
    )
  }, [buyRequests, searchTerm])

  const visibleTotalCount = useMemo(() => {
    if (statusFilter === 'all') {
      return statusCounts['all'] ?? 0
    }
    return statusCounts[statusFilter] ?? 0
  }, [statusCounts, statusFilter])

  return (
    <div className="mx-auto max-w-[1800px] p-6">
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {/* <p className="text-xs uppercase tracking-[0.4em] text-emerald-600 mb-2">Yêu cầu mua hàng</p> */}
            <h1 className="text-2xl font-bold text-gray-900">Quản lý yêu cầu mua hàng</h1>
            <p className="text-responsive-base text-gray-600">Theo dõi và quản lý các yêu cầu mua hàng từ nhà buôn.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tiêu đề, địa điểm hoặc ghi chú"
                className="pl-9"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => fetchBuyRequests()} disabled={isLoading}>
              {isLoading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map(tab => {
            const count = tab.key === 'all'
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
                  setStatusFilter(e.target.value as BuyRequestStatus)
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
            <h2 className="text-xl font-semibold text-gray-900">Danh sách yêu cầu mua hàng</h2>
            <p className="text-responsive-sm text-gray-600">
              {isLoading ? 'Đang tải...' : `Hiển thị ${filteredBuyRequests.length} / ${visibleTotalCount || totalCount} yêu cầu`}
            </p>
          </div>
          <div className="text-sm text-gray-500">Trang {pageNumber}/{totalPages || 1}</div>
        </div>
        <div className="overflow-x-auto">
          <SimpleTable>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[10%] whitespace-nowrap text-left">ID</TableHead>
                <TableHead className="w-[20%] whitespace-nowrap text-left">Tiêu đề</TableHead>
                <TableHead className="hidden md:table-cell w-[12%] whitespace-nowrap text-left">Số lượng</TableHead>
                <TableHead className="hidden md:table-cell w-[12%] whitespace-nowrap text-left">Giá mong muốn</TableHead>
                <TableHead className="hidden md:table-cell w-[12%] whitespace-nowrap text-left">Ngày yêu cầu</TableHead>
                <TableHead className="hidden md:table-cell w-[12%] whitespace-nowrap text-left">Địa điểm</TableHead>
                <TableHead className="w-[10%] text-left">Trạng thái</TableHead>
                <TableHead className="w-[12%] text-left">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuyRequests.length === 0 ? (
                <TableRow>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    {isLoading ? 'Đang tải...' : 'Không có yêu cầu mua hàng nào'}
                  </td>
                </TableRow>
              ) : (
                filteredBuyRequests.map((br) => (
                  <TableRow key={br.id} className="hover:bg-gray-50">
                  <TableCell className="w-[10%] font-mono text-xs whitespace-nowrap text-left">
                    {br.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="w-[20%] font-medium text-sm truncate text-left">{br.title}</TableCell>
                  <TableCell className="w-[12%] text-xs hidden md:table-cell text-left">
                    {br.requiredQuantity.toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell className="w-[12%] text-xs hidden md:table-cell text-left">
                    {formatCurrency(br.desiredPrice)}
                  </TableCell>
                  <TableCell className="w-[12%] text-xs hidden md:table-cell whitespace-nowrap text-left">
                    {formatDateTime(br.requiredDate)}
                  </TableCell>
                  <TableCell className="w-[12%] text-xs truncate hidden md:table-cell text-left">{br.location}</TableCell>
                  <TableCell className="w-[10%] text-left">{getStatusBadge(br.status)}</TableCell>
                  <TableCell className="w-[12%]">
                    {br.status === 'Pending' && (
                      <div className="flex gap-1.5 flex max-w-[180px]">
                        <Button
                          size="sm"
                          onClick={() => handleActionClick(br.id, 'approve')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 min-w-[90px] text-xs"
                        >
                          ✓ Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActionClick(br.id, 'reject')}
                          className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-600 flex-1 min-w-[90px] text-xs"
                        >
                          ✕ Không duyệt
                        </Button>
                      </div>
                    )}

                    {br.status !== 'Pending' && (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
                ))
              )}
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
          onOpenChange={(open) => setDialogState(prev => ({ ...prev, isOpen: open }))}
          onConfirm={handleConfirmAction}
          title={dialogConfig.title}
          description={dialogConfig.description}
          actionLabel={dialogConfig.actionLabel}
          actionVariant={dialogConfig.variant}
        />
      )}
    </div>
  )
}

