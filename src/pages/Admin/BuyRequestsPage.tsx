import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { buyRequestApi, type BuyRequestListParams } from '../../services/api/buyRequestApi'
import { userApi } from '../../services/api/userApi'
import { farmApi } from '../../services/api/farmApi'
import { walletApi } from '../../services/api/walletApi'
import type { ApiBuyRequest, User as ApiUser, ApiHarvest, ApiEscrow, ListResponse } from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { Loader2, Search, RefreshCw, Eye, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react'
import { formatCurrencyVND } from '../../utils/currency'

const BUY_REQUEST_STATUS_LABELS: Record<string, string> = {
  Pending: 'Đang chờ xử lý',
  Accepted: 'Đã chấp nhận',
  Approved: 'Đã chấp nhận',
  Rejected: 'Đã từ chối',
  Completed: 'Đã hoàn thành',
  Canceled: 'Đã hủy',
  Cancelled: 'Đã hủy', // Tương thích ngược
  '0': 'Đang chờ xử lý',
  '1': 'Đã chấp nhận',
  '2': 'Đã từ chối',
  '3': 'Đã hoàn thành',
  '4': 'Đã hủy',
}

const BUY_REQUEST_STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
  Completed: 'bg-blue-100 text-blue-800 border-blue-200',
  Canceled: 'bg-slate-100 text-slate-800 border-slate-200',
  Cancelled: 'bg-slate-100 text-slate-800 border-slate-200', // Tương thích ngược
  '0': 'bg-amber-100 text-amber-800 border-amber-200',
  '1': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  '2': 'bg-red-100 text-red-700 border-red-200',
  '3': 'bg-blue-100 text-blue-800 border-blue-200',
  '4': 'bg-slate-100 text-slate-800 border-slate-200',
}

const getBuyRequestStatusBadge = (status?: string | number) => {
  if (status === undefined || status === null) return <Badge variant="outline">—</Badge>
  const raw = String(status)

  // Chuẩn hóa status để mapping tiếng Việt
  const lower = raw.toLowerCase()
  const normalizedKey =
    lower === 'pending' ? 'Pending' :
    lower === 'accepted' ? 'Accepted' :
    lower === 'approved' ? 'Approved' :
    lower === 'rejected' ? 'Rejected' :
    lower === 'completed' ? 'Completed' :
    lower === 'canceled' || lower === 'cancelled' ? 'Canceled' :
    raw

  const label = BUY_REQUEST_STATUS_LABELS[normalizedKey] ?? BUY_REQUEST_STATUS_LABELS[raw] ?? 'Không xác định'
  const colorClass = BUY_REQUEST_STATUS_COLORS[normalizedKey] ?? BUY_REQUEST_STATUS_COLORS[raw] ?? 'text-gray-700 border-gray-200 bg-gray-100'
  return (
    <Badge variant="outline" className={colorClass}>
      {label}
    </Badge>
  )
}

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatQuantity = (value?: number | null, unit?: string | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  const formatted = new Intl.NumberFormat('vi-VN').format(value)
  return unit ? `${formatted} ${unit}` : `${formatted} kg`
}

// const getTotalQuantity = (buyRequest: ApiBuyRequest) => {
//   if (buyRequest.totalQuantity && !Number.isNaN(buyRequest.totalQuantity)) {
//     return buyRequest.totalQuantity
//   }
//   if (buyRequest.details && buyRequest.details.length > 0) {
//     return buyRequest.details.reduce((sum, d) => sum + (d.quantity || 0), 0)
//   }
//   return null
// }

