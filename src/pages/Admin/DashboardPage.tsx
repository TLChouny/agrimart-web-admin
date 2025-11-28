import { useCallback, useEffect, useMemo, useState } from "react"
import { StatsCards, type DashboardStatCard } from "../../components/admin/stats-cards"
import { RevenueAnalytics, type RevenuePoint } from "../../components/admin/revenue-analytics"
import { DeliveryInfo, type DeliverySummaryItem } from "../../components/admin/delivery-info"
import { ShippingInfo, type AuctionProgressItem, type AuctionStep } from "../../components/admin/shipping-info"
import { Button } from "../../components/ui/button"
import { RefreshCw } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { farmApi } from "../../services/api/farmApi"
import { auctionApi } from "../../services/api/auctionApi"
import { reportApi } from "../../services/api/reportApi"
import { buyRequestApi } from "../../services/api/buyRequestApi"
import type {
  ApiFarm,
  ApiEnglishAuction,
  ApiBuyRequest,
  ReportItem,
  ReportType,
  BuyRequestStatus,
  OrderStatus,
} from "../../types/api"
import { useToastContext } from "../../contexts/ToastContext"
import { TOAST_TITLES } from "../../services/constants/messages"

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  Fraud: "Gian lận",
  FalseInformation: "Sai thông tin",
  TechnicalIssue: "Sự cố kỹ thuật",
  PolicyViolated: "Vi phạm chính sách",
  Other: "Khác",
}

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

