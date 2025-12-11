import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AuctionHeaderCard } from '../../components/auction/auction-header-card'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card } from '../../components/ui/card'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import type { ApiEnglishAuction, ApiAuctionBidLog, ApiAuctionExtend } from '../../types/api'
import { signalRService, type BidPlacedEvent } from '../../services/signalrService'
import { ROUTES } from '../../constants'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { ArrowLeft, FileText, RefreshCw } from 'lucide-react'
import { formatCurrencyVND } from '../../utils/currency'
import { extractBidDetailsFromLog } from '../../utils/bidLog'
import {
  SimpleTable,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '../../components/ui/simple-table'

export default function AuctionBidHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [auction, setAuction] = useState<ApiEnglishAuction | null>(null)
  const [farmName, setFarmName] = useState<string>('Unknown')
  const [loading, setLoading] = useState<boolean>(true)
  const [bidLogs, setBidLogs] = useState<ApiAuctionBidLog[]>([])
  const [bidLogsLoading, setBidLogsLoading] = useState<boolean>(false)
  const [auctionExtends, setAuctionExtends] = useState<ApiAuctionExtend[]>([])
  const [priceChanged, setPriceChanged] = useState(false)
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  // Track notified bids to prevent duplicate notifications
  const [, setNotifiedBids] = useState<Set<string>>(new Set())
  const { toast } = useToastContext()

  const formatDurationVi = (ms: number): string => {
    if (ms <= 0 || Number.isNaN(ms)) {
      return '< 1 giây'
    }
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const parts: string[] = []
    if (hours) parts.push(`${hours} giờ`)
    if (minutes) parts.push(`${minutes} phút`)
    if (seconds || parts.length === 0) parts.push(`${seconds} giây`)
    return parts.join(' ')
  }

  const getBidDurationLabel = (index: number, log: ApiAuctionBidLog): string => {
    const currentTime = new Date(log.dateTimeUpdate).getTime()
    if (Number.isNaN(currentTime)) return 'Không xác định'

    if (index === 0) {
      const diff = Date.now() - currentTime
      return diff > 0 ? `${formatDurationVi(diff)} (chưa bị vượt)` : '< 1 giây'
    }

    const previousLog = bidLogs[index - 1]
    if (!previousLog) return 'Không xác định'

    const previousTime = new Date(previousLog.dateTimeUpdate).getTime()
    if (Number.isNaN(previousTime) || previousTime <= currentTime) {
      return '< 1 giây'
    }

    return formatDurationVi(previousTime - currentTime)
  }

  const fetchAuctionBidLogs = useCallback(async (auctionId: string, silent = false) => {
    try {
      // Only show loading indicator for manual refreshes, not auto-refresh
      if (!silent) {
        setBidLogsLoading(true)
      }
      const res = await auctionApi.getBidLogsByAuctionId(auctionId)
      if (res.isSuccess && res.data) {
        const sortedLogs = [...res.data].sort(
          (a, b) => new Date(b.dateTimeUpdate).getTime() - new Date(a.dateTimeUpdate).getTime()
        )
        setBidLogs(sortedLogs)
        // Initialize notified bids set with existing bids to prevent duplicate notifications
        const existingBidIds = new Set(sortedLogs.map(log => log.bidId || log.id).filter(Boolean))
        setNotifiedBids(existingBidIds)
      } else {
        if (!silent) {
          toast({
            title: TOAST_TITLES.ERROR,
            description: res.message || 'Không thể tải lịch sử đặt giá',
            variant: 'destructive',
          })
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải lịch sử đặt giá'
      if (!silent) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } finally {
      if (!silent) {
        setBidLogsLoading(false)
      }
    }
  }, [toast])

  // SignalR real-time updates - only for current price, not for bid logs
  // Bid logs are updated via auto-reload (polling) instead
  useEffect(() => {
    if (!id) {
      console.log('[AuctionBidHistoryPage] No auction ID, skipping SignalR setup')
      return
    }

    let isMounted = true

    const setupSignalR = async () => {
      try {
        console.log('[AuctionBidHistoryPage] 🔌 Setting up SignalR connection for current price updates:', id)

        await signalRService.connect(id, {
          bidPlaced: (event: BidPlacedEvent) => {
            if (!isMounted) return

            console.log('[AuctionBidHistoryPage] 🔔 BidPlaced event received for price update:', {
            auctionId: event.auctionId,
            bidId: event.bidId,
            userName: event.userName,
            newPrice: event.newPrice,
            currentAuctionId: id,
          })

          if (event.auctionId !== id) {
            console.log('[AuctionBidHistoryPage] ❌ Event auctionId mismatch, ignoring')
            return
          }

            // Update auction current price and trigger animation (for header card)
          setAuction(prev => {
            if (!prev) return prev
            return {
              ...prev,
              currentPrice: event.newPrice,
            }
          })
          setPriceChanged(true)
          setTimeout(() => setPriceChanged(false), 1000)

          // Show toast notification only once per bid
          setNotifiedBids(prev => {
            if (prev.has(event.bidId)) {
              return prev
            }
            const newSet = new Set(prev)
            newSet.add(event.bidId)
            toast({
              title: 'Có lượt đặt giá mới',
              description: `${event.userName} đã đặt giá ${event.newPrice.toLocaleString('vi-VN')} VNĐ`,
            })
            return newSet
          })

            // NOTE: Bid logs are NOT refreshed here - they use auto-reload (polling) instead
            // This avoids the 404 error from SignalR endpoint issues
          },
        })

        if (isMounted) {
          console.log('[AuctionBidHistoryPage] ✅ SignalR connected successfully for price updates:', id)
        }
      } catch (error) {
        console.error('[AuctionBidHistoryPage] ❌ Failed to init SignalR connection for price updates:', error)
        // Don't retry too aggressively - price updates are nice-to-have, not critical
        // Auto-reload will still keep bid logs updated
      }
    }

    // Setup SignalR connection
    setupSignalR()

    return () => {
      isMounted = false
      console.log('[AuctionBidHistoryPage] 🧹 Cleaning up SignalR connection for auction:', id)
      signalRService.disconnect().catch(console.error)
    }
  }, [id, toast])

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      try {
        setLoading(true)

        // Lấy auction
        const auctionRes = await auctionApi.getEnglishAuctionById(id)
        if (!auctionRes.isSuccess || !auctionRes.data) return
        const auctionData = auctionRes.data
        setAuction(auctionData)

        // Lấy farm name
        const farmsRes = await farmApi.getFarms()
        if (farmsRes.isSuccess && farmsRes.data) {
          const farm = farmsRes.data.find(f => f.userId === auctionData.farmerId)
          if (farm) {
            setFarmName(farm.name)
          }
        }

        // Lấy danh sách bid logs của auction
        await fetchAuctionBidLogs(id, true)
        await fetchAuctionExtends(id)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, fetchAuctionBidLogs])

  // Auto-reload bid logs periodically (polling) - independent of SignalR
  useEffect(() => {
    if (!id || !auction) {
      setIsAutoRefreshing(false)
      return
    }

    // Only auto-reload if auction is still active (OnGoing, Pending, Approved)
    const isActive = auction.status === 'OnGoing' || auction.status === 'Pending' || auction.status === 'Approved'
    setIsAutoRefreshing(isActive)

    if (!isActive) return

    console.log('[AuctionBidHistoryPage] 🔄 Setting up auto-reload for bid logs (polling every 5s)')
    
    // Auto-reload every 5 seconds
    const interval = setInterval(() => {
      fetchAuctionBidLogs(id, true) // silent = true to avoid loading indicator
    }, 5000) // 5 seconds

    return () => {
      console.log('[AuctionBidHistoryPage] 🧹 Cleaning up auto-reload interval')
      clearInterval(interval)
    }
  }, [id, auction, fetchAuctionBidLogs])

  const fetchAuctionExtends = async (auctionId: string) => {
    try {
      const res = await auctionApi.getAuctionExtendsByAuctionId(auctionId)
      if (res.isSuccess && res.data) {
        setAuctionExtends(res.data)
      }
    } catch (err) {
      console.error('Error fetching auction extends:', err)
    }
  }

  const totalExtendMinutes = auctionExtends.reduce((acc, extend) => acc + extend.extendDurationInMinutes, 0)

  const getActiveTab = () => {
    if (location.pathname.includes('/activity-history')) return 'activity-history'
    if (location.pathname.includes('/bid-history')) return 'bid-history'
    if (location.pathname.includes('/winner')) return 'winner'
    if (location.pathname.includes('/reports')) return 'reports'
    return 'overview'
  }

  const handleTabChange = (value: string) => {
    if (!id) return
    if (value === 'overview') {
      navigate(`/admin/auctions/${id}`)
    } else if (value === 'activity-history') {
      navigate(`/admin/auctions/${id}/activity-history`)
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
            <TabsTrigger value="activity-history">Lịch Sử Hoạt Động</TabsTrigger>
            <TabsTrigger value="bid-history">Lịch Sử Đấu Giá</TabsTrigger>
            <TabsTrigger value="winner">Người Thắng Đấu Giá</TabsTrigger>
            <TabsTrigger value="reports">Báo Cáo</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content - Auction Logs */}
      <div className="space-y-6">
        {/* Auction Header Card */}
        <AuctionHeaderCard 
          auction={auction} 
          farmName={farmName} 
          totalExtendMinutes={totalExtendMinutes}
          priceChanged={priceChanged}
        />

        {/* Auction Bids Section */}
        <Card className="overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Lịch Sử Đặt Giá
                  {isAutoRefreshing && (
                    <span className="flex items-center gap-1 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      {/* Tự động cập nhật mỗi 5 giây */}
                    </span>
                  )
                  }
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {bidLogsLoading ? 'Đang tải...' : `Tổng ${bidLogs.length} lượt đặt giá`}
                </p>
              </div>
            </div>

            {bidLogsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Đang tải danh sách đặt giá...</p>
              </div>
            ) : bidLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Chưa có lượt đặt giá nào cho phiên đấu giá này</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <SimpleTable>
                  <TableHeader>
                    <tr>
                      <TableHead>STT</TableHead>
                      <TableHead>Thương lái</TableHead>
                      <TableHead className="text-right">Giá đặt</TableHead>
                      <TableHead className="text-center">Tự động</TableHead>
                      <TableHead className="text-right">Giới hạn tự động đặt giá</TableHead>
                      <TableHead className="text-right">Giữ vị trí cao nhất</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {bidLogs.map((log, index) => {
                      const details = extractBidDetailsFromLog(log)
                      const durationLabel = getBidDurationLabel(index, log)
                      // Use stable key without index to help React identify rows correctly
                      const logKey = `${log.id || log.bidId || 'unknown'}-${log.dateTimeUpdate || 'no-date'}`
                      
                      return (
                        <TableRow key={logKey}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="text-sm text-gray-900">
                            {log.userName?.trim() || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-700">
                            {details?.bidAmount !== undefined 
                              ? formatCurrencyVND(details.bidAmount) 
                              : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {details?.isAutoBid ? 'Có' : 'Không'}
                          </TableCell>
                          <TableCell className="text-right">
                            {details && details.autoBidMaxLimit && details.autoBidMaxLimit > 0
                              ? formatCurrencyVND(details.autoBidMaxLimit)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-700">
                            {durationLabel}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </SimpleTable>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

