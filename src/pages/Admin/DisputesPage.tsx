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
import type { ApiDispute, ApiDisputeResolve, DisputeStatus } from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { Loader2, ShieldAlert, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { formatCurrencyVND } from '../../utils/currency'

const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  0: 'Chờ phản hồi',
  1: 'Hai bên đã đồng ý',
  2: 'Người dùng từ chối',
  3: 'Admin đang xử lý',
  4: 'Đã kết thúc',
}

const DISPUTE_STATUS_COLORS: Record<DisputeStatus, string> = {
  0: 'text-amber-600 border-amber-200 bg-amber-50',
  1: 'text-emerald-700 border-emerald-200 bg-emerald-50',
  2: 'text-red-600 border-red-200 bg-red-50',
  3: 'text-blue-600 border-blue-200 bg-blue-50',
  4: 'text-slate-700 border-slate-200 bg-slate-50',
}

const getDisputeStatusBadge = (status: DisputeStatus) => (
  <Badge variant="outline" className={DISPUTE_STATUS_COLORS[status]}>
    {DISPUTE_STATUS_LABELS[status]}
  </Badge>
)

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

  const [selectedDispute, setSelectedDispute] = useState<ApiDispute | null>(null)
  const [resolveInfo, setResolveInfo] = useState<ApiDisputeResolve | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false)
  const [adminNote, setAdminNote] = useState<string>('')
  const [refundAmount, setRefundAmount] = useState<string>('')

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
          setDisputes(res.data.data)
          setTotalPages(res.data.totalPages)
          setTotalCount(res.data.totalCount)
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

  const handleOpenDetail = async (dispute: ApiDispute) => {
    setSelectedDispute(dispute)
    setResolveInfo(null)
    setAdminNote('')
    setRefundAmount('')
    setShowDetailModal(true)

    if (dispute.disputeStatus === 4) {
      try {
        setDetailLoading(true)
        const res = await disputeApi.getResolveByDisputeId(dispute.id)
        if (res.isSuccess && res.data) {
          setResolveInfo(res.data)
          setAdminNote(res.data.adminNote || '')
          setRefundAmount(res.data.refundAmount.toString())
        }
      } catch (error) {
        // không toast quá ồn, chỉ log
        console.error('Failed to load dispute resolve info', error)
      } finally {
        setDetailLoading(false)
      }
    }
  }

  const handleStartAdminReview = async () => {
    if (!selectedDispute) return
    try {
      setActionLoading(true)
      const res = await disputeApi.updateDisputeStatus(selectedDispute.id, {
        status: 'InAdminReview',
        adminNote: adminNote || 'Bắt đầu xem xét tranh chấp',
      })
      if (res.isSuccess && res.data) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Đã chuyển tranh chấp sang trạng thái admin đang xử lý',
        })
        setSelectedDispute(res.data)
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

  const handleResolveDispute = async () => {
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

      const statusRes = await disputeApi.updateDisputeStatus(selectedDispute.id, {
        status: 'Resolved',
        adminNote,
      })
      if (!statusRes.isSuccess || !statusRes.data) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: statusRes.message || 'Không thể cập nhật trạng thái tranh chấp',
          variant: 'destructive',
        })
        setActionLoading(false)
        return
      }

      const resolveRes = await disputeApi.createDisputeResolve({
        disputeId: selectedDispute.id,
        refundAmount: refund,
        adminNote,
      })

      if (resolveRes.isSuccess && resolveRes.data) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Đã kết thúc tranh chấp và ghi nhận thông tin hoàn tiền',
        })
        setSelectedDispute(statusRes.data)
        setResolveInfo(resolveRes.data)
        await loadDisputes(pageNumber, statusFilter)
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: resolveRes.message || 'Không thể tạo bản ghi giải quyết tranh chấp',
          variant: 'destructive',
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xử lý tranh chấp'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const canStartAdminReview = selectedDispute?.disputeStatus === 2
  const canResolve = selectedDispute?.disputeStatus === 3

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
                      <TableHead className="w-[16%]">ID</TableHead>
                      <TableHead className="w-[16%]">Escrow ID</TableHead>
                      <TableHead className="w-[12%] text-right">Số tiền thực tế</TableHead>
                      <TableHead className="w-[14%]">Trạng thái</TableHead>
                      <TableHead className="w-[18%]">Thời gian tạo / cập nhật</TableHead>
                      <TableHead className="w-[24%] text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDisputes.map((dispute) => (
                      <TableRow key={dispute.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-gray-800 truncate max-w-[220px]">
                              {dispute.id}
                            </span>
                            {dispute.disputeMessage && (
                              <span className="text-xs text-gray-500 truncate max-w-[220px]">
                                {dispute.disputeMessage}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-gray-700 truncate max-w-[220px]">
                            {dispute.escrowId}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-gray-900">
                            {formatCurrencyVND(dispute.actualAmount)}
                          </span>
                        </TableCell>
                        <TableCell>{getDisputeStatusBadge(dispute.disputeStatus)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs text-gray-600">
                            <span>Tạo: {formatDateTime(dispute.createdAt)}</span>
                            <span>Cập nhật: {formatDateTime(dispute.updatedAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetail(dispute)}
                              className="h-8 px-3 text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Chi tiết
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                    className="h-8 px-3"
                    onClick={() => handlePageChange(pageNumber - 1)}
                    disabled={pageNumber <= 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => handlePageChange(pageNumber + 1)}
                    disabled={pageNumber >= totalPages}
                  >
                    Sau
                    <ChevronRight className="w-4 h-4 ml-1" />
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
            setAdminNote('')
            setRefundAmount('')
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDispute && (
            <>
              <DialogHeader className="pb-4 border-b border-gray-200">
                <DialogTitle className="text-2xl font-semibold text-gray-900">
                  Chi tiết tranh chấp
                </DialogTitle>
                <p className="mt-1 text-sm text-gray-600">
                  Escrow ID:{' '}
                  <span className="font-mono text-xs text-gray-800">
                    {selectedDispute.escrowId}
                  </span>
                </p>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Trạng thái</Label>
                    <div className="mt-1">{getDisputeStatusBadge(selectedDispute.disputeStatus)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Số tiền tranh chấp</Label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {formatCurrencyVND(selectedDispute.actualAmount)}
                    </p>
                  </div>
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

                <div className="pt-2 border-t border-gray-200 space-y-4">
                  {detailLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải thông tin giải quyết...
                    </div>
                  )}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
                      <p className="mt-1 text-xs text-gray-500">
                        Theo rule: RefundAmount không được vượt quá số tiền escrow.
                      </p>
                    </div>

                    {resolveInfo && (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        <p className="font-semibold mb-1">Thông tin giải quyết đã ghi nhận</p>
                        <p>Số tiền hoàn: {formatCurrencyVND(resolveInfo.refundAmount)}</p>
                        <p>Ghi chú: {resolveInfo.adminNote}</p>
                        <p>Ngày tạo: {formatDateTime(resolveInfo.createdAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-2">
                  <div className="text-xs text-gray-500">
                    <p>- Rejected → InAdminReview → Resolved (không được lùi trạng thái)</p>
                    <p>- Approved / Resolved là trạng thái cuối cùng, không chỉnh sửa lại.</p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDetailModal(false)}
                      className="h-9 px-4"
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
                        className="h-9 px-4 border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang cập nhật...
                          </>
                        ) : (
                          'Bắt đầu xem xét'
                        )}
                      </Button>
                    )}
                    {canResolve && (
                      <Button
                        type="button"
                        onClick={handleResolveDispute}
                        disabled={actionLoading}
                        className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          'Kết thúc tranh chấp'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


