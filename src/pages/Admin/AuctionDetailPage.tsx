import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AuctionHeaderCard } from '../../components/auction/auction-header-card'
import { AuctionLotsSection } from '../../components/auction/auction-lots-section'
import { BidHistorySection } from '../../components/auction/bid-history-section'
import { PriceChart } from '../../components/auction/price-chart'
import { WinnerSection } from '../../components/auction/winner-section'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import type { ApiEnglishAuction, ApiHarvest } from '../../types/api'
import { ROUTES } from '../../constants'
import { ArrowLeft } from 'lucide-react'

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [auction, setAuction] = useState<ApiEnglishAuction | null>(null)
  const [harvests, setHarvests] = useState<ApiHarvest[]>([])
  const [farmName, setFarmName] = useState<string>('Unknown')
  const [loading, setLoading] = useState<boolean>(true)

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

        // Lấy harvest IDs của auction
        const harvestIdsRes = await auctionApi.getHarvestsByAuctionSessionId(auctionData.id)
        const harvestIds = harvestIdsRes.isSuccess && harvestIdsRes.data ? harvestIdsRes.data.map(h => h.harvestId) : []

        // Lấy thông tin harvests
        const allHarvests: ApiHarvest[] = []
        for (const hid of harvestIds) {
          const harvestRes = await farmApi.getHarvestById(hid)
          if (harvestRes.isSuccess && harvestRes.data) {
            const baseHarvest = harvestRes.data
            const currentHarvestRes = await farmApi.getCurrentHarvestByCropId(baseHarvest.cropID)
            if (currentHarvestRes.isSuccess && currentHarvestRes.data) {
              allHarvests.push(currentHarvestRes.data)
            }
          }
        }
        setHarvests(allHarvests)

        // Lấy farm name
        const farmsRes = await farmApi.getFarms()
        if (farmsRes.isSuccess && farmsRes.data) {
          const farm = farmsRes.data.find(f => f.userId === auctionData.farmerId)
          if (farm) setFarmName(farm.name)
        }

      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

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
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate(ROUTES.ADMIN_AUCTIONS)}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Chi Tiết Phiên Đấu Giá</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Auction Header Card */}
        <AuctionHeaderCard auction={auction} farmName={farmName} />

        {/* Price Chart */}
        <PriceChart 
          currentPrice={auction.currentPrice || auction.startingPrice}
          startingPrice={auction.startingPrice}
        />

        {/* Lots Section */}
        <AuctionLotsSection harvests={harvests} />

        {/* Two Column Layout for Bid History and Winner */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BidHistorySection 
            totalBids={0}
            bids={[]}
            highestBidder={undefined}
          />
          <WinnerSection />
        </div>
      </div>
    </div>
  )
}
