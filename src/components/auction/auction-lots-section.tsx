import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import type { ApiHarvest } from '../../types/api'
import { Package } from 'lucide-react'

interface AuctionLotsSectionProps {
  harvests: ApiHarvest[]
}

export function AuctionLotsSection({ harvests }: AuctionLotsSectionProps) {
  if (harvests.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Không có lô hàng</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Lô Hàng / Mùa Vụ</h3>
      <div className="grid gap-4">
        {harvests.map((harvest) => (
          <Card key={harvest.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Badge className="bg-blue-100 text-blue-700 mb-2">Lô: LOT-{harvest.id.slice(0, 8)}</Badge>
                  <p className="text-sm text-gray-600">{harvest.note || 'Không có ghi chú'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Bắt đầu</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(harvest.startDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {harvest.harvestGradeDetailDTOs.map((detail) => (
                  <div key={detail.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Phân Loại</p>
                    <p className="font-semibold text-gray-900 mb-2">{detail.grade}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {detail.quantity} {detail.unit}
                      </span>
                      <Badge variant="outline" className="text-xs">{detail.unit}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
