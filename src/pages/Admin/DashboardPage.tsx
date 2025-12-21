import { useCallback, useEffect, useMemo, useState } from "react"
import { StatsCards, type DashboardStatCard } from "../../components/admin/stats-cards"
import { 
  SystemRevenueChart, 
  UserGrowthChart, 
  AuctionLifecycleChart, 
  RiskMonitoringChart, 
  RevenueSourceChart 
} from "../../components/admin/dashboard-charts"
import { ReputationRanking } from "../../components/admin/reputation-ranking"
import { HotAuctions } from "../../components/admin/hot-auctions"
import { Button } from "../../components/ui/button"
import { RefreshCw, BarChart3, Users, TrendingUp, AlertTriangle, Award, Flame } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { farmApi } from "../../services/api/farmApi"
import { auctionApi } from "../../services/api/auctionApi"
import { reportApi } from "../../services/api/reportApi"
import { userApi } from "../../services/api/userApi"
import { walletApi } from "../../services/api/walletApi"
import { certificationApi } from "../../services/api/certificationApi"
import { statisticsApi } from "../../services/api/statisticsApi"
import type {
  ApiFarm,
  ApiEnglishAuction,
  ReportItem,
  ApiAuctionBidLog,
  User as ApiUser,
  ApiWallet,
  ApiLedger,
  SystemProfitSummary,
} from "../../types/api"
import { useToastContext } from "../../contexts/ToastContext"
import { TOAST_TITLES } from "../../services/constants/messages"
import { useAutoRefresh } from "../../hooks/useAutoRefresh"
import { formatCurrencyVND } from "../../utils/currency"

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value)

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
  const [systemWallet, setSystemWallet] = useState<ApiWallet | null>(null)
  const [systemLedgers, setSystemLedgers] = useState<ApiLedger[]>([])
  const [bidLogsMap, setBidLogsMap] = useState<Map<string, ApiAuctionBidLog[]>>(new Map())
  const [pendingCertifications, setPendingCertifications] = useState<any[]>([])
  const [systemProfit, setSystemProfit] = useState<SystemProfitSummary | null>(null)
  const [profitRange, setProfitRange] = useState<'current-year' | 'current-month' | 'custom'>('current-year')
  const [profitCustom, setProfitCustom] = useState<{ start: string; end: string; timeRange: 'daily' | 'monthly' }>(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      timeRange: 'daily',
    }
  })

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [farmRes, auctionRes, reportRes, userRes, systemWalletRes, certificationRes, systemProfitRes] = await Promise.all([
        farmApi.getFarms(),
        auctionApi.getEnglishAuctions(undefined, 1, 500), // Lấy nhiều hơn để tính toán charts
        reportApi.getReports({ pageNumber: 1, pageSize: 100 }),
        userApi.list(),
        walletApi.getSystemWallet(),
        certificationApi.getPending(),
        statisticsApi.getSystemProfitCurrentYear(),
      ])

      setFarms(farmRes.data ?? [])
      setAuctions(auctionRes.data?.items ?? [])
      setReports(reportRes.data?.items ?? [])
      setPendingCertifications(certificationRes.data ?? [])
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

      setSystemProfit(systemProfitRes.data ?? null)
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
      // Batch load để tránh quá tải API (mỗi batch 20 auctions)
      const BATCH_SIZE = 20
      const newMap = new Map<string, ApiAuctionBidLog[]>()
      
      for (let i = 0; i < auctionIds.length; i += BATCH_SIZE) {
        const batch = auctionIds.slice(i, i + BATCH_SIZE)
        const bidLogPromises = batch.map(auctionId =>
          auctionApi.getBidLogsByAuctionId(auctionId).catch(() => ({ data: [] }))
        )
        const bidLogResults = await Promise.all(bidLogPromises)
        
        batch.forEach((auctionId, index) => {
          const logs = bidLogResults[index]?.data ?? []
          newMap.set(auctionId, logs)
        })
      }
      
      // Merge với dữ liệu cũ để không mất dữ liệu
      setBidLogsMap(prev => {
        const merged = new Map(prev)
        newMap.forEach((logs, auctionId) => {
          merged.set(auctionId, logs)
        })
        return merged
      })
    } catch (error) {
      console.error("Error loading bid logs:", error)
    } finally {
      setIsLoadingBids(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Load bid logs for all ongoing and completed auctions
  useEffect(() => {
    if (auctions.length > 0) {
      const auctionIds = auctions
        .filter((a: ApiEnglishAuction) => a.status === "Completed" || a.status === "OnGoing")
        .map(a => a.id)
      loadBidLogs(auctionIds)
    }
  }, [auctions, loadBidLogs])

  // Load system profit when range changes
  useEffect(() => {
    const loadProfit = async () => {
      try {
        if (profitRange === 'current-year') {
          const res = await statisticsApi.getSystemProfitCurrentYear()
          setSystemProfit(res.data ?? null)
          return
        }
        if (profitRange === 'current-month') {
          const res = await statisticsApi.getSystemProfitCurrentMonth()
          setSystemProfit(res.data ?? null)
          return
        }
        // custom
        const res = await statisticsApi.getSystemProfit({
          startDate: profitCustom.start,
          endDate: profitCustom.end,
          timeRange: profitCustom.timeRange,
        })
        setSystemProfit(res.data ?? null)
      } catch (error) {
        console.error('Error loading system profit:', error)
        setSystemProfit(null)
      }
    }
    loadProfit()
  }, [profitRange, profitCustom])

  // Tự động refresh data mỗi 30 giây
  useAutoRefresh(loadDashboardData, 30000, false, false)


  // Calculate all metrics for System Overview
  const statsCards = useMemo<DashboardStatCard[]>(() => {
    const totalFarms = farms.length
    const totalUsers = users.length
    const pendingAccounts = users.filter(u => u.status === 0).length
    const pendingCertificationsCount = pendingCertifications.length
    const pendingAuctions = auctions.filter(a => a.status === "Pending").length
    const ongoingAuctions = auctions.filter(a => a.status === "OnGoing").length
    const totalRevenue = systemWallet?.balance ?? 0
    const pendingReports = reports.filter(r => r.reportStatus === "Pending").length
    const pendingDisputes = reports.filter(r => r.reportStatus === "InReview").length

    return [
      {
        title: "Tổng số nông trại",
        value: formatNumber(totalFarms),
        change: `${formatNumber(farms.filter(f => f.isActive).length)} đang hoạt động`,
        trend: "up",
        highlight: true,
      },
      {
        title: "Tổng số tài khoản",
        value: formatNumber(totalUsers),
        change: `${formatNumber(pendingAccounts)} chờ xác thực`,
        trend: "up",
      },
      {
        title: "Chờ xác thực",
        value: formatNumber(pendingAccounts + pendingCertificationsCount),
        change: `${formatNumber(pendingAccounts)} tài khoản, ${formatNumber(pendingCertificationsCount)} chứng chỉ`,
        trend: "neutral",
      },
      {
        title: "Đấu giá chờ duyệt",
        value: formatNumber(pendingAuctions),
        change: `${formatNumber(ongoingAuctions)} đang diễn ra`,
        trend: "up",
      },
      {
        title: "Tổng doanh thu hệ thống",
        value: formatCurrencyVND(totalRevenue, { fallback: "0 VND" }),
        change: "Số dư ví hệ thống",
        trend: "up",
      },
      {
        title: "Báo cáo chờ xem xét",
        value: formatNumber(pendingReports),
        change: `${formatNumber(pendingDisputes)} tranh chấp`,
        trend: pendingReports > 0 ? "up" : "neutral",
      },
    ]
  }, [farms, users, pendingCertifications, auctions, systemWallet, reports])


  // System Revenue Analysis - Column Chart (profit over time)
  const systemRevenueData = useMemo(() => {
    // Ưu tiên dữ liệu từ Statistics API (current-year)
    if (systemProfit?.data?.length) {
      return systemProfit.data.map(point => ({
        time: point.time.includes('-') ? point.time.split('-').reverse().join('/') : point.time,
        profit: point.profit,
      }))
    }

    // Fallback: tính từ systemLedgers (12 tháng gần nhất)
    if (!systemLedgers.length) return []
    const now = new Date()
    const months: Array<{ time: string; profit: number }> = []
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthLabel = `T${date.getMonth() + 1}/${date.getFullYear()}`
      
      const monthLedgers = systemLedgers.filter(ledger => {
        if (!ledger.createdAt) return false
        const ledgerDate = new Date(ledger.createdAt)
        return ledgerDate.getFullYear() === date.getFullYear() && 
               ledgerDate.getMonth() === date.getMonth()
      })
      
      const profit = monthLedgers.reduce((sum, ledger) => {
        return sum + (ledger.direction === 1 ? ledger.amount : -ledger.amount)
      }, 0)
      
      months.push({ time: monthLabel, profit })
    }
    
    return months
  }, [systemLedgers, systemProfit])

  // User Growth Trend - Line Chart
  const userGrowthData = useMemo(() => {
    if (!users.length) return []
    
    // Group users by month
    const monthMap = new Map<string, number>()
    
    users.forEach(user => {
      const date = new Date(user.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const currentCount = monthMap.get(monthKey) || 0
      monthMap.set(monthKey, currentCount + 1)
    })
    
    // Get last 12 months
    const now = new Date()
    const months: Array<{ month: string; accounts: number }> = []
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = `T${date.getMonth() + 1}/${date.getFullYear()}`
      
      months.push({ 
        month: monthLabel, 
        accounts: monthMap.get(monthKey) || 0 
      })
    }
    
    return months
  }, [users])

  // Auction Lifecycle Overview - Stacked Bar Chart
  const auctionLifecycleData = useMemo(() => {
    if (!auctions.length) return []
    
    // Group auctions by month and status
    const monthMap = new Map<string, {
      approved: number
      rejected: number
      ongoing: number
      completed: number
      failed: number
    }>()
    
    auctions.forEach(auction => {
      const date = new Date(auction.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          approved: 0,
          rejected: 0,
          ongoing: 0,
          completed: 0,
          failed: 0,
        })
      }
      
      const data = monthMap.get(monthKey)!
      if (auction.status === "Approved") data.approved++
      else if (auction.status === "Rejected") data.rejected++
      else if (auction.status === "OnGoing" || auction.status === "Pause") data.ongoing++
      else if (auction.status === "Completed") data.completed++
      else if (auction.status === "NoWinner" || auction.status === "Cancelled") data.failed++
    })
    
    // Get last 12 months
    const now = new Date()
    const months: Array<{
      month: string
      approved: number
      rejected: number
      ongoing: number
      completed: number
      failed: number
    }> = []
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = `T${date.getMonth() + 1}/${date.getFullYear()}`
      
      const data = monthMap.get(monthKey) || {
        approved: 0,
        rejected: 0,
        ongoing: 0,
        completed: 0,
        failed: 0,
      }
      
      months.push({ month: monthLabel, ...data })
    }
    
    return months
  }, [auctions])

  // Risk Monitoring - Line Chart (reports & disputes)
  const riskMonitoringData = useMemo(() => {
    if (!reports.length) return []
    
    // Group reports by month
    const monthMap = new Map<string, { reports: number; disputes: number }>()
    
    reports.forEach(report => {
      const date = new Date(report.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { reports: 0, disputes: 0 })
      }
      
      const data = monthMap.get(monthKey)!
      if (report.reportStatus === "Pending" || report.reportStatus === "InReview") {
        data.reports++
      }
      if (report.reportStatus === "InReview") {
        data.disputes++
      }
    })
    
    // Get last 12 months
    const now = new Date()
    const months: Array<{ time: string; reports: number; disputes: number }> = []
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = `T${date.getMonth() + 1}/${date.getFullYear()}`
      
      const data = monthMap.get(monthKey) || { reports: 0, disputes: 0 }
      months.push({ time: monthLabel, ...data })
    }
    
    return months
  }, [reports])

  // Biến động ví hệ thống - Donut Chart
  const walletFluctuationData = useMemo(() => {
    if (!systemLedgers.length) return []
    
    // Tính tổng tiền vào và tiền ra từ ledgers
    let totalIn = 0  // direction = 1 (tiền vào)
    let totalOut = 0 // direction = 2 (tiền ra)
    
    systemLedgers.forEach(ledger => {
      if (ledger.direction === 1) {
        totalIn += ledger.amount
      } else if (ledger.direction === 2) {
        totalOut += ledger.amount
      }
    })
    
    return [
      { name: "Tiền vào", value: totalIn },
      { name: "Tiền ra", value: totalOut },
    ].filter(item => item.value > 0)
  }, [systemLedgers])

  // Reputation Ranking - Top 5 farmers and wholesalers
  const reputationRanking = useMemo(() => {
    // Calculate auction count for each user from bidLogs (for wholesalers - auctions they participated in)
    // Count unique auctions per user
    const userAuctionSet = new Map<string, Set<string>>()
    bidLogsMap.forEach((logs, auctionId) => {
      logs.forEach(log => {
        if (!userAuctionSet.has(log.userId)) {
          userAuctionSet.set(log.userId, new Set())
        }
        userAuctionSet.get(log.userId)!.add(auctionId)
      })
    })
    
    // Also add auctions where user is winner (to ensure winners are counted even if bidLogs not loaded)
    auctions
      .filter(a => a.winnerId)
      .forEach(auction => {
        const winnerId = auction.winnerId!
        if (!userAuctionSet.has(winnerId)) {
          userAuctionSet.set(winnerId, new Set())
        }
        userAuctionSet.get(winnerId)!.add(auction.id)
      })
    
    // Convert to count map (for wholesalers)
    const userAuctionCounts = new Map<string, number>()
    userAuctionSet.forEach((auctionSet, userId) => {
      userAuctionCounts.set(userId, auctionSet.size)
    })
    
    // Calculate auctions created by farmers (all auctions with farmerId = user.id)
    const farmerCreatedAuctions = new Map<string, number>()
    auctions
      .filter(a => a.farmerId)
      .forEach(auction => {
        const count = farmerCreatedAuctions.get(auction.farmerId) || 0
        farmerCreatedAuctions.set(auction.farmerId, count + 1)
      })
    
    // Calculate successful auctions for farmers (auctions with status "Completed" and farmerId = user.id)
    const farmerSuccessfulAuctions = new Map<string, number>()
    auctions
      .filter(a => a.status === "Completed" && a.farmerId)
      .forEach(auction => {
        const count = farmerSuccessfulAuctions.get(auction.farmerId) || 0
        farmerSuccessfulAuctions.set(auction.farmerId, count + 1)
      })
    
    // Calculate successful auctions for wholesalers (auctions with status "Completed" and winnerId = user.id)
    const wholesalerSuccessfulAuctions = new Map<string, number>()
    auctions
      .filter(a => a.status === "Completed" && a.winnerId)
      .forEach(auction => {
        const winnerId = auction.winnerId!
        const count = wholesalerSuccessfulAuctions.get(winnerId) || 0
        wholesalerSuccessfulAuctions.set(winnerId, count + 1)
      })
    
    const farmers = users
      .filter(u => {
        const role = typeof u.role === 'string' ? u.role.toLowerCase() : 
                    (u.roleObject?.name?.toLowerCase() || '')
        const createdCount = farmerCreatedAuctions.get(u.id) || 0
        // Chỉ lấy farmer có ít nhất 1 đấu giá đã tạo và có điểm uy tín > 0
        return role === 'farmer' && createdCount > 0 && (u.reputationScore ?? 0) > 0
      })
      .map(u => {
        const createdCount = farmerCreatedAuctions.get(u.id) || 0
        const successfulCount = farmerSuccessfulAuctions.get(u.id) || 0
        const successRate = createdCount > 0 ? successfulCount / createdCount : 0
        
        return {
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim() || u.email,
          email: u.email,
          reputationScore: u.reputationScore ?? 0,
          auctionCount: createdCount, // Số đấu giá đã tạo cho farmer
          successfulAuctions: successfulCount,
          successRate, // Tỷ lệ thành công = số đấu giá thành công / số đấu giá đã tạo
          role: 'farmer' as const,
        }
      })
      .sort((a, b) => {
        // Sắp xếp theo tỷ lệ thành công trước (giảm dần)
        if (Math.abs(a.successRate - b.successRate) > 0.0001) {
          return b.successRate - a.successRate
        }
        // Nếu tỷ lệ bằng nhau, sắp xếp theo số lượng đấu giá thành công (giảm dần)
        if (a.successfulAuctions !== b.successfulAuctions) {
          return b.successfulAuctions - a.successfulAuctions
        }
        // Nếu số lượng cũng bằng nhau, sắp xếp theo điểm uy tín (giảm dần)
        return b.reputationScore - a.reputationScore
      })
      .slice(0, 5)
    
    const wholesalers = users
      .filter(u => {
        const role = typeof u.role === 'string' ? u.role.toLowerCase() : 
                    (u.roleObject?.name?.toLowerCase() || '')
        const participatedCount = userAuctionCounts.get(u.id) || 0
        // Chỉ lấy wholesaler có ít nhất 1 phiên tham gia và có điểm uy tín > 0
        return role === 'wholesaler' && participatedCount > 0 && (u.reputationScore ?? 0) > 0
      })
      .map(u => {
        const participatedCount = userAuctionCounts.get(u.id) || 0
        const wonCount = wholesalerSuccessfulAuctions.get(u.id) || 0
        const winRate = participatedCount > 0 ? wonCount / participatedCount : 0
        
        return {
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim() || u.email,
          email: u.email,
          reputationScore: u.reputationScore ?? 0,
          auctionCount: participatedCount, // Số phiên tham gia cho wholesaler
          successfulAuctions: wonCount,
          successRate: winRate, // Tỷ lệ thắng = số đấu giá thắng / số phiên tham gia
          role: 'wholesaler' as const,
        }
      })
      .sort((a, b) => {
        // Sắp xếp theo tỷ lệ thắng trước (giảm dần)
        if (Math.abs(a.successRate - b.successRate) > 0.0001) {
          return b.successRate - a.successRate
        }
        // Nếu tỷ lệ bằng nhau, sắp xếp theo số lượng đấu giá thắng (giảm dần)
        if (a.successfulAuctions !== b.successfulAuctions) {
          return b.successfulAuctions - a.successfulAuctions
        }
        // Nếu số lượng cũng bằng nhau, sắp xếp theo điểm uy tín (giảm dần)
        return b.reputationScore - a.reputationScore
      })
      .slice(0, 5)
    
    return { farmers, wholesalers }
  }, [users, bidLogsMap, auctions])

  // Hot Ongoing Auctions - Top 5 mới nhất đang diễn ra
  const hotAuctions = useMemo(() => {
    const ongoing = auctions
      .filter(a => a.status === "OnGoing")
      .map(auction => {
        const bidLogs = bidLogsMap.get(auction.id) ?? []
        const endDate = auction.endDate ? new Date(auction.endDate) : null
        const now = new Date()
        const remainingMs = endDate ? endDate.getTime() - now.getTime() : 0
        const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)))
        const remainingDays = Math.floor(remainingHours / 24)
        const remainingTime = remainingDays > 0 
          ? `${remainingDays} ngày` 
          : remainingHours > 0
          ? `${remainingHours} giờ`
          : 'Sắp kết thúc'
        
        // Find farmer name from farmerId
        const farmer = users.find(u => u.id === auction.farmerId)
        const farmerName = farmer 
          ? `${farmer.firstName} ${farmer.lastName}`.trim() || farmer.email
          : 'Chưa xác định'
        
      return {
          id: auction.id,
          auctionName: auction.note || `Phiên ${auction.sessionCode}`,
          farmerName,
          currentHighestBid: auction.currentPrice ?? auction.startingPrice ?? 0,
          totalBids: bidLogs.length,
          remainingTime,
          sessionCode: auction.sessionCode,
          createdAt: auction.createdAt,
          publishDate: auction.publishDate,
        }
      })
      // Sắp xếp theo thời gian gần nhất (publishDate hoặc createdAt, mới nhất trước)
      .sort((a, b) => {
        // Ưu tiên publishDate, nếu không có thì dùng createdAt
        const dateA = a.publishDate ? new Date(a.publishDate).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
        const dateB = b.publishDate ? new Date(b.publishDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
        return dateB - dateA // Mới nhất trước (giảm dần)
      })
      .slice(0, 5)
    
    return ongoing
  }, [auctions, bidLogsMap, users])


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header Section */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
        <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span className="truncate">Bảng điều khiển</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 ml-0 sm:ml-[36px] md:ml-[52px]">Tổng quan hệ thống và phân tích dữ liệu</p>
            {errorMessage && (
              <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs sm:text-sm text-red-600">{errorMessage}</p>
              </div>
            )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button 
              onClick={() => navigate("/admin/reports")}
              className="shadow-sm hover:shadow-md transition-shadow text-xs sm:text-sm"
              size="sm"
            >
              Quản lý báo cáo
            </Button>
            <Button 
              variant="outline" 
              onClick={loadDashboardData} 
              disabled={isLoading}
              className="shadow-sm hover:shadow-md transition-shadow text-xs sm:text-sm"
              size="sm"
            >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>
      </div>

      {/* 1.1 System Overview - Stats Cards */}
      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-4 sm:mb-5 md:mb-6">
          <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full"></div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Tổng quan hệ thống</h2>
        </div>
        <StatsCards stats={statsCards} isLoading={isLoading} />
      </section>

      {/* 1.2 System Revenue Analysis */}
      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-4 sm:mb-5 md:mb-6">
          <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Phân tích doanh thu</h2>
                      </div>
                    </div>
        <div className="mb-3 sm:mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(['current-year', 'current-month', 'custom'] as const).map((option) => (
              <Button
                key={option}
                variant={profitRange === option ? "default" : "outline"}
                size="sm"
                onClick={() => setProfitRange(option)}
                className="text-xs sm:text-sm"
              >
                {option === 'current-year' && 'Năm nay'}
                {option === 'current-month' && 'Tháng này'}
                {option === 'custom' && 'Tùy chỉnh'}
              </Button>
            ))}
          </div>
          {profitRange === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={profitCustom.start}
                  onChange={(e) => setProfitCustom((prev) => ({ ...prev, start: e.target.value }))}
                  max={profitCustom.end}
                  className="rounded-md border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={profitCustom.end}
                  onChange={(e) => setProfitCustom((prev) => ({ ...prev, end: e.target.value }))}
                  min={profitCustom.start}
                  max={new Date().toISOString().split('T')[0]}
                  className="rounded-md border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">Nhóm theo</label>
                <select
                  value={profitCustom.timeRange}
                  onChange={(e) => setProfitCustom((prev) => ({ ...prev, timeRange: e.target.value as 'daily' | 'monthly' }))}
                  className="rounded-md border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="daily">Ngày</option>
                  <option value="monthly">Tháng</option>
                </select>
              </div>
            </div>
          )}
        </div>
        <SystemRevenueChart data={systemRevenueData} isLoading={isLoading} />
      </section>

      {/* Charts Grid - User Growth & Revenue Source */}
      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-4 sm:mb-5 md:mb-6">
          <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Tăng trưởng & Doanh thu</h2>
                      </div>
                    </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <UserGrowthChart data={userGrowthData} isLoading={isLoading} />
          <RevenueSourceChart data={walletFluctuationData} isLoading={isLoading} />
                  </div>
      </section>

      {/* 1.4 Auction Lifecycle Overview */}
      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-4 sm:mb-5 md:mb-6">
          <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Vòng đời đấu giá</h2>
              </div>
        <AuctionLifecycleChart data={auctionLifecycleData} isLoading={isLoading} />
      </section>

      {/* 1.5 Risk Monitoring */}
      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-4 sm:mb-5 md:mb-6">
          <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Giám sát rủi ro</h2>
            </div>
              </div>
        <RiskMonitoringChart data={riskMonitoringData} isLoading={isLoading} />
      </section>

      {/* 1.7 Reputation Ranking */}
      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-4 sm:mb-5 md:mb-6">
          <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-full"></div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Bảng xếp hạng uy tín</h2>
                      </div>
                    </div>
        <ReputationRanking 
          farmers={reputationRanking.farmers} 
          wholesalers={reputationRanking.wholesalers}
          isLoading={isLoading}
        />
      </section>

      {/* 1.8 Hot Ongoing Auctions */}
      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-4 sm:mb-5 md:mb-6">
          <div className="w-1 h-5 sm:h-6 bg-gradient-to-b from-pink-500 to-pink-600 rounded-full"></div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Đấu giá đang hot</h2>
                      </div>
          </div>
        <HotAuctions auctions={hotAuctions} isLoading={isLoading || isLoadingBids} />
      </section>

                    </div>
  )
}
