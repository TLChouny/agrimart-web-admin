import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Gavel, Clock, TrendingUp } from "lucide-react"
import { formatCurrencyVND } from "../../utils/currency"

interface HotAuction {
  id: string
  farmerName: string
  currentHighestBid: number
  totalBids: number
  remainingTime: string
  sessionCode: string
}

interface HotAuctionsProps {
  auctions: HotAuction[]
  isLoading?: boolean
}

function AuctionSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

export function HotAuctions({ auctions, isLoading }: HotAuctionsProps) {
  return (
    <Card className="border-pink-100">
      <CardHeader className="bg-gradient-to-r from-pink-50 to-transparent border-b border-pink-50">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-gray-900">
          <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
            <Gavel className="w-5 h-5 text-pink-600" />
          </div>
          Đấu giá đang hot
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">Top 5 đấu giá đang diễn ra theo số lượt đấu giá</p>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <AuctionSkeleton />
        ) : auctions.length > 0 ? (
          <div className="space-y-3">
            {auctions.map((auction, index) => (
              <div
                key={auction.id}
                className="flex items-center justify-between p-4 border rounded-xl hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-transparent hover:border-pink-200 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-red-100 text-red-700' :
                    index === 1 ? 'bg-orange-100 text-orange-700' :
                    index === 2 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Nông dân: {auction.farmerName} · {auction.sessionCode}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-600">
                        {formatCurrencyVND(auction.currentHighestBid)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{auction.totalBids} lượt đấu giá</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">{auction.remainingTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 py-8 border border-dashed rounded-lg">
            Chưa có đấu giá nào đang diễn ra.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

