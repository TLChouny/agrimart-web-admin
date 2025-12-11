import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AuctionHeaderCard } from '../../components/auction/auction-header-card'
import { WinnerSection } from '../../components/auction/winner-section'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import { userApi } from '../../services/api/userApi'
import type { ApiEnglishAuction, ApiAuctionExtend } from '../../types/api'
import { ROUTES } from '../../constants'
import { ArrowLeft } from 'lucide-react'
import { signalRService, type BidPlacedEvent, type BuyNowEvent } from '../../services/signalrService'
import { useToastContext } from '../../contexts/ToastContext'

export default function AuctionWinnerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [auction, setAuction] = useState<ApiEnglishAuction | null>(null)
  const [farmName, setFarmName] = useState<string>('Unknown')
  const [loading, setLoading] = useState<boolean>(true)
  const [auctionExtends, setAuctionExtends] = useState<ApiAuctionExtend[]>([])
  const [priceChanged, setPriceChanged] = useState(false)
  // Track notified bids to prevent duplicate notifications
  const [, setNotifiedBids] = useState<Set<string>>(new Set())
  const { toast } = useToastContext()
  const [winnerInfo, setWinnerInfo] = useState<{
    id: string
    name: string
    email: string
    phone: string
    finalPrice: number
    bidCount: number
    winTime: Date
  } | undefined>(undefined)

  const fetchAuctionExtends = useCallback(async (auctionId: string) => {
    try {
      const res = await auctionApi.getAuctionExtendsByAuctionId(auctionId)
      if (res.isSuccess && res.data) {
        setAuctionExtends(res.data)
      }
    } catch (err) {
      console.error('Error fetching auction extends:', err)
    }
  }, [])

  const fetchWinnerData = useCallback(async () => {
    if (!id) return
    try {
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

      // Lấy thông tin người thắng nếu có
      if (auctionData.winnerId && auctionData.winningPrice) {
        try {
          // Lấy thông tin user
          const userRes = await userApi.getById(auctionData.winnerId)
          if (userRes.isSuccess && userRes.data) {
            const user = userRes.data
            
            // Lấy lịch sử đấu giá để đếm số lần bid
            const bidLogsRes = await auctionApi.getBidLogsByAuctionId(id)
            let bidCount = 0
            if (bidLogsRes.isSuccess && bidLogsRes.data) {
              // Đếm số lần bid của người thắng
              bidCount = bidLogsRes.data.filter(log => log.userId === auctionData.winnerId).length
            }

            // Tạo thông tin người thắng
            const winnerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || auctionData.winnerId
            setWinnerInfo({
              id: user.id,
              name: winnerName,
              email: user.email || '',
              phone: user.phoneNumber || '',
              finalPrice: auctionData.winningPrice,
              bidCount: bidCount,
              winTime: new Date(auctionData.updatedAt || auctionData.endDate),
            })
          }
        } catch (error) {
          console.error('Error fetching winner info:', error)
          // Nếu không lấy được user info, vẫn hiển thị với thông tin cơ bản
          if (auctionData.winnerId && auctionData.winningPrice) {
            setWinnerInfo({
              id: auctionData.winnerId,
              name: auctionData.winnerId,
              email: '',
              phone: '',
              finalPrice: auctionData.winningPrice,
              bidCount: 0,
              winTime: new Date(auctionData.updatedAt || auctionData.endDate),
            })
          }
        }
      } else {
        setWinnerInfo(undefined)
      }

      await fetchAuctionExtends(id)
    } catch (error) {
      console.error('Error fetching winner data:', error)
    }
  }, [id, fetchAuctionExtends])

  // SignalR real-time updates - auto refresh on new bid or buy now
  useEffect(() => {
    if (!id) return

    signalRService
      .connect(id, {
        bidPlaced: (event: BidPlacedEvent) => {
          if (event.auctionId !== id) return
          
          // Update auction current price immediately for real-time header update
          setAuction(prev => {
            if (!prev) return prev
            return {
              ...prev,
              currentPrice: event.newPrice,
            }
          })
          
          // Trigger price animation
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
          
          // Refresh winner data when new bid is placed (with delay to ensure server has processed)
          setTimeout(() => {
            fetchWinnerData()
          }, 500)
        },
        buyNow: (event: BuyNowEvent) => {
          if (event.auctionId !== id) return
          // Refresh winner data immediately when buy now happens
          fetchWinnerData()
        },
      })
      .catch(error => {
        console.error('[AuctionWinnerPage] Failed to init realtime connection:', error)
      })

    return () => {
      signalRService.disconnect().catch(console.error)
    }
  }, [id, fetchWinnerData])

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      try {
        setLoading(true)
        await fetchWinnerData()
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, fetchWinnerData])

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

      {/* Main Content - Only Winner */}
      <div className="space-y-6">
        {/* Auction Header Card */}
        <AuctionHeaderCard 
          auction={auction} 
          farmName={farmName} 
          totalExtendMinutes={totalExtendMinutes}
          priceChanged={priceChanged}
        />

        {/* Winner Section */}
        <WinnerSection winner={winnerInfo} />
      </div>
    </div>
  )
}

