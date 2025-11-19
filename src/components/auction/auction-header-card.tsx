import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import type { ApiEnglishAuction, AuctionStatus } from '../../types/api'
import { TrendingUp, Calendar, DollarSign, Users, Zap } from 'lucide-react'

interface AuctionHeaderCardProps {
  auction: ApiEnglishAuction
  farmName: string
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
    case 'Completed': return <Badge className="bg-gray-100 text-gray-700">Hoàn thành</Badge>
    case 'NoWinner': return <Badge className="bg-orange-100 text-orange-700">Không có người chiến thắng</Badge>
    case 'Cancelled': return <Badge className="bg-rose-100 text-rose-700">Hủy</Badge>
    default: return <Badge className="bg-gray-100 text-gray-700">Không xác định</Badge>
  }
}

export function AuctionHeaderCard({ auction, farmName }: AuctionHeaderCardProps) {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 overflow-hidden">
      <div className="p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{auction.note}</h2>
            <p className="text-sm text-gray-600">Mã phiên: <span className="font-mono font-medium">{auction.sessionCode}</span></p>
          </div>
          {getStatusBadge(auction.status)}
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-600">Giá Khởi</p>
            </div>
            <p className="text-sm font-bold text-gray-900">{auction.startingPrice.toLocaleString()} đ/kg</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-600">Giá Hiện Tại</p>
            </div>
            <p className="text-sm font-bold text-gray-900">{auction.currentPrice?.toLocaleString() ?? '-'}</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-gray-600">Bước Giá</p>
            </div>
            <p className="text-sm font-bold text-gray-900">{auction.minBidIncrement.toLocaleString()} đ</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-600">Kết Thúc</p>
            </div>
            <p className="text-xs font-bold text-gray-900">{formatDateTime(auction.endDate)}</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-indigo-600" />
              <p className="text-xs text-gray-600">Nông Trại</p>
            </div>
            <p className="text-xs font-bold text-gray-900 truncate">{farmName}</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <span className="text-gray-600">Buy Now: </span>
            <span className="font-semibold">{auction.enableBuyNow ? `${auction.buyNowPrice.toLocaleString()} đ` : 'Không'}</span>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <span className="text-gray-600">Anti-sniping: </span>
            <span className="font-semibold">{auction.enableAntiSniping ? `Có (+${auction.antiSnipingExtensionSeconds}s)` : 'Không'}</span>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <span className="text-gray-600">Dự Thu Hoạch: </span>
            <span className="font-semibold">{formatDateTime(auction.expectedHarvestDate)}</span>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <span className="text-gray-600">Tổng Lượng: </span>
            <span className="font-semibold">{auction.expectedTotalQuantity}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
