import { useState, useEffect, useRef } from 'react'
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
import { ArrowLeft, FileText } from 'lucide-react'
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
  // Track notified bids to prevent duplicate notifications
  const [, setNotifiedBids] = useState<Set<string>>(new Set())
  // Track pending optimistic bids
  const [pendingBidIds, setPendingBidIds] = useState<Set<string>>(new Set())
  // Track active retry operations to prevent duplicates
  const activeRetriesRef = useRef<Set<string>>(new Set())
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

  // SignalR real-time updates for bid history
  useEffect(() => {
    if (!id) {
      console.log('[AuctionBidHistoryPage] No auction ID, skipping SignalR setup')
      return
    }

    console.log('[AuctionBidHistoryPage] 🔌 Setting up SignalR connection for auction:', id)

    // Define loadAllBidsQuietly outside to avoid closure issues
    // Use ref to track active retries and prevent duplicates
    const loadAllBidsQuietly = async (auctionId: string, eventBidId: string, retryCount = 0) => {
      // Create unique key for this retry operation
      const retryKey = `${eventBidId}-${retryCount}`
      
      // Check if this retry is already active
      if (activeRetriesRef.current.has(retryKey)) {
        console.log(`[AuctionBidHistoryPage] ⏭️ Retry ${retryKey} already active, skipping`)
        return
      }
      
      // Mark this retry as active
      activeRetriesRef.current.add(retryKey)
      
      // Retry delays: T+0ms, T+300ms, T+600ms (max 3 attempts, then STOP - NO auto-reload)
      const delays = [0, 300, 600]
      const delay = delays[retryCount] || 0
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      try {
        console.log(`[AuctionBidHistoryPage] 🔄 Quiet: loadAllBids, retry: ${retryCount}, auctionId: ${auctionId}, bidId: ${eventBidId}`)
        const res = await auctionApi.getBidLogsByAuctionId(auctionId)
        if (res.isSuccess && res.data) {
          const sortedLogs = [...res.data].sort(
            (a, b) => new Date(b.dateTimeUpdate).getTime() - new Date(a.dateTimeUpdate).getTime()
          )
          
          console.log(`[AuctionBidHistoryPage] ✅ Fetched ${sortedLogs.length} bid logs`)
          
          // Check if the new bid exists in API response
          const bidExistsInAPI = sortedLogs.some(log => 
            log.id === eventBidId || log.bidId === eventBidId
          )
          
          // Find the bid in API response for debugging
          const foundBid = sortedLogs.find(log => 
            log.id === eventBidId || log.bidId === eventBidId
          )
          if (foundBid) {
            const foundIndex = sortedLogs.indexOf(foundBid)
            console.log(`[AuctionBidHistoryPage] 🔍 Found bid in API at position ${foundIndex + 1}/${sortedLogs.length}:`, {
              id: foundBid.id,
              bidId: foundBid.bidId,
              userName: foundBid.userName,
              dateTimeUpdate: foundBid.dateTimeUpdate,
              newEntity: foundBid.newEntity ? 'exists' : 'missing'
            })
          } else {
            console.log(`[AuctionBidHistoryPage] ⚠️ Bid NOT found in API response: ${eventBidId}`)
          }
          
          // Timestamp comparison: Check if API has newer data than current state
          setBidLogs(prev => {
            if (prev.length === 0) {
              // No current state, use API data
              console.log('[AuctionBidHistoryPage] No previous state, using API data')
              activeRetriesRef.current.delete(retryKey)
              setPendingBidIds(prevPending => {
                const newSet = new Set(prevPending)
                newSet.delete(eventBidId)
                return newSet
              })
              return sortedLogs
            }
            
            // Compare latest timestamps
            const apiLatestTime = sortedLogs.length > 0 
              ? new Date(sortedLogs[0].dateTimeUpdate).getTime() 
              : 0
            const stateLatestTime = prev.length > 0
              ? new Date(prev[0].dateTimeUpdate).getTime()
              : 0
            
            console.log(`[AuctionBidHistoryPage] 📊 API: ${apiLatestTime} | State: ${stateLatestTime} | Bid exists in API: ${bidExistsInAPI} | Newer? ${apiLatestTime > stateLatestTime}`)
            console.log(`[AuctionBidHistoryPage] 📋 API first bid:`, sortedLogs[0] ? {
              id: sortedLogs[0].id,
              bidId: sortedLogs[0].bidId,
              userName: sortedLogs[0].userName,
              dateTimeUpdate: sortedLogs[0].dateTimeUpdate
            } : 'none')
            console.log(`[AuctionBidHistoryPage] 📋 State first bid:`, prev[0] ? {
              id: prev[0].id,
              bidId: prev[0].bidId,
              userName: prev[0].userName,
              dateTimeUpdate: prev[0].dateTimeUpdate
            } : 'none')
            
            // If bid exists in API or API has newer data, update state
            if (bidExistsInAPI || apiLatestTime > stateLatestTime) {
              // Verify the sorted logs are correct (newest first)
              const verifySortedLogs = [...sortedLogs].sort(
                (a, b) => new Date(b.dateTimeUpdate).getTime() - new Date(a.dateTimeUpdate).getTime()
              )
              
              // Check if the new bid is at the top
              const newBidAtTop = verifySortedLogs[0] && 
                (verifySortedLogs[0].id === eventBidId || verifySortedLogs[0].bidId === eventBidId)
              
              console.log('[AuctionBidHistoryPage] ✅ API has the bid or newer data, updating state')
              console.log(`[AuctionBidHistoryPage] 📊 Updating from ${prev.length} to ${verifySortedLogs.length} bid logs`)
              console.log(`[AuctionBidHistoryPage] 🔝 New bid at top: ${newBidAtTop}`)
              
              if (newBidAtTop) {
                console.log('[AuctionBidHistoryPage] ✅ New bid is at the top of API data')
              } else {
                console.log('[AuctionBidHistoryPage] ⚠️ New bid is NOT at the top, checking position...')
                const bidIndex = verifySortedLogs.findIndex(log => 
                  log.id === eventBidId || log.bidId === eventBidId
                )
                if (bidIndex >= 0) {
                  console.log(`[AuctionBidHistoryPage] 📍 New bid found at position ${bidIndex + 1}`)
                }
              }
              
              activeRetriesRef.current.delete(retryKey)
              setPendingBidIds(prevPending => {
                const newSet = new Set(prevPending)
                newSet.delete(eventBidId)
                return newSet
              })
              return verifySortedLogs
            } else {
              // API still has stale data, keep current state and check retry
              if (retryCount < 2) {
                console.log(`[AuctionBidHistoryPage] ⏭️ Retry: ${retryCount + 1}`)
                activeRetriesRef.current.delete(retryKey)
                // Schedule next retry (max 3 attempts total)
                setTimeout(() => {
                  loadAllBidsQuietly(auctionId, eventBidId, retryCount + 1)
                }, 0)
              } else {
                // Max retries reached (3 attempts), keep optimistic bid, STOP retrying
                console.log('[AuctionBidHistoryPage] ⏹️ Max retries reached, keeping optimistic bid')
                activeRetriesRef.current.delete(retryKey)
                setPendingBidIds(prevPending => {
                  const newSet = new Set(prevPending)
                  newSet.delete(eventBidId)
                  return newSet
                })
              }
              return prev
            }
          })
        } else if (retryCount < 2) {
          // Retry on API error (max 3 attempts)
          console.log(`[AuctionBidHistoryPage] ⚠️ API error, retry: ${retryCount + 1}`)
          activeRetriesRef.current.delete(retryKey)
          setTimeout(() => {
            loadAllBidsQuietly(auctionId, eventBidId, retryCount + 1)
          }, 0)
        } else {
          // Max retries reached, keep optimistic bid, STOP
          console.log('[AuctionBidHistoryPage] ⏹️ Max retries reached after error, keeping optimistic bid')
          activeRetriesRef.current.delete(retryKey)
          setPendingBidIds(prevPending => {
            const newSet = new Set(prevPending)
            newSet.delete(eventBidId)
            return newSet
          })
        }
      } catch (err) {
        console.error('[AuctionBidHistoryPage] ❌ Error loading bids quietly:', err)
        activeRetriesRef.current.delete(retryKey)
        if (retryCount < 2) {
          // Retry on error (max 3 attempts)
          setTimeout(() => {
            loadAllBidsQuietly(auctionId, eventBidId, retryCount + 1)
          }, 0)
        } else {
          // Max retries reached, keep optimistic bid, STOP
          setPendingBidIds(prevPending => {
            const newSet = new Set(prevPending)
            newSet.delete(eventBidId)
            return newSet
          })
        }
      }
    }

    signalRService
      .connect(id, {
        bidPlaced: (event: BidPlacedEvent) => {
          console.log('[AuctionBidHistoryPage] 🔔 BidPlaced event received:', {
            auctionId: event.auctionId,
            bidId: event.bidId,
            userName: event.userName,
            bidAmount: event.bidAmount,
            newPrice: event.newPrice,
            currentAuctionId: id,
          })

          if (event.auctionId !== id) {
            console.log('[AuctionBidHistoryPage] ❌ Event auctionId mismatch, ignoring')
            return
          }

          console.log('[AuctionBidHistoryPage] ✅ Event matches current auction, processing...')

          // T+0ms: Create optimistic bid and show in UI immediately
          const optimisticBid: ApiAuctionBidLog = {
            id: event.bidId,
            bidId: event.bidId,
            userId: event.userId,
            userName: event.userName || 'Unknown',
            type: 'BidPlaced',
            isAutoBidding: false,
            dateTimeUpdate: event.placedAt,
            newEntity: JSON.stringify({
              Bid: {
                BidAmount: event.bidAmount,
                bidAmount: event.bidAmount,
                IsAutoBid: false,
                isAutoBid: false,
                IsWinning: true,
                isWinning: true,
                AutoBidMaxLimit: 0,
                autoBidMaxLimit: 0,
              },
            }),
            oldEntity: JSON.stringify({
              Bid: {
                BidAmount: event.previousPrice,
                bidAmount: event.previousPrice,
              },
            }),
          }

          console.log('[AuctionBidHistoryPage] ⚡ Adding optimistic bid:', {
            bidId: event.bidId,
            userName: event.userName,
            bidAmount: event.bidAmount,
            newPrice: event.newPrice,
            dateTimeUpdate: event.placedAt,
          })

          // Add optimistic bid to UI immediately
          setBidLogs(prev => {
            // Check if bid already exists (by id or bidId)
            const exists = prev.some(log => {
              const logId = log.id || log.bidId
              const eventId = event.bidId
              return logId === eventId
            })
            
            if (exists) {
              console.log('[AuctionBidHistoryPage] ⏭️ Bid already exists in state, skipping:', event.bidId)
              console.log('[AuctionBidHistoryPage] Current bidLogs:', prev.map(log => ({ id: log.id, bidId: log.bidId })))
              return prev
            }
            
            const newLogs = [optimisticBid, ...prev]
            console.log('[AuctionBidHistoryPage] ✅ Updated bidLogs, new count:', newLogs.length, 'Previous count:', prev.length)
            console.log('[AuctionBidHistoryPage] Added optimistic bid:', {
              id: optimisticBid.id,
              bidId: optimisticBid.bidId,
              userName: optimisticBid.userName,
              bidAmount: event.bidAmount,
              dateTimeUpdate: optimisticBid.dateTimeUpdate
            })
            console.log('[AuctionBidHistoryPage] First bid after update:', newLogs[0] ? {
              id: newLogs[0].id,
              bidId: newLogs[0].bidId,
              userName: newLogs[0].userName,
              dateTimeUpdate: newLogs[0].dateTimeUpdate
            } : 'none')
            return newLogs
          })

          // Mark as pending
          setPendingBidIds(prev => {
            const newSet = new Set(prev)
            newSet.add(event.bidId)
            console.log('[AuctionBidHistoryPage] 📌 Marked bid as pending:', event.bidId)
            return newSet
          })

          // Update auction current price and trigger animation
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

          // Start background sync (T+0ms, no delay for first attempt)
          // ❌ NO auto-reload - Only retry 3 times then STOP
          loadAllBidsQuietly(id, event.bidId, 0)
        },
      })
      .then(() => {
        console.log('[AuctionBidHistoryPage] ✅ SignalR connected successfully for auction:', id)
      })
      .catch(error => {
        console.error('[AuctionBidHistoryPage] ❌ Failed to init realtime connection:', error)
      })

    return () => {
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
        await fetchAuctionBidLogs(id)
        await fetchAuctionExtends(id)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const fetchAuctionBidLogs = async (auctionId: string) => {
    try {
      setBidLogsLoading(true)
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
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể tải lịch sử đặt giá',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải lịch sử đặt giá'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setBidLogsLoading(false)
    }
  }

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
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {bidLogsLoading ? 'Đang tải...' : `Tổng ${bidLogs.length} lượt đặt giá`}
                  {pendingBidIds.size > 0 && (
                    <span className="ml-2 text-green-600 font-medium">
                      ({pendingBidIds.size} đang cập nhật...)
                    </span>
                  )}
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
                      const isPending = pendingBidIds.has(log.bidId || log.id)
                      const durationLabel = getBidDurationLabel(index, log)
                      // Use stable key without index to help React identify rows correctly
                      const logKey = `${log.id || log.bidId || 'unknown'}-${log.dateTimeUpdate || 'no-date'}`
                      
                      // Debug: Log first few bids to verify data
                      if (index < 3) {
                        console.log(`[AuctionBidHistoryPage] 🎨 Rendering bid ${index + 1}:`, {
                          id: log.id,
                          bidId: log.bidId,
                          userName: log.userName,
                          bidAmount: details?.bidAmount,
                          dateTimeUpdate: log.dateTimeUpdate,
                          isPending,
                          hasDetails: !!details,
                          newEntity: log.newEntity ? 'exists' : 'missing'
                        })
                      }
                      
                      return (
                        <TableRow 
                          key={logKey}
                          className={isPending ? 'bg-green-50 animate-pulse' : ''}
                        >
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

