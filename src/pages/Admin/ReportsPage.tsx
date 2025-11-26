import { useCallback, useEffect, useState, useMemo } from "react"
import { Card } from "../../components/ui/card"
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/simple-table"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Search, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { reportApi } from "../../services/api"
import { userApi } from "../../services/api/userApi"
import { auctionApi } from "../../services/api/auctionApi"
import type { PaginatedReports, ReportListParams, ReportStatus, ReportType } from "../../types"
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

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportListParams>({ pageNumber: 1, pageSize: 10 })
  const [reports, setReports] = useState<PaginatedReports | null>(null)
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [auctionMap, setAuctionMap] = useState<Record<string, string>>({})
  const [userMap, setUserMap] = useState<Record<string, string>>({})
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

  const handlePageSizeChange = (size: number) => {
    setFilters(prev => ({
      ...prev,
      pageSize: size,
      pageNumber: 1,
    }))
  }

  const handleUpdateStatus = async (reportId: string, status: ReportStatus) => {
    try {
      setUpdatingId(reportId)
      setError(null)
      await reportApi.updateReportStatus(reportId, status)
      toast({
        title: TOAST_TITLES.SUCCESS,
        description: REPORT_MESSAGES.UPDATE_SUCCESS,
      })
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
    if (!keyword) return reports.items
    return reports.items.filter(report =>
      report.note.toLowerCase().includes(keyword) ||
      report.auctionId.toLowerCase().includes(keyword) ||
      getAuctionName(report.auctionId).toLowerCase().includes(keyword) ||
      report.reporterId.toLowerCase().includes(keyword) ||
      getReporterName(report.reporterId).toLowerCase().includes(keyword) ||
      REPORT_TYPE_LABELS[report.reportType].toLowerCase().includes(keyword)
    )
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

      <Card className="p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Bộ lọc</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white h-10"
                value={filters.status ?? ""}
                onChange={e => handleFilterChange("status", e.target.value || undefined)}
              >
                <option value="">Tất cả</option>
                {reportStatuses.map(status => (
                  <option key={status} value={status}>{REPORT_STATUS_LABELS[status]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loại báo cáo</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white h-10"
                value={filters.type ?? ""}
                onChange={e => handleFilterChange("type", e.target.value || undefined)}
              >
                <option value="">Tất cả</option>
                {reportTypes.map(type => (
                  <option key={type} value={type}>{REPORT_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kích thước trang</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white h-10"
                value={filters.pageSize ?? 10}
                onChange={e => handlePageSizeChange(Number(e.target.value))}
              >
                {[10, 20, 50].map(size => (
                  <option key={size} value={size}>{size} kết quả</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </Card>

      <Card className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
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
              variant="outline"
              size="sm"
              onClick={() => fetchReports()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Đang tải..." : "Làm mới"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <SimpleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left w-[12%] min-w-[130px]">Loại báo cáo</TableHead>
                  <TableHead className="text-left w-[20%] min-w-[200px]">Nội dung</TableHead>
                  <TableHead className="text-left w-[15%] min-w-[150px]">Mã phiên đấu giá</TableHead>
                  <TableHead className="text-left w-[15%] min-w-[150px]">Người báo cáo</TableHead>
                  <TableHead className="text-left w-[10%] min-w-[120px]">Trạng thái</TableHead>
                  <TableHead className="text-left w-[13%] min-w-[150px]">Ngày tạo</TableHead>
                  <TableHead className="text-right w-[15%] min-w-[180px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i} className="hover:bg-gray-50">
                    <TableCell className="w-[12%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="w-[20%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="w-[15%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="w-[15%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="w-[10%]"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                    <TableCell className="w-[13%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="text-right w-[15%]"><div className="h-8 bg-gray-200 rounded animate-pulse w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SimpleTable>
          ) : filteredReports.length > 0 ? (
            <>
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left w-[12%] min-w-[130px]">Loại báo cáo</TableHead>
                    <TableHead className="text-left w-[20%] min-w-[200px]">Nội dung</TableHead>
                    <TableHead className="text-left w-[15%] min-w-[150px]">Mã phiên đấu giá</TableHead>
                    <TableHead className="text-left w-[15%] min-w-[150px]">Người báo cáo</TableHead>
                    <TableHead className="text-left w-[10%] min-w-[120px]">Trạng thái</TableHead>
                    <TableHead className="text-left w-[13%] min-w-[150px]">Ngày tạo</TableHead>
                    <TableHead className="text-right w-[15%] min-w-[180px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map(report => (
                    <TableRow key={report.id} className="hover:bg-gray-50">
                      <TableCell className="min-h-[48px] w-[12%]">
                        <div className="font-medium text-gray-900">{REPORT_TYPE_LABELS[report.reportType]}</div>
                      </TableCell>
                      <TableCell className="min-h-[48px] w-[20%]">
                        <div className="text-sm text-gray-700 line-clamp-2" title={report.note}>
                          {report.note}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm min-h-[48px] w-[15%]">
                        <div className="truncate max-w-[200px]" title={getAuctionName(report.auctionId)}>
                          {getAuctionName(report.auctionId)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm min-h-[48px] w-[15%]">
                        <div className="truncate max-w-[200px]" title={getReporterName(report.reporterId)}>
                          {getReporterName(report.reporterId)}
                        </div>
                      </TableCell>
                      <TableCell className="min-h-[48px] w-[10%]">{getStatusBadge(report.reportStatus)}</TableCell>
                      <TableCell className="text-sm min-h-[48px] w-[13%]">{formatDate(report.createdAt)}</TableCell>
                      <TableCell className="text-right min-h-[48px] w-[15%]">
                        {report.reportStatus === "Pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(report.id, "InReview")}
                              disabled={Boolean(updatingId)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {updatingId === report.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Đang cập nhật...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Xem xét
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(report.id, "Rejected")}
                              disabled={Boolean(updatingId)}
                              className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-600"
                            >
                              {updatingId === report.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Đang cập nhật...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Từ chối
                                </>
                              )}
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
    </div>
  )
}

