import { useCallback, useEffect, useMemo, useState } from "react"
import { StatsCards, type DashboardStatCard } from "../../components/admin/stats-cards"
import { RevenueAnalytics } from "../../components/admin/revenue-analytics"
import { ShippingInfo, type AuctionProgressItem, type AuctionStep } from "../../components/admin/shipping-info"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { RefreshCw, Gavel, User, Wallet } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { farmApi } from "../../services/api/farmApi"
import { auctionApi } from "../../services/api/auctionApi"
import { reportApi } from "../../services/api/reportApi"
import { userApi } from "../../services/api/userApi"
import { walletApi } from "../../services/api/walletApi"
import type {
  ApiFarm,
  ApiEnglishAuction,
  ReportItem,
  ApiAuctionBidLog,
  User as ApiUser,
  ApiWithdrawRequest,
  ApiWallet,
  ApiLedger,
} from "../../types/api"
import { useToastContext } from "../../contexts/ToastContext"
import { TOAST_TITLES } from "../../services/constants/messages"
import { useAutoRefresh } from "../../hooks/useAutoRefresh"
import { formatCurrencyVND } from "../../utils/currency"

const BASE_AUCTION_STEPS: AuctionStep[] = ["Tạo phiên", "Xác thực", "Đang diễn ra", "Kết thúc"]

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value)

const formatTime = (iso?: string | null) => {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
}

const getRelativeTime = (iso?: string | null) => {
  if (!iso) return "Vừa cập nhật"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Vừa cập nhật"
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return "Vừa xong"
  if (diffMinutes < 60) return `${diffMinutes} phút trước`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} giờ trước`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} ngày trước`
}

const AUCTION_STATUS_META: Record<
  ApiEnglishAuction["status"],
  { label: string; step: number; tone: AuctionProgressItem["badgeTone"] }
> = {
  Draft: { label: "Bản nháp", step: 0, tone: "yellow" },
  Pending: { label: "Chờ duyệt", step: 1, tone: "yellow" },
  Approved: { label: "Đã duyệt", step: 1, tone: "blue" },
  OnGoing: { label: "Đang diễn ra", step: 2, tone: "blue" },
  Pause: { label: "Tạm dừng", step: 2, tone: "yellow" },
  Completed: { label: "Hoàn tất", step: 3, tone: "green" },
  NoWinner: { label: "Không có người thắng", step: 3, tone: "red" },
  Cancelled: { label: "Đã hủy", step: 3, tone: "red" },
  Rejected: { label: "Bị từ chối", step: 1, tone: "red" },
}

interface WithdrawRequestItem {
  id: string
  userId: string
  userName?: string
  email?: string
  amount: number
  status: number // 0: Pending, 1: Approved, 2: Rejected, 3: Completed, 4: Cancelled
  createdAt: string
  reason?: string | null
}

const WITHDRAW_STATUS_LABELS: Record<number, { label: string; accent: "green" | "blue" | "yellow" | "red" }> = {
  0: { label: "Chờ duyệt", accent: "yellow" },
  1: { label: "Đã duyệt", accent: "blue" },
  2: { label: "Đã từ chối", accent: "red" },
  3: { label: "Đã hoàn tất", accent: "green" },
  4: { label: "Đã hủy", accent: "red" },
}

const ACCENT_DOT_CLASS: Record<"green" | "blue" | "yellow" | "red", string> = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
}


interface TopAuctionItem {
  id: string
  sessionCode: string
  title: string
  revenue: number
  bidCount: number
  status: string
  createdAt: string
}