export default function BuyRequestsPage() {
  const { toast } = useToastContext()

  const [buyRequests, setBuyRequests] = useState<ApiBuyRequest[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchValue, setSearchValue] = useState<string>('')
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [pageSize] = useState<number>(10)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [userMap, setUserMap] = useState<Record<string, string>>({})

  // Detail modal state
  const [selectedBuyRequest, setSelectedBuyRequest] = useState<ApiBuyRequest | null>(null)
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [farmerInfo, setFarmerInfo] = useState<ApiUser | null>(null)
  const [wholesalerInfo, setWholesalerInfo] = useState<ApiUser | null>(null)
  const [harvestInfo, setHarvestInfo] = useState<ApiHarvest | null>(null)
  const [escrowInfo, setEscrowInfo] = useState<ApiEscrow | null>(null)

  const loadBuyRequests = useCallback(
    async (page: number, search?: string) => {
      try {
        setLoading(true)
        const params: BuyRequestListParams = {
          pageNumber: page,
          pageSize,
          ...(search && search.trim() && { searchValue: search.trim() }),
        }
        const res = await buyRequestApi.list(params)
        if (res.isSuccess && res.data) {
          const data = res.data
          setBuyRequests(data.items ?? [])
          setTotalCount(data.totalCount ?? 0)
          setTotalPages(data.totalPages ?? 0)
        } else {
          toast({
            title: TOAST_TITLES.ERROR,
            description: res.message || 'Không thể tải danh sách yêu cầu mua',
            variant: 'destructive',
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải danh sách yêu cầu mua'
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
    loadBuyRequests(pageNumber, searchValue)
  }, [loadBuyRequests, pageNumber, searchValue])

  // Load users để map tên cho wholesaler / farmer
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersRes = await userApi.list()
        if (usersRes.isSuccess && usersRes.data) {
          const users: ApiUser[] = Array.isArray(usersRes.data)
            ? usersRes.data
            : (usersRes.data as ListResponse<ApiUser>).items ?? []
          const map: Record<string, string> = {}
          users.forEach((u) => {
            const fullName = `${u.firstName} ${u.lastName}`.trim()
            map[u.id] = fullName || u.email || u.id
          })
          setUserMap(map)
        }
      } catch (error) {
        // Không block UI nếu lỗi load user
        console.error('Error loading users for buy requests:', error)
      }
    }
    loadUsers()
  }, [])

  const handleOpenDetail = async (buyRequest: ApiBuyRequest) => {
    setSelectedBuyRequest(buyRequest)
    setShowDetailModal(true)
    setDetailLoading(true)
    setFarmerInfo(null)
    setWholesalerInfo(null)
    setHarvestInfo(null)
    setEscrowInfo(null)

    try {
      // Load chi tiết buy request
      const detailRes = await buyRequestApi.getById(buyRequest.id)
      if (detailRes.isSuccess && detailRes.data) {
        const detail = detailRes.data
        setSelectedBuyRequest(detail)

        // Load thông tin farmer
        if (detail.farmerId) {
          try {
            const usersRes = await userApi.list()
            if (usersRes.isSuccess && usersRes.data) {
              const users: ApiUser[] = Array.isArray(usersRes.data)
                ? usersRes.data
                : (usersRes.data as ListResponse<ApiUser>).items ?? []
              const farmer = users.find((u) => u.id === detail.farmerId)
              if (farmer) setFarmerInfo(farmer)
            }
          } catch (error) {
            console.error('Error loading farmer info:', error)
          }
        }

        // Load thông tin wholesaler
        if (detail.wholesalerId) {
          try {
            const usersRes = await userApi.list()
            if (usersRes.isSuccess && usersRes.data) {
              const users: ApiUser[] = Array.isArray(usersRes.data)
                ? usersRes.data
                : (usersRes.data as ListResponse<ApiUser>).items ?? []
              const wholesaler = users.find((u) => u.id === detail.wholesalerId)
              if (wholesaler) setWholesalerInfo(wholesaler)
            }
          } catch (error) {
            console.error('Error loading wholesaler info:', error)
          }
        }

        // Load thông tin harvest
        if (detail.harvestId) {
          try {
            const harvestRes = await farmApi.getHarvestById(detail.harvestId)
            if (harvestRes.isSuccess && harvestRes.data) {
              setHarvestInfo(harvestRes.data)
            }
          } catch (error) {
            console.error('Error loading harvest info:', error)
          }
        }

        // Load thông tin escrow
        try {
          const escrowRes = await walletApi.getEscrowByBuyRequestId(detail.id)
          if (escrowRes.isSuccess && escrowRes.data) {
            setEscrowInfo(escrowRes.data)
          }
        } catch (error) {
          // Escrow có thể chưa tồn tại, không cần hiển thị lỗi
          console.log('Escrow not found for buy request:', detail.id)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải chi tiết yêu cầu mua'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredBuyRequests = useMemo(() => {
    return buyRequests
  }, [buyRequests])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2 sm:gap-3">
              <span className="truncate">Yêu cầu mua</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 ml-0 sm:ml-[36px] md:ml-[52px]">
              Quản lý và xem xét các yêu cầu mua hàng từ thương lái
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-4 sm:mb-6">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Tìm kiếm theo mã yêu cầu, tên người dùng..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value)
                  setPageNumber(1)
                }}
                className="pl-9 text-sm sm:text-base"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => loadBuyRequests(pageNumber, searchValue)}
              disabled={loading}
              className="text-xs sm:text-sm"
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : filteredBuyRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-sm sm:text-base">Không có yêu cầu mua nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Mã yêu cầu</TableHead>
                    <TableHead className="text-xs sm:text-sm">Người mua</TableHead>
                    <TableHead className="text-xs sm:text-sm">Người bán</TableHead>
                    <TableHead className="text-xs sm:text-sm">Giá mong muốn</TableHead>
                    <TableHead className="text-xs sm:text-sm">Ngày yêu cầu</TableHead>
                    <TableHead className="text-xs sm:text-sm">Trạng thái</TableHead>
                    <TableHead className="text-xs sm:text-sm text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBuyRequests.map((buyRequest) => (
                    <TableRow key={buyRequest.id} className="hover:bg-gray-50">
                      <TableCell className="text-xs sm:text-sm font-medium">
                        {buyRequest.requestCode || buyRequest.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {buyRequest.wholesalerId
                          ? userMap[buyRequest.wholesalerId] || `ID: ${buyRequest.wholesalerId.slice(0, 8)}...`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {buyRequest.farmerId
                          ? userMap[buyRequest.farmerId] || `ID: ${buyRequest.farmerId.slice(0, 8)}...`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {buyRequest.expectedPrice
                          ? formatCurrencyVND(buyRequest.expectedPrice)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {formatDateTime(buyRequest.createdAt)}
                      </TableCell>
                      <TableCell>{getBuyRequestStatusBadge(buyRequest.status)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(buyRequest)}
                          className="text-xs sm:text-sm"
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200">
                <div className="text-xs sm:text-sm text-gray-600">
                  Trang {pageNumber} / {totalPages} ({totalCount} yêu cầu)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                    disabled={pageNumber === 1 || loading}
                    className="text-xs sm:text-sm"
                  >
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber((prev) => Math.min(totalPages, prev + 1))}
                    disabled={pageNumber === totalPages || loading}
                    className="text-xs sm:text-sm"
                  >
                    Sau
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Chi tiết yêu cầu mua</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : selectedBuyRequest ? (
            <div className="space-y-6">
              {/* Thông tin yêu cầu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">Mã yêu cầu</Label>
                  <p className="mt-1 text-sm sm:text-base text-gray-900">
                    {selectedBuyRequest.requestCode || selectedBuyRequest.id}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">Trạng thái</Label>
                  <div className="mt-1">{getBuyRequestStatusBadge(selectedBuyRequest.status)}</div>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">Giá mong muốn</Label>
                  <p className="mt-1 text-sm sm:text-base text-gray-900">
                    {selectedBuyRequest.expectedPrice
                      ? formatCurrencyVND(selectedBuyRequest.expectedPrice)
                      : '—'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">Ngày yêu cầu</Label>
                  <p className="mt-1 text-sm sm:text-base text-gray-900">
                    {formatDateTime(selectedBuyRequest.createdAt)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">Ngày cần hàng</Label>
                  <p className="mt-1 text-sm sm:text-base text-gray-900">
                    {formatDateTime(selectedBuyRequest.requiredDate)}
                  </p>
                </div>
                {selectedBuyRequest.message && (
                  <div className="md:col-span-2">
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">Ghi chú</Label>
                    <p className="mt-1 text-sm sm:text-base text-gray-900">{selectedBuyRequest.message}</p>
                  </div>
                )}
              </div>

              {/* Thông tin Farmer */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Thông tin người bán (Farmer)</h3>
                {farmerInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Tên</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {`${farmerInfo.firstName} ${farmerInfo.lastName}`.trim() || farmerInfo.email}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Email</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">{farmerInfo.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Số điện thoại</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">{farmerInfo.phoneNumber || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Địa chỉ</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {farmerInfo.address || '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Đang tải thông tin...</p>
                )}
              </div>

              {/* Thông tin Wholesaler */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Thông tin người mua (Wholesaler)</h3>
                {wholesalerInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Tên</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {`${wholesalerInfo.firstName} ${wholesalerInfo.lastName}`.trim() || wholesalerInfo.email}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Email</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">{wholesalerInfo.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Số điện thoại</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">{wholesalerInfo.phoneNumber || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Địa chỉ</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {wholesalerInfo.address || '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Đang tải thông tin...</p>
                )}
              </div>

              {/* Thông tin Harvest */}
              {harvestInfo && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Thông tin vụ thu hoạch</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Tổng số lượng</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {formatQuantity(harvestInfo.totalQuantity, harvestInfo.unit)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Giá bán</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {formatCurrencyVND(harvestInfo.salePrice)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Ngày thu hoạch</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {formatDateTime(harvestInfo.harvestDate)}
                      </p>
                    </div>
                    {harvestInfo.note && (
                      <div className="md:col-span-2">
                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Ghi chú</Label>
                        <p className="mt-1 text-sm sm:text-base text-gray-900">{harvestInfo.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chi tiết yêu cầu */}
              {selectedBuyRequest.details && selectedBuyRequest.details.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Chi tiết theo cấp độ</h3>
                  <div className="overflow-x-auto">
                    <SimpleTable>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Cấp độ</TableHead>
                          <TableHead className="text-xs sm:text-sm">Số lượng</TableHead>
                          <TableHead className="text-xs sm:text-sm">Giá</TableHead>
                          <TableHead className="text-xs sm:text-sm">Đơn vị</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBuyRequest.details.map((detail, index) => (
                          <TableRow key={detail.id || index}>
                            <TableCell className="text-xs sm:text-sm">Cấp {detail.grade ?? '—'}</TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {formatQuantity(detail.quantity, detail.unit)}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {detail.price ? formatCurrencyVND(detail.price) : '—'}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">{detail.unit || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </SimpleTable>
                  </div>
                </div>
              )}

              {/* Thông tin Escrow */}
              {escrowInfo && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Trạng thái tiền (Escrow)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Số tiền ký quỹ</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {formatCurrencyVND(escrowInfo.amount)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Trạng thái</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {escrowInfo.status === '0' || escrowInfo.status === 'Pending'
                          ? 'Chờ thanh toán'
                          : escrowInfo.status === '1' || escrowInfo.status === 'Paid'
                          ? 'Đã thanh toán'
                          : escrowInfo.status === '2' || escrowInfo.status === 'Refunded'
                          ? 'Đã hoàn tiền'
                          : escrowInfo.status || '—'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-gray-700">Ngày tạo</Label>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {formatDateTime(escrowInfo.createdAt)}
                      </p>
                    </div>
                    {escrowInfo.updatedAt && escrowInfo.updatedAt !== escrowInfo.createdAt && (
                      <div>
                        <Label className="text-xs sm:text-sm font-medium text-gray-700">Ngày cập nhật</Label>
                        <p className="mt-1 text-sm sm:text-base text-gray-900">
                          {formatDateTime(escrowInfo.updatedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center p-12">
              <p className="text-sm text-gray-500">Không tìm thấy thông tin yêu cầu mua</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

