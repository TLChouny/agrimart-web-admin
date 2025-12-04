import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import type { ApiEnglishAuction, AuctionStatus } from '../../types/api'
import { TrendingUp, Calendar, DollarSign, Users, Zap, Clock } from 'lucide-react'
import { formatCurrencyVND } from '../../utils/currency'
import { useEffect, useState } from 'react'

interface AuctionHeaderCardProps {
  auction: ApiEnglishAuction
  farmName: string
  totalExtendMinutes?: number
  priceChanged?: boolean
}

function formatDateTime(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('vi-VN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function getStatusBadge(status: AuctionStatus) {
  switch (status) {
    case 'Draft': return <Badge className="bg-gray-100 text-gray-700">Bản nháp</Badge>
    case 'Pending': return <Badge className="bg-yellow-100 text-yellow-700">Đợi xét duyệt</Badge>
    case 'Rejected': return <Badge className="bg-red-100 text-red-700">Bị từ chối</Badge>
    case 'Approved': return <Badge className="bg-green-100 text-green-700">Chấp nhận</Badge>
    case 'OnGoing': return <Badge className="bg-blue-100 text-blue-700">Đang diễn ra</Badge>
    case 'Pause': return <Badge className="bg-amber-100 text-amber-700">Đang tạm dừng</Badge>
    case 'Completed': return <Badge className="bg-gray-100 text-gray-700">Hoàn thành</Badge>
    case 'NoWinner': return <Badge className="bg-orange-100 text-orange-700">Không có người chiến thắng</Badge>
    case 'Cancelled': return <Badge className="bg-rose-100 text-rose-700">Hủy</Badge>
    default: return <Badge className="bg-gray-100 text-gray-700">Không xác định</Badge>
  }
}

export function AuctionHeaderCard({ auction, farmName, totalExtendMinutes = 0, priceChanged = false }: AuctionHeaderCardProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [displayPrice, setDisplayPrice] = useState<number | null>(auction.currentPrice ?? null)
  const [previousPrice, setPreviousPrice] = useState<number | null>(auction.currentPrice ?? null)

  // Update display price when auction.currentPrice changes
  useEffect(() => {
    const newPrice = auction.currentPrice ?? null
    if (newPrice !== displayPrice && newPrice !== null && displayPrice !== null) {
      // Price increased - show green animation
      setPreviousPrice(displayPrice)
      setIsAnimating(true)
      setDisplayPrice(newPrice)
      // Reset animation after 1.5 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 1500)
      return () => clearTimeout(timer)
    } else if (newPrice !== displayPrice && newPrice !== null) {
      // First load or price changed from null
      setDisplayPrice(newPrice)
    }
  }, [auction.currentPrice, displayPrice])

  // Also trigger animation when priceChanged prop changes
  useEffect(() => {
    if (priceChanged) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [priceChanged])

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 overflow-hidden">
      <div className="p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600 mb-2">Mã phiên</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3">{auction.sessionCode}</h2>
            {auction.note && (
              <p className="text-sm text-gray-600 max-w-3xl whitespace-nowrap">
                Ghi chú: <span className="text-gray-700 font-medium">{auction.note}</span>
              </p>
            )}
          </div>
          {getStatusBadge(auction.status)}
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <p className="text-xs font-medium text-gray-600 uppercase tracking-[0.18em]">Giá Khởi Điểm</p>
            </div>
            <p className="text-lg font-extrabold text-gray-900 whitespace-nowrap">
              {formatCurrencyVND(auction.startingPrice, { unit: 'VND' })}
            </p>
          </div>

          <div className={`bg-white rounded-2xl p-4 border transition-all duration-500 ${
            isAnimating ? 'border-green-400 bg-green-50 shadow-lg shadow-green-200/50' : 'border-blue-100'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`w-5 h-5 transition-colors duration-300 ${
                isAnimating ? 'text-green-600' : 'text-blue-600'
              }`} />
              <p className="text-xs font-medium text-gray-600 uppercase tracking-[0.18em]">Giá Hiện Tại</p>
            </div>
            <p
              className={`text-lg font-extrabold whitespace-nowrap transition-all duration-500 ${
                isAnimating 
                  ? 'scale-110 drop-shadow-lg' 
                  : 'text-gray-900 scale-100'
              }`}
              style={isAnimating ? {
                animation: 'priceUpdate 1.5s ease-in-out'
              } : {}}
            >
              {displayPrice !== null && displayPrice !== undefined
                ? formatCurrencyVND(displayPrice)
                : auction.currentPrice !== undefined && auction.currentPrice !== null
                ? formatCurrencyVND(auction.currentPrice)
                : '-'}
            </p>
            {isAnimating && previousPrice !== null && displayPrice !== null && displayPrice > previousPrice && (
              <div className="mt-1 text-xs font-semibold text-green-600 opacity-0 animate-in fade-in duration-300">
                ↑ +{formatCurrencyVND(displayPrice - previousPrice)}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-600" />
              <p className="text-xs font-medium text-gray-600 uppercase tracking-[0.18em]">Bước Giá</p>
            </div>
            <p className="text-lg font-extrabold text-gray-900 whitespace-nowrap">
              {formatCurrencyVND(auction.minBidIncrement)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <p className="text-sm font-medium text-gray-600 uppercase tracking-[0.18em]">Bắt Đầu</p>
            </div>
            <p className="text-base font-bold text-gray-900">{formatDateTime(auction.publishDate)}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <p className="text-sm font-medium text-gray-600 uppercase tracking-[0.18em]">Kết Thúc</p>
            </div>
            <div className="flex flex-col">
              <p className="text-base font-bold text-gray-900">
                {formatDateTime(auction.endDate)}
              </p>
              {totalExtendMinutes > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  (+{totalExtendMinutes} phút)
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <p className="text-xs font-medium text-gray-600 uppercase tracking-[0.18em]">Nông Trại</p>
            </div>
            <p className="text-sm font-bold text-gray-900 truncate whitespace-nowrap">{farmName}</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <p className="whitespace-nowrap">
              <span className="text-gray-600 font-medium">Mua ngay: </span>
              <span className="font-semibold text-gray-900">
                {auction.enableBuyNow ? formatCurrencyVND(auction.buyNowPrice) : 'Không'}
              </span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <p className="whitespace-nowrap">
              <span className="text-gray-600 font-medium">Chống chốt giá cuối: </span>
              <span className="font-semibold text-gray-900">
                {auction.enableAntiSniping ? `Có (+${auction.antiSnipingExtensionSeconds} giây)` : 'Không'}
              </span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <p className="whitespace-nowrap">
              <span className="text-gray-600 font-medium">Dự thu hoạch: </span>
              <span className="font-semibold text-gray-900">{formatDateTime(auction.expectedHarvestDate)}</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <p className="whitespace-nowrap">
              <span className="text-gray-600 font-medium">Tổng lượng dự kiến: </span>
              <span className="font-semibold text-gray-900">{auction.expectedTotalQuantity} kg</span>
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
