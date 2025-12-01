import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Trophy, CheckCircle2, Mail, Phone } from 'lucide-react'

interface WinnerSectionProps {
  winner?: {
    id: string
    name: string
    email: string
    phone: string
    finalPrice: number
    bidCount: number
    winTime: Date
  }
  status?: string
}

export function WinnerSection({ winner }: WinnerSectionProps) {
  if (!winner) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <div className="p-8 text-center">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chưa có người thắng đấu giá</p>
          <p className="text-sm text-gray-400 mt-1">Phiên đấu giá vẫn đang diễn ra hoặc chưa có kết quả</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-amber-600" />
          <h3 className="text-xl font-bold text-gray-900">Người Thắng Đấu Giá</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Tên Thương Lái</p>
                <p className="text-2xl font-bold text-gray-900">{winner.name}</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Đã Chiến Thắng
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-gray-600 mb-1">Giá Thắng</p>
              <p className="text-lg font-bold text-green-600">{winner.finalPrice.toLocaleString()} đ</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-gray-600 mb-1">Số Lần Đấu Giá</p>
              <p className="text-lg font-bold text-blue-600">{winner.bidCount} lần</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-amber-200 space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Email</p>
              <p className="text-sm font-medium text-gray-900">{winner.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Điện Thoại</p>
              <p className="text-sm font-medium text-gray-900">{winner.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
