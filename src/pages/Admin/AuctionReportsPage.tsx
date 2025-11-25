import { useCallback, useEffect, useState, useMemo } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { Card } from "../../components/ui/card"
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/simple-table"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Search, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { AuctionHeaderCard } from "../../components/auction/auction-header-card"
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { reportApi } from "../../services/api"
import { auctionApi } from "../../services/api/auctionApi"
import { farmApi } from "../../services/api/farmApi"
import type { PaginatedReports, ReportStatus, ReportType } from "../../types"
import type { ApiEnglishAuction } from "../../types/api"
import { useToastContext } from "../../contexts/ToastContext"
import { REPORT_MESSAGES, REPORT_STATUS_LABELS, TOAST_TITLES } from "../../services/constants/messages"
import { ROUTES } from "../../constants"
import { ArrowLeft } from "lucide-react"

const reportStatuses: ReportStatus[] = ["Pending", "InReview", "Resolved", "ActionTaken", "Rejected"]
const reportTypes: ReportType[] = ["Fraud", "FalseInformation", "TechnicalIssue", "PolicyViolated", "Other"]

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  Fraud: "Gian lận",
  FalseInformation: "Thông tin sai",
  TechnicalIssue: "Lỗi kỹ thuật",
  PolicyViolated: "Vi phạm chính sách",
  Other: "Khác",
}