const BUY_REQUEST_STATUS_TO_ORDER_STATUS: Record<BuyRequestStatus, OrderStatus> = {
  Pending: "pending",
  Approved: "confirmed",
  Rejected: "cancelled",
  Fulfilled: "delivered",
  Cancelled: "cancelled",
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

interface ActivityItem {
  id: string
  title: string
  subtitle: string
  time: string
  accent: "green" | "blue" | "yellow" | "red"
}

const ACCENT_DOT_CLASS: Record<ActivityItem["accent"], string> = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { toast } = useToastContext()

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [farms, setFarms] = useState<ApiFarm[]>([])
  const [auctions, setAuctions] = useState<ApiEnglishAuction[]>([])
  const [reports, setReports] = useState<ReportItem[]>([])
  const [buyRequests, setBuyRequests] = useState<ApiBuyRequest[]>([])

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [farmRes, auctionRes, reportRes, buyRequestRes] = await Promise.all([
        farmApi.getFarms(),
        auctionApi.getEnglishAuctions(undefined, 1, 100),
        reportApi.getReports({ pageNumber: 1, pageSize: 50 }),
        buyRequestApi.getBuyRequests(undefined, 1, 10),
      ])

      setFarms(farmRes.data ?? [])
      setAuctions(auctionRes.data?.items ?? [])
      setReports(reportRes.data?.items ?? [])
      setBuyRequests(buyRequestRes.data?.items ?? [])
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

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const statsCards = useMemo<DashboardStatCard[]>(() => {
    const totalFarms = farms.length
    const activeFarms = farms.filter(farm => farm.isActive).length
    const pendingFarms = totalFarms - activeFarms
    const runningAuctions = auctions.filter(auction => auction.status === "OnGoing").length
    const waitingAuctions = auctions.filter(auction => auction.status === "Pending").length
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
        title: "Nông trại cần duyệt",
        value: formatNumber(Math.max(pendingFarms, 0)),
        change: `${formatNumber(totalFarms)} tổng đăng ký`,
        trend: "neutral",
      },
      {
        title: "Phiên đấu giá đang chạy",
        value: formatNumber(runningAuctions),
        change: `${formatNumber(waitingAuctions)} phiên chờ mở`,
        trend: "up",
      },
      {
        title: "Báo cáo chờ xử lý",
        value: formatNumber(pendingReports),
        change: `${formatNumber(Math.max(resolvedReports, 0))} đã xử lý`,
        trend: pendingReports > resolvedReports ? "up" : "neutral",
      },
    ]
  }, [farms, auctions, reports])

  const revenueChartData = useMemo<RevenuePoint[]>(() => {
    if (!auctions.length) return []
    const buckets = new Map<
      string,
      {
        label: string
        value: number
        order: number
      }
    >()

    auctions.forEach(auction => {
      const timestamp = auction.createdAt || auction.publishDate
      const date = timestamp ? new Date(timestamp) : null
      if (!date || Number.isNaN(date.getTime())) return
      const monthIndex = date.getMonth()
      const year = date.getFullYear()
      const key = `${year}-${monthIndex}`
      const baseValue = auction.winningPrice ?? auction.currentPrice ?? auction.startingPrice ?? 0
      const existing = buckets.get(key)
      const label = `T${monthIndex + 1}/${String(year).slice(-2)}`
      const order = year * 12 + monthIndex
      buckets.set(key, {
        label,
        order,
        value: (existing?.value ?? 0) + baseValue,
      })
    })

    return Array.from(buckets.values())
      .sort((a, b) => a.order - b.order)
      .slice(-12)
      .map(({ label, value }) => ({ label, value }))
  }, [auctions])

  const orderSummaries = useMemo<DeliverySummaryItem[]>(() => {
    if (!buyRequests.length) return []
    return buyRequests.slice(0, 3).map(request => {
      const total = Math.max(request.desiredPrice * request.requiredQuantity, 0)
      const depositAmount = Math.round(total * 0.2)
      const status = BUY_REQUEST_STATUS_TO_ORDER_STATUS[request.status]
      return {
        id: request.id,
        farm: request.location || "Chưa xác định",
        customer: request.title,
        total,
        status,
        createdAt: request.createdAt,
        payment: {
          depositPaid: status !== "pending",
          depositAmount,
          remainingPaid: status === "delivered",
          remainingAmount: Math.max(total - depositAmount, 0),
        },
      }
    })
  }, [buyRequests])

  const auctionProgress = useMemo<AuctionProgressItem[]>(() => {
    if (!auctions.length) return []
    return auctions
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
  }, [auctions])

  const recentActivities = useMemo<ActivityItem[]>(() => {
    const activities: ActivityItem[] = []

    auctions.forEach(auction => {
      const meta = AUCTION_STATUS_META[auction.status] ?? AUCTION_STATUS_META.Draft
      activities.push({
        id: `auction-${auction.id}`,
        title: `Phiên ${auction.sessionCode}`,
        subtitle: meta.label,
        time: auction.updatedAt ?? auction.publishDate ?? auction.createdAt,
        accent: meta.tone === "green" ? "green" : meta.tone === "red" ? "red" : "blue",
      })
    })

    reports.forEach(report => {
      activities.push({
        id: `report-${report.id}`,
        title: `Báo cáo ${REPORT_TYPE_LABELS[report.reportType]}`,
        subtitle: report.note || "Không có ghi chú",
        time: report.createdAt,
        accent: "red",
      })
    })

    buyRequests.forEach(request => {
      activities.push({
        id: `buy-request-${request.id}`,
        title: request.title,
        subtitle: `Trạng thái: ${request.status}`,
        time: request.createdAt,
        accent: "yellow",
      })
    })

    return activities
      .filter(activity => !!activity.time)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 4)
  }, [auctions, reports, buyRequests])

  const ActivitySkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`activity-skeleton-${index}`} className="flex items-center gap-3 animate-pulse">
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển</h1>
          <p className="text-gray-600">Quản lý nông trại, phiên đấu giá và yêu cầu thu mua trong một nơi.</p>
          {errorMessage && <p className="text-sm text-red-600 mt-2">{errorMessage}</p>}
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/admin/reports")}>Quản lý báo cáo</Button>
          <Button variant="outline" onClick={loadDashboardData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới dữ liệu
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <StatsCards stats={statsCards} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-3">
          <RevenueAnalytics data={revenueChartData} isLoading={isLoading} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="space-y-6">
          <DeliveryInfo orders={orderSummaries} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[320px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Hoạt động gần đây</h3>
            </div>
            {isLoading ? (
              <ActivitySkeleton />
            ) : recentActivities.length ? (
              <div className="space-y-3">
                {recentActivities.map(activity => (
                  <div key={activity.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${ACCENT_DOT_CLASS[activity.accent]}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{activity.subtitle}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{getRelativeTime(activity.time)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-8 border border-dashed rounded-lg">
                Chưa ghi nhận hoạt động nào.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ShippingInfo auctions={auctionProgress} isLoading={isLoading} />
      </div>
    </>
  )
}