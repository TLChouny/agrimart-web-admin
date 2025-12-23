import { useCallback, useEffect, useState, useMemo } from "react"
import { Card } from "../../components/ui/card"
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/simple-table"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Search, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Filter, ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { reportApi } from "../../services/api"
import { userApi } from "../../services/api/userApi"
import { auctionApi } from "../../services/api/auctionApi"
import type { PaginatedReports, ReportListParams, ReportStatus, ReportType, ReportItem } from "../../types"
import type { User as ApiUser, ListResponse } from "../../types/api"
import { useToastContext } from "../../contexts/ToastContext"
import { REPORT_MESSAGES, REPORT_STATUS_LABELS, TOAST_TITLES } from "../../services/constants/messages"

const reportStatuses: ReportStatus[] = ["Pending", "InReview", "Resolved", "ActionTaken", "Rejected"]
const reportTypes: ReportType[] = ["Fraud", "FalseInformation", "TechnicalIssue", "PolicyViolated", "Other"]

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  Fraud: "Gian lận",
  FalseInformation: "Thông tin sai",
  TechnicalIssue: "Lỗi kỹ thuật",
  PolicyViolated: "Vi phạm chính sách",
  Other: "Khác",
}

const compactHeadClass = "text-left px-3 py-2 text-xs whitespace-nowrap"
const compactCellClass = "px-3 py-2 text-xs align-top"

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportListParams>({ pageNumber: 1, pageSize: 10 })
  const [reports, setReports] = useState<PaginatedReports | null>(null)
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [auctionMap, setAuctionMap] = useState<Record<string, string>>({})
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [reportToUpdate, setReportToUpdate] = useState<ReportItem | null>(null)
  const [pendingStatus, setPendingStatus] = useState<ReportStatus | null>(null)
  const { toast } = useToastContext()

  const handleFilterChange = (key: keyof ReportListParams, value?: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined, pageNumber: 1 }))
  }

  const fetchReports = useCallback(async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options
    try {
      setLoading(true)
      setError(null)
      const response = await reportApi.getReports(filters)
      if (response.data) {
        setReports(response.data)
        if (!silent) {
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: REPORT_MESSAGES.FETCH_SUCCESS,
          })
        }
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : REPORT_MESSAGES.FETCH_ERROR
      setError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [filters, toast])

  // Fetch auctions and users for mapping
  useEffect(() => {
    const fetchAuctionAndUserData = async () => {
      try {
        // Fetch all auctions (fetch multiple pages if needed)
        const auctionMap: Record<string, string> = {}
        let pageNumber = 1
        let hasMore = true
        const pageSize = 100
        
        while (hasMore) {
          const auctionsRes = await auctionApi.getEnglishAuctions(undefined, pageNumber, pageSize)
          if (auctionsRes.isSuccess && auctionsRes.data?.items) {
            const items = auctionsRes.data.items
            items.forEach(auction => {
              auctionMap[auction.id] = auction.sessionCode || auction.id
            })
            
            // If we got less than pageSize items, we've reached the end
            hasMore = items.length === pageSize
            pageNumber++
          } else {
            hasMore = false
          }
        }
        
        setAuctionMap(auctionMap)

        // Fetch all users
        const usersRes = await userApi.list()
        if (usersRes.isSuccess && usersRes.data) {
          const payload = usersRes.data as ApiUser[] | ListResponse<ApiUser>
          const apiUsers: ApiUser[] = Array.isArray(payload) ? payload : (payload?.items ?? [])
          const userMap: Record<string, string> = {}
          apiUsers.forEach(user => {
            userMap[user.id] = `${user.firstName} ${user.lastName}`.trim() || user.email
          })
          setUserMap(userMap)
        }
      } catch (err) {
        console.error('Error fetching auction and user data:', err)
      }
    }

    fetchAuctionAndUserData()
  }, [])

  useEffect(() => {
    fetchReports({ silent: true })
  }, [fetchReports])

  const handlePageChange = (direction: 'prev' | 'next') => {
    setFilters(prev => ({
      ...prev,
      pageNumber: Math.max(1, (prev.pageNumber ?? 1) + (direction === 'next' ? 1 : -1)),
    }))
  }


  const handleUpdateStatusClick = (report: ReportItem, status: ReportStatus) => {
    setReportToUpdate(report)
    setPendingStatus(status)
    setConfirmModalOpen(true)
  }

  const handleConfirmUpdateStatus = async () => {
    if (!reportToUpdate || !pendingStatus) return
    
    try {
      setUpdatingId(reportToUpdate.id)
      setError(null)
      await reportApi.updateReportStatus(reportToUpdate.id, pendingStatus)
      toast({
        title: TOAST_TITLES.SUCCESS,
        description: REPORT_MESSAGES.UPDATE_SUCCESS,
      })
      setConfirmModalOpen(false)
      setReportToUpdate(null)
      setPendingStatus(null)
      await fetchReports({ silent: true })
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : REPORT_MESSAGES.UPDATE_ERROR
      setError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: "destructive",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Helper functions
  const getAuctionName = useCallback((auctionId: string): string => {
    return auctionMap[auctionId] || auctionId
  }, [auctionMap])

  const getReporterName = useCallback((reporterId: string): string => {
    return userMap[reporterId] || reporterId
  }, [userMap])

  // Filter reports by search term
  const filteredReports = useMemo(() => {
    if (!reports?.items) return []
    const keyword = searchTerm.trim().toLowerCase()
    const filtered = !keyword 
      ? reports.items 
      : reports.items.filter(report =>
          report.note.toLowerCase().includes(keyword) ||
          report.auctionId.toLowerCase().includes(keyword) ||
          getAuctionName(report.auctionId).toLowerCase().includes(keyword) ||
          report.reporterId.toLowerCase().includes(keyword) ||
          getReporterName(report.reporterId).toLowerCase().includes(keyword) ||
          REPORT_TYPE_LABELS[report.reportType].toLowerCase().includes(keyword)
        )
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA // Mới nhất trước
    })
  }, [reports, searchTerm, getAuctionName, getReporterName])

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">{REPORT_STATUS_LABELS[status]}</Badge>
      case "InReview":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">{REPORT_STATUS_LABELS[status]}</Badge>
      case "Resolved":
        return <Badge variant="outline" className="text-emerald-600 border-emerald-600">{REPORT_STATUS_LABELS[status]}</Badge>
      case "ActionTaken":
        return <Badge variant="outline" className="text-purple-600 border-purple-600">{REPORT_STATUS_LABELS[status]}</Badge>
      case "Rejected":
        return <Badge variant="outline" className="text-red-600 border-red-600">{REPORT_STATUS_LABELS[status]}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="mx-auto max-w-[1800px] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Báo cáo</h1>
        <p className="text-base text-gray-600">Quản lý báo cáo và cập nhật trạng thái xử lý.</p>
      </div>

      <Card className="p-6">
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Danh sách báo cáo</h2>
              <p className="text-sm text-gray-600">
                {loading ? "Đang tải..." : reports ? `Hiển thị ${filteredReports.length} / ${reports.totalCount} báo cáo` : "Chưa có dữ liệu"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo nội dung, mã phiên..."
                  className="pl-9"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchReports()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Đang tải..." : "Làm mới"}
              </Button>
            </div>
          </div>

          {/* Bộ lọc theo style AuctionsPage */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Button tabs cho trạng thái */}
            <button
              type="button"
              onClick={() => handleFilterChange("status", undefined)}
              className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                !filters.status
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:text-emerald-700'
              }`}
            >
              Tất cả trạng thái
              {reports && (
                <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs">
                  {reports.totalCount}
                </span>
              )}
            </button>

            {reportStatuses.map(status => {
              const count = reports?.items?.filter(r => r.reportStatus === status).length ?? 0
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleFilterChange("status", status)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    filters.status === status
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:text-emerald-700'
                  }`}
                >
                  {REPORT_STATUS_LABELS[status]}
                  {reports && (
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Dropdown cho loại báo cáo */}
            <div className="relative">
              <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${
                filters.type ? 'text-emerald-600' : 'text-gray-400'
              }`} />
              <select
                value={filters.type ?? ""}
                onChange={e => handleFilterChange("type", e.target.value || undefined)}
                className={`appearance-none rounded-2xl border px-10 py-2 pr-8 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                  filters.type
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:text-emerald-700'
                }`}
              >
                <option value="">Tất cả loại báo cáo</option>
                {reportTypes.map(type => {
                  const count = reports?.items?.filter(r => r.reportType === type).length ?? 0
                  return (
                    <option key={type} value={type}>
                      {REPORT_TYPE_LABELS[type]} {reports && `(${count})`}
                    </option>
                  )
                })}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${
                filters.type ? 'text-emerald-600' : 'text-gray-400'
              }`} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <SimpleTable className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className={`${compactHeadClass} w-[12%] min-w-[90px]`}>Loại báo cáo</TableHead>
                  <TableHead className={`${compactHeadClass} w-[2%] min-w-[150px]`}>Nội dung</TableHead>
                  <TableHead className={`${compactHeadClass} w-[15%] min-w-[120px]`}>Mã phiên đấu giá</TableHead>
                  <TableHead className={`${compactHeadClass} w-[10%] min-w-[120px]`}>Người báo cáo</TableHead>
                  <TableHead className={`${compactHeadClass} w-[10%] min-w-[100px]`}>Trạng thái</TableHead>
                  <TableHead className={`${compactHeadClass} w-[13%] min-w-[120px]`}>Ngày tạo</TableHead>
                  <TableHead className={`${compactHeadClass} text-right w-[15%] min-w-[140px]`}>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i} className="hover:bg-gray-50">
                    <TableCell className={`${compactCellClass} w-[12%]`}><div className="h-3 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className={`${compactCellClass} w-[20%]`}><div className="h-3 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className={`${compactCellClass} w-[15%]`}><div className="h-3 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className={`${compactCellClass} w-[15%]`}><div className="h-3 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className={`${compactCellClass} w-[10%]`}><div className="h-3 bg-gray-200 rounded animate-pulse w-16" /></TableCell>
                    <TableCell className={`${compactCellClass} w-[13%]`}><div className="h-3 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className={`${compactCellClass} text-right w-[15%]`}><div className="h-6 bg-gray-200 rounded animate-pulse w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SimpleTable>
          ) : filteredReports.length > 0 ? (
            <>
              <SimpleTable className="text-xs">
                <TableHeader>
                  <TableRow>
                  <TableHead className={`${compactHeadClass} w-[12%] min-w-[90px]`}>Loại báo cáo</TableHead>
                  <TableHead className={`${compactHeadClass} w-[20%] min-w-[150px]`}>Nội dung</TableHead>
                  <TableHead className={`${compactHeadClass} w-[15%] min-w-[120px]`}>Mã phiên đấu giá</TableHead>
                  <TableHead className={`${compactHeadClass} w-[15%] min-w-[120px]`}>Người báo cáo</TableHead>
                  <TableHead className={`${compactHeadClass} w-[10%] min-w-[100px]`}>Trạng thái</TableHead>
                  <TableHead className={`${compactHeadClass} w-[13%] min-w-[120px]`}>Ngày tạo</TableHead>
                  <TableHead className={`${compactHeadClass} text-right w-[15%] min-w-[140px]`}>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map(report => (
                    <TableRow key={report.id} className="hover:bg-gray-50">
                      <TableCell className={`${compactCellClass} w-[12%]`}>
                        <div className="font-medium text-gray-900 truncate">{REPORT_TYPE_LABELS[report.reportType]}</div>
                      </TableCell>
                      <TableCell className={`${compactCellClass} w-[20%]`}>
                        <div className="text-xs text-gray-700 line-clamp-2" title={report.note}>
                          {report.note}
                        </div>
                      </TableCell>
                      <TableCell className={`${compactCellClass} w-[15%]`}>
                        <div className="truncate max-w-[200px]" title={getAuctionName(report.auctionId)}>
                          {getAuctionName(report.auctionId)}
                        </div>
                      </TableCell>
                      <TableCell className={`${compactCellClass} w-[15%]`}>
                        <div className="truncate max-w-[200px]" title={getReporterName(report.reporterId)}>
                          {getReporterName(report.reporterId)}
                        </div>
                      </TableCell>
                      <TableCell className={`${compactCellClass} w-[10%]`}>{getStatusBadge(report.reportStatus)}</TableCell>
                      <TableCell className={`${compactCellClass} w-[13%]`}>{formatDate(report.createdAt)}</TableCell>
                      <TableCell className={`${compactCellClass} text-right w-[15%]`}>
                        {report.reportStatus === "Pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatusClick(report, "InReview")}
                              disabled={Boolean(updatingId)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Xem xét
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatusClick(report, "Rejected")}
                              disabled={Boolean(updatingId)}
                              className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Từ chối
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
              {reports && reports.totalPages > 1 && (
                <div className="flex items-center justify-end mt-4 text-sm">
                  <span className="text-gray-600 mr-4">
                    Trang {reports.pageNumber} / {reports.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange("prev")}
                      disabled={loading || reports.previousPage === false}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange("next")}
                      disabled={loading || reports.nextPage === false}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "Không tìm thấy báo cáo" : "Chưa có báo cáo nào"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm
                  ? "Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc"
                  : "Hiện tại chưa có báo cáo nào trong hệ thống"}
              </p>
              {searchTerm && (
                <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                  Xóa tìm kiếm
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={pendingStatus === "InReview" ? "text-emerald-600" : "text-red-600"}>
              {pendingStatus === "InReview" ? "Xác nhận xem xét báo cáo" : "Xác nhận từ chối báo cáo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              {pendingStatus === "InReview" 
                ? "Bạn có chắc chắn muốn chuyển báo cáo này sang trạng thái 'Đang xem xét'?"
                : "Bạn có chắc chắn muốn từ chối báo cáo này? Hành động này không thể hoàn tác."}
            </p>
            {reportToUpdate && (
              <div className="rounded-lg bg-gray-50 p-3 space-y-1">
                <p className="text-sm font-medium text-gray-900">Loại: {REPORT_TYPE_LABELS[reportToUpdate.reportType]}</p>
                <p className="text-xs text-gray-600 line-clamp-2" title={reportToUpdate.note}>
                  {reportToUpdate.note}
                </p>
                <p className="text-xs text-gray-500">
                  Mã phiên: {getAuctionName(reportToUpdate.auctionId)}
                </p>
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmModalOpen(false)
                  setReportToUpdate(null)
                  setPendingStatus(null)
                }}
                disabled={Boolean(updatingId)}
              >
                Hủy
              </Button>
              <Button
                onClick={handleConfirmUpdateStatus}
                disabled={Boolean(updatingId)}
                className={pendingStatus === "InReview" 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"}
              >
                {updatingId ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    {pendingStatus === "InReview" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Xác nhận xem xét
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Xác nhận từ chối
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