export default function AuctionReportsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [auction, setAuction] = useState<ApiEnglishAuction | null>(null)
  const [farmName, setFarmName] = useState<string>('Unknown')
  const [loading, setLoading] = useState<boolean>(true)
  const [filters, setFilters] = useState<{ status?: ReportStatus; type?: ReportType }>({})
  const [reports, setReports] = useState<PaginatedReports | null>(null)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { toast } = useToastContext()

  // Fetch auction data
  useEffect(() => {
    const fetchAuctionData = async () => {
      if (!id) return
      try {
        setLoading(true)
        const auctionRes = await auctionApi.getEnglishAuctionById(id)
        if (!auctionRes.isSuccess || !auctionRes.data) return
        const auctionData = auctionRes.data
        setAuction(auctionData)

        const farmsRes = await farmApi.getFarms()
        if (farmsRes.isSuccess && farmsRes.data) {
          const farm = farmsRes.data.find(f => f.userId === auctionData.farmerId)
          if (farm) {
            setFarmName(farm.name)
          }
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAuctionData()
  }, [id])

  const handleFilterChange = (key: 'status' | 'type', value?: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
    setPageNumber(1)
  }

  const fetchReports = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!id) return
    const { silent = false } = options
    try {
      setReportsLoading(true)
      setError(null)
      const response = await reportApi.getReportsByAuctionId(id)
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
      setReportsLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    if (id) {
      fetchReports({ silent: true })
    }
  }, [fetchReports, id])

  const handlePageChange = (direction: 'prev' | 'next') => {
    setPageNumber(prev => Math.max(1, prev + (direction === 'next' ? 1 : -1)))
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPageNumber(1)
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

  // Filter reports by search term and status/type filters
  const filteredReports = useMemo(() => {
    if (!reports?.items) return []
    let filtered = reports.items

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(report => report.reportStatus === filters.status)
    }

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(report => report.reportType === filters.type)
    }

    // Apply search term filter
    const keyword = searchTerm.trim().toLowerCase()
    if (keyword) {
      filtered = filtered.filter(report =>
        report.note.toLowerCase().includes(keyword) ||
        report.auctionId.toLowerCase().includes(keyword) ||
        report.reporterId.toLowerCase().includes(keyword) ||
        REPORT_TYPE_LABELS[report.reportType].toLowerCase().includes(keyword)
      )
    }

    return filtered
  }, [reports, searchTerm, filters.status, filters.type])

  // Paginate filtered reports
  const totalFilteredCount = filteredReports.length
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize))
  const startIndex = (pageNumber - 1) * pageSize
  const paginatedReports = filteredReports.slice(startIndex, startIndex + pageSize)

  // Helper functions
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

  const getActiveTab = () => {
    if (location.pathname.includes('/bid-history')) return 'bid-history'
    if (location.pathname.includes('/winner')) return 'winner'
    if (location.pathname.includes('/reports')) return 'reports'
    return 'overview'
  }

  const handleTabChange = (value: string) => {
    if (!id) return
    if (value === 'overview') {
      navigate(`/admin/auctions/${id}`)
    } else if (value === 'bid-history') {
      navigate(`/admin/auctions/${id}/bid-history`)
    } else if (value === 'winner') {
      navigate(`/admin/auctions/${id}/winner`)
    } else if (value === 'reports') {
      navigate(`/admin/auctions/${id}/reports`)
    }
  }

  if (loading) return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Đang tải...</p>
      </div>
    </div>
  )

  if (!auction) return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Không tìm thấy phiên đấu giá</p>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      {/* Header with Tabs */}
      <div className="mb-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <button
              onClick={() => navigate(ROUTES.ADMIN_AUCTIONS)}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-base font-semibold mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Chi Tiết Phiên Đấu Giá</h1>
          </div>
        </div>

        {/* Tab Navigation - Below Title */}
        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
            <TabsTrigger value="bid-history">Lịch Sử Đấu Giá</TabsTrigger>
            <TabsTrigger value="winner">Người Thắng Đấu Giá</TabsTrigger>
            <TabsTrigger value="reports">Báo Cáo</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content - Reports */}
      <div className="space-y-6">
        {/* Auction Header Card */}
        <AuctionHeaderCard auction={auction} farmName={farmName} />

        {/* Filters */}
        <Card className="p-6">
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
                  value={pageSize}
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

        {/* Reports Table */}
        <Card className="p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Danh sách báo cáo</h2>
              <p className="text-sm text-gray-600">
                {reportsLoading ? "Đang tải..." : reports ? `Hiển thị ${paginatedReports.length} / ${totalFilteredCount} báo cáo (tổng ${reports.totalCount})` : "Chưa có dữ liệu"}
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
                disabled={reportsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${reportsLoading ? "animate-spin" : ""}`} />
                {reportsLoading ? "Đang tải..." : "Làm mới"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {reportsLoading ? (
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left min-w-[120px]">Loại báo cáo</TableHead>
                    <TableHead className="text-left min-w-[200px]">Nội dung</TableHead>
                    <TableHead className="text-left min-w-[150px]">Người báo cáo</TableHead>
                    <TableHead className="text-left min-w-[120px]">Trạng thái</TableHead>
                    <TableHead className="text-left min-w-[150px]">Ngày tạo</TableHead>
                    <TableHead className="text-right min-w-[200px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i} className="hover:bg-gray-50">
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell className="text-right"><div className="h-8 bg-gray-200 rounded animate-pulse w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
            ) : paginatedReports.length > 0 ? (
              <>
                <SimpleTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left min-w-[120px]">Loại báo cáo</TableHead>
                      <TableHead className="text-left min-w-[200px]">Nội dung</TableHead>
                      <TableHead className="text-left min-w-[150px]">Người báo cáo</TableHead>
                      <TableHead className="text-left min-w-[120px]">Trạng thái</TableHead>
                      <TableHead className="text-left min-w-[150px]">Ngày tạo</TableHead>
                      <TableHead className="text-right min-w-[200px]">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.map(report => (
                      <TableRow key={report.id} className="hover:bg-gray-50">
                        <TableCell className="min-h-[48px]">
                          <div className="font-medium text-gray-900">{REPORT_TYPE_LABELS[report.reportType]}</div>
                        </TableCell>
                        <TableCell className="min-h-[48px]">
                          <div className="text-sm text-gray-700 line-clamp-2" title={report.note}>
                            {report.note}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm min-h-[48px]">
                          <div className="truncate max-w-[200px]" title={report.reporterId}>
                            {report.reporterId}
                          </div>
                        </TableCell>
                        <TableCell className="min-h-[48px]">{getStatusBadge(report.reportStatus)}</TableCell>
                        <TableCell className="text-sm min-h-[48px]">{formatDate(report.createdAt)}</TableCell>
                        <TableCell className="text-right min-h-[48px]">
                          {report.reportStatus === "Pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateStatus(report.id, "InReview")}
                                disabled={Boolean(updatingId)}
                                className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
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
                                className="text-red-600 border-red-600 hover:bg-red-50"
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
                {totalPages > 1 && (
                  <div className="flex items-center justify-end mt-4 text-sm">
                    <span className="text-gray-600 mr-4">
                      Trang {pageNumber} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange("prev")}
                        disabled={reportsLoading || pageNumber <= 1}
                      >
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange("next")}
                        disabled={reportsLoading || pageNumber >= totalPages}
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
                    : "Hiện tại chưa có báo cáo nào cho phiên đấu giá này"}
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
    </div>
  )
}

