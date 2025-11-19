import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { AuctionActionDialog } from '../../components/auction/auction-action-dialog'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import type { ApiEnglishAuction, AuctionStatus, APIResponse, PaginatedEnglishAuctions } from '../../types/api'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants'

interface ExtendedAuction extends ApiEnglishAuction {
  farmName: string
  farmId?: string
  uiStatus: AuctionStatus
  verified: boolean
}

interface DialogState {
  isOpen: boolean
  auctionId: string | null
  actionType: 'approve' | 'reject' | 'pending' | null
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

  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    auctionId: null,
    actionType: null,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const auctionRes = (await auctionApi.getEnglishAuctions(
          statusFilter !== 'all' ? statusFilter : undefined,
          pageNumber,
          pageSize,
        )) as APIResponse<PaginatedEnglishAuctions>
        const farmRes = await farmApi.getFarms()

        if (auctionRes.isSuccess && farmRes.isSuccess && auctionRes.data && farmRes.data) {
          const farmsData = farmRes.data

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
        }
      } catch (err) {
        console.error('Error fetching auctions:', err)
      }
    }

    fetchData()
  }, [pageNumber, pageSize, statusFilter])

  const handleActionClick = (auctionId: string, actionType: 'approve' | 'reject' | 'pending') => {
    setDialogState({
      isOpen: true,
      auctionId,
      actionType,
    })
  }

  const handleConfirmAction = async () => {
    if (!dialogState.auctionId || !dialogState.actionType) return

    const statusMap: Record<'approve' | 'reject' | 'pending', AuctionStatus> = {
      approve: 'Approved',
      reject: 'Rejected',
      pending: 'Pending',
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
      } else {
        alert('Cập nhật thất bại: ' + res.message)
      }
    } catch (err) {
      console.error(err)
      alert('Có lỗi xảy ra khi xử lý phiên đấu giá')
    } finally {
      setDialogState(prev => ({ ...prev, isOpen: false }))
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
    }

    return actionConfig[dialogState.actionType]
  }

  const dialogConfig = getDialogContent()

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Quản lý phiên đấu giá</h1>
          <p className="text-responsive-base text-gray-600">Danh sách phiên đấu giá trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Trạng thái</label>
            <select
              className="h-9 rounded border border-gray-300 text-sm px-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | AuctionStatus)}
            >
              <option value="all">Tất cả</option>
              <option value="Draft">Bản nháp</option>
              <option value="Pending">Đợi xét duyệt</option>
              <option value="Rejected">Bị từ chối</option>
              <option value="Approved">Chấp nhận</option>
              <option value="OnGoing">Đang diễn ra</option>
              <option value="Completed">Hoàn thành</option>
              <option value="NoWinner">Không người chiến thắng</option>
              <option value="Cancelled">Hủy</option>
            </select>
          </div>
        </div>
      </div>

      <Card className="card-responsive">
        <div className="mb-4">
          <h2 className="text-responsive-xl font-semibold text-gray-900 mb-2">Danh sách phiên đấu giá</h2>
          <p className="text-responsive-sm text-gray-600">Có {totalCount} phiên đấu giá trong hệ thống</p>
        </div>
        <div className="overflow-x-hidden">
          <SimpleTable>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Mã phiên</TableHead>
                <TableHead className="whitespace-nowrap">Tiêu đề</TableHead>
                <TableHead className="hidden md:table-cell">Nông trại</TableHead>
                <TableHead className="hidden md:table-cell">Bắt đầu</TableHead>
                <TableHead className="hidden md:table-cell">Kết thúc</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
                <TableHead> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auctions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{a.sessionCode}</TableCell>
                  <TableCell className="font-medium text-xs md:text-sm max-w-[480px] truncate whitespace-nowrap">
                    {a.note}
                  </TableCell>
                  <TableCell className="text-xs max-w-[280px] truncate whitespace-nowrap">{a.farmName}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{formatDateTime(a.publishDate)}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{formatDateTime(a.endDate)}</TableCell>
                  <TableCell>{getStatusBadge(a.uiStatus)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white border-0 text-xs"
                        onClick={() => handleActionClick(a.id, 'approve')}
                      >
                        ✓ Duyệt
                      </Button>

                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white border-0 text-xs"
                        onClick={() => handleActionClick(a.id, 'reject')}
                      >
                        ✕ Không duyệt
                      </Button>

                      <Button
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700 text-white border-0 text-xs"
                        onClick={() => handleActionClick(a.id, 'pending')}
                      >
                        ⧖ Đợi xét
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
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
            <div className="flex items-center justify-between mt-3 text-sm">
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