interface RecentFarmerItem {
  userId: string
  farmName: string
  farmCount: number
  createdAt: string
  userName?: string
  email?: string
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { toast } = useToastContext()

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingBids, setIsLoadingBids] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [farms, setFarms] = useState<ApiFarm[]>([])
  const [auctions, setAuctions] = useState<ApiEnglishAuction[]>([])
  const [reports, setReports] = useState<ReportItem[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [withdrawRequests, setWithdrawRequests] = useState<ApiWithdrawRequest[]>([])
  const [systemWallet, setSystemWallet] = useState<ApiWallet | null>(null)
  const [systemLedgers, setSystemLedgers] = useState<ApiLedger[]>([])
  const [bidLogsMap, setBidLogsMap] = useState<Map<string, ApiAuctionBidLog[]>>(new Map())
  const [revenueViewMode, setRevenueViewMode] = useState<"month" | "year">("month")
  const [revenueOffset, setRevenueOffset] = useState(0) // 0 = current period, -1 = previous, etc.

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [farmRes, auctionRes, reportRes, userRes, withdrawRes, systemWalletRes] = await Promise.all([
        farmApi.getFarms(),
        auctionApi.getEnglishAuctions(undefined, 1, 200),
        reportApi.getReports({ pageNumber: 1, pageSize: 50 }),
        userApi.list(),
        walletApi.getWithdrawRequests(),
        walletApi.getSystemWallet(),
      ])

      setFarms(farmRes.data ?? [])
      setAuctions(auctionRes.data?.items ?? [])
      setReports(reportRes.data?.items ?? [])
      setWithdrawRequests(withdrawRes.data ?? [])
      setSystemWallet(systemWalletRes.data ?? null)
      
      // Handle both ListResponse and array formats
      const userData = userRes.data
      if (Array.isArray(userData)) {
        setUsers(userData)
      } else if (userData && 'items' in userData) {
        setUsers(userData.items)
      } else {
        setUsers([])
      }

      // Load system wallet ledgers if system wallet exists
      if (systemWalletRes.data?.id) {
        try {
          const ledgersRes = await walletApi.getLedgersByWallet(systemWalletRes.data.id)
          setSystemLedgers(ledgersRes.data ?? [])
        } catch (error) {
          console.error("Error loading system wallet ledgers:", error)
          setSystemLedgers([])
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải dữ liệu dashboard"
      setErrorMessage(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const loadBidLogs = useCallback(async (auctionIds: string[]) => {
    if (!auctionIds.length) return

    setIsLoadingBids(true)
    try {
      const bidLogPromises = auctionIds.map(auctionId =>
        auctionApi.getBidLogsByAuctionId(auctionId).catch(() => ({ data: [] }))
      )
      const bidLogResults = await Promise.all(bidLogPromises)

      const newMap = new Map<string, ApiAuctionBidLog[]>()
      auctionIds.forEach((auctionId, index) => {
        const logs = bidLogResults[index]?.data ?? []
        newMap.set(auctionId, logs)
      })
      setBidLogsMap(newMap)
    } catch (error) {
      console.error("Error loading bid logs:", error)
    } finally {
      setIsLoadingBids(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Load bid logs for top auctions
  useEffect(() => {
    if (auctions.length > 0) {
      const topAuctionIds = auctions
        .filter(a => a.status === "Completed" || a.status === "OnGoing")
        .slice(0, 10)
        .map(a => a.id)
      loadBidLogs(topAuctionIds)
    }
  }, [auctions, loadBidLogs])

  // Tự động refresh data mỗi 30 giây
  useAutoRefresh(loadDashboardData, 30000, true, false)

  const filteredAuctions = useMemo(() => {
    return auctions
  }, [auctions])

  const statsCards = useMemo<DashboardStatCard[]>(() => {
    const totalFarms = farms.length
    const activeFarms = farms.filter(farm => farm.isActive).length
    const runningAuctions = filteredAuctions.filter(auction => auction.status === "OnGoing").length
    const waitingAuctions = filteredAuctions.filter(auction => auction.status === "Pending").length
    const totalRevenue = systemWallet?.balance ?? 0
    const pendingReports = reports.filter(report => report.reportStatus === "Pending").length
    const resolvedReports = reports.length - pendingReports

    return [
      {
        title: "Tổng nông trại",
        value: formatNumber(totalFarms),
        change: `${formatNumber(activeFarms)} đang hoạt động`,
        trend: "up",
        highlight: true,
      },
      {
        title: "Phiên đấu giá đang chạy",
        value: formatNumber(runningAuctions),
        change: `${formatNumber(waitingAuctions)} phiên chờ mở`,
        trend: "up",
      },
      {
        title: "Tổng doanh thu",
        value: formatCurrencyVND(totalRevenue, { fallback: "0 VND" }),
        change: "Số dư ví hệ thống",
        trend: "up",
      },
      {
        title: "Báo cáo chờ xử lý",
        value: formatNumber(pendingReports),
        change: `${formatNumber(Math.max(resolvedReports, 0))} đã xử lý`,
        trend: pendingReports > resolvedReports ? "up" : "neutral",
      },
    ]
  }, [farms, filteredAuctions, reports, systemWallet])

  const revenueChartData = useMemo(() => {
    if (!systemLedgers.length || !systemWallet) return { data: [], currentPeriod: "", canGoPrevious: false, canGoNext: false }
    
    const now = new Date()
    let startDate: Date
    let endDate: Date
    let periodLabel: string

    if (revenueViewMode === "month") {
      // Calculate month based on offset
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + revenueOffset, 1)
      startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
      endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59)
      periodLabel = `T${targetMonth.getMonth() + 1}/${targetMonth.getFullYear()}`
    } else {
      // Calculate year based on offset
      const targetYear = now.getFullYear() + revenueOffset
      startDate = new Date(targetYear, 0, 1)
      endDate = new Date(targetYear, 11, 31, 23, 59, 59)
      periodLabel = `Năm ${targetYear}`
    }

    // Filter ledgers within the selected period
    const filteredLedgers = systemLedgers.filter(ledger => {
      if (!ledger.createdAt) return false
      const date = new Date(ledger.createdAt)
      return date >= startDate && date <= endDate
    })

    const buckets = new Map<
      string,
      {
        label: string
        credit: number
        debit: number
        order: number
      }
    >()

    filteredLedgers.forEach(ledger => {
      if (!ledger.createdAt) return
      const date = new Date(ledger.createdAt)
      if (Number.isNaN(date.getTime())) return

      let key: string
      let label: string
      let order: number

      if (revenueViewMode === "month") {
        // Group by day within the month
        const day = date.getDate()
        key = `${date.getFullYear()}-${date.getMonth()}-${day}`
        label = `Ngày ${day}`
        order = day
      } else {
        // Group by month within the year
        const monthIndex = date.getMonth()
        key = `${date.getFullYear()}-${monthIndex}`
        label = `T${monthIndex + 1}`
        order = monthIndex
      }

      const existing = buckets.get(key)
      if (ledger.direction === 1) {
        // Credit - tiền vào
        buckets.set(key, {
          label,
          order,
          credit: (existing?.credit ?? 0) + ledger.amount,
          debit: existing?.debit ?? 0,
        })
      } else {
        // Debit - tiền ra
        buckets.set(key, {
          label,
          order,
          credit: existing?.credit ?? 0,
          debit: (existing?.debit ?? 0) + ledger.amount,
        })
      }
    })

    const data = Array.from(buckets.values())
      .sort((a, b) => a.order - b.order)
      .map(({ label, credit, debit }) => ({ label, credit, debit }))

    // Check if can navigate
    const canGoPrevious = revenueViewMode === "month" 
      ? revenueOffset > -12 // Allow up to 12 months back
      : revenueOffset > -5 // Allow up to 5 years back
    
    const canGoNext = revenueOffset < 0 // Can only go forward if we're in the past

    return {
      data,
      currentPeriod: periodLabel,
      canGoPrevious,
      canGoNext,
    }
  }, [systemLedgers, systemWallet, revenueViewMode, revenueOffset])

  const recentFarmers = useMemo<RecentFarmerItem[]>(() => {
    if (!farms.length) return []

    // Group farms by userId and get the earliest farm creation date for each farmer
    const farmerMap = new Map<string, { farms: ApiFarm[]; earliestCreatedAt: string }>()
    
    farms.forEach(farm => {
      const existing = farmerMap.get(farm.userId)
      if (!existing) {
        farmerMap.set(farm.userId, {
          farms: [farm],
          earliestCreatedAt: farm.createdAt,
        })
      } else {
        existing.farms.push(farm)
        // Use the earliest farm creation date as the farmer registration date
        if (new Date(farm.createdAt) < new Date(existing.earliestCreatedAt)) {
          existing.earliestCreatedAt = farm.createdAt
        }
      }
    })

    // Convert to array and get user info
    const farmerList: RecentFarmerItem[] = Array.from(farmerMap.entries()).map(([userId, data]) => {
      const user = users.find(u => u.id === userId)
      const firstFarm = data.farms[0]

      return {
        userId,
        farmName: firstFarm.name,
        farmCount: data.farms.length,
        createdAt: data.earliestCreatedAt,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        email: user?.email,
      }
    })

    // Sort by creation date (newest first) and take top 5
    return farmerList
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [farms, users])

  const topBiddingAuctions = useMemo<TopAuctionItem[]>(() => {
    return filteredAuctions
      .filter(a => a.status === "Completed" || a.status === "OnGoing")
      .map(auction => {
        const bidLogs = bidLogsMap.get(auction.id) ?? []
        return {
          id: auction.id,
          sessionCode: auction.sessionCode,
          title: auction.note || `Phiên ${auction.sessionCode}`,
          revenue: auction.winningPrice ?? auction.currentPrice ?? auction.startingPrice ?? 0,
          bidCount: bidLogs.length,
          status: auction.status,
          createdAt: auction.createdAt,
        }
      })
      .filter(a => a.bidCount > 0)
      .sort((a, b) => b.bidCount - a.bidCount)
      .slice(0, 5)
  }, [filteredAuctions, bidLogsMap])


  const auctionProgress = useMemo<AuctionProgressItem[]>(() => {
    if (!filteredAuctions.length) return []
    // Hiển thị các phiên đấu giá mới nhất (sắp xếp theo createdAt)
    return filteredAuctions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
      .map(auction => {
        const meta = AUCTION_STATUS_META[auction.status] ?? AUCTION_STATUS_META.Draft
        const steps = BASE_AUCTION_STEPS.map((label, index) => ({
          label,
          completed: index < meta.step,
          current: index === meta.step,
          time:
            index === 0
              ? formatTime(auction.createdAt)
              : index === 2
                ? formatTime(auction.publishDate)
                : index === 3
                  ? formatTime(auction.endDate)
                  : undefined,
        }))

        return {
          id: auction.sessionCode,
          title: auction.note || `Phiên ${auction.sessionCode}`,
          status: meta.label,
          badgeTone: meta.tone,
          steps,
        }
      })
  }, [filteredAuctions])

  const recentWithdrawRequests = useMemo<WithdrawRequestItem[]>(() => {
    if (!withdrawRequests.length) return []

    // Map withdraw requests with user info
    const requests: WithdrawRequestItem[] = withdrawRequests.map(request => {
      const user = users.find(u => u.id === request.userId)
      return {
        id: request.id,
        userId: request.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        email: user?.email,
        amount: request.amount,
        status: request.status,
        createdAt: request.createdAt,
        reason: request.reason,
      }
    })

    // Sort by creation date (newest first) and take top 5
    return requests
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [withdrawRequests, users])

  const WithdrawSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={`withdraw-skeleton-${index}`} className="flex items-center gap-3 animate-pulse">
          <div className="w-2 h-2 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 bg-gray-200 rounded" />
            <div className="h-3 w-1/3 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển</h1>
          <p className="text-gray-600">Quản lý nông trại, phiên đấu giá và yêu cầu thu mua trong một nơi.</p>
          {errorMessage && <p className="text-sm text-red-600 mt-2">{errorMessage}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Select
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value as TimeFilter)}
              options={TIME_FILTER_OPTIONS}
              className="w-[140px]"
            />
          </div> */}
          <Button onClick={() => navigate("/admin/reports")}>Quản lý báo cáo</Button>
          <Button variant="outline" onClick={loadDashboardData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <StatsCards stats={statsCards} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-3">
          <RevenueAnalytics
            data={revenueChartData.data}
            isLoading={isLoading}
            viewMode={revenueViewMode}
            onViewModeChange={(mode) => {
              setRevenueViewMode(mode)
              setRevenueOffset(0) // Reset to current period when switching mode
            }}
            onPrevious={() => setRevenueOffset(prev => prev - 1)}
            onNext={() => setRevenueOffset(prev => prev + 1)}
            canGoPrevious={revenueChartData.canGoPrevious}
            canGoNext={revenueChartData.canGoNext}
            currentPeriod={revenueChartData.currentPeriod}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Nông dân mới đăng ký
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentFarmers.length > 0 ? (
              <div className="space-y-3">
                {recentFarmers.map((farmer, index) => (
                  <div
                    key={farmer.userId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {farmer.userName || farmer.email || "Nông dân"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {farmer.farmName} {farmer.farmCount > 1 && `(${farmer.farmCount} nông trại)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          {getRelativeTime(farmer.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-8 border border-dashed rounded-lg">
                Chưa có nông dân nào đăng ký gần đây.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Gavel className="w-5 h-5 text-blue-600" />
                Top đấu giá
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || isLoadingBids ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : topBiddingAuctions.length > 0 ? (
              <div className="space-y-3">
                {topBiddingAuctions.map((auction, index) => (
                  <div
                    key={auction.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{auction.title}</p>
                        <p className="text-xs text-gray-500">#{auction.sessionCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-blue-600">{auction.bidCount} lượt đấu giá</p>
                        <p className="text-xs text-gray-500">{formatCurrencyVND(auction.revenue)}</p>
                      </div>
          </div>
        </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-8 border border-dashed rounded-lg">
                Chưa có dữ liệu đấu giá.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        <ShippingInfo auctions={auctionProgress} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Các yêu cầu rút tiền gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <WithdrawSkeleton />
            ) : recentWithdrawRequests.length > 0 ? (
              <div className="space-y-3">
                {recentWithdrawRequests.map(request => {
                  const statusInfo = WITHDRAW_STATUS_LABELS[request.status] ?? WITHDRAW_STATUS_LABELS[0]
                  return (
                    <div key={request.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-2 h-2 rounded-full ${ACCENT_DOT_CLASS[statusInfo.accent]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {request.userName || request.email || `User ${request.userId.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {formatCurrencyVND(request.amount)} · {statusInfo.label}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{getRelativeTime(request.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-8 border border-dashed rounded-lg">
                Không có yêu cầu rút tiền nào gần đây.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}