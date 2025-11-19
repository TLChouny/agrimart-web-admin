import { useState } from 'react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { TrendingUp, Crown } from 'lucide-react'

interface Bid {
  id: string
  traderName: string
  price: number
  timestamp: Date
  bidCount?: number
}

interface BidHistorySectionProps {
  bids?: Bid[]
  highestBidder?: {
    name: string
    price: number
  }
  totalBids?: number
}

export function BidHistorySection({ 
  bids = [], 
  highestBidder,
  totalBids = 0 
}: BidHistorySectionProps) {
  const [sortBy, setSortBy] = useState<'price' | 'time'>('price')

  const sortedBids = [...bids].sort((a, b) => {
    if (sortBy === 'price') {
      return b.price - a.price
    } else {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    }
  })

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Lịch Sử Đấu Giá
            </h3>
            <p className="text-sm text-gray-600 mt-1">Tổng {totalBids} lượt đặt giá</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('price')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                sortBy === 'price'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cao Nhất
            </button>
            <button
              onClick={() => setSortBy('time')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                sortBy === 'time'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Mới Nhất
            </button>
          </div>
        </div>

        {highestBidder && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border-2 border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">Giá Cao Nhất Hiện Tại</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{highestBidder.price.toLocaleString()} đ</p>
            <p className="text-sm text-gray-700 mt-1">Người đặt: <span className="font-semibold">{highestBidder.name}</span></p>
          </div>
        )}

        {sortedBids.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Chưa có lượt đặt giá</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedBids.map((bid, index) => (
              <div
                key={bid.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-700">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{bid.traderName}</p>
                    <p className="text-xs text-gray-500">
                      {bid.timestamp.toLocaleString('vi-VN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{bid.price.toLocaleString()} đ</p>
                  {bid.bidCount && (
                    <Badge variant="outline" className="text-xs mt-1">{bid.bidCount} lần</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
