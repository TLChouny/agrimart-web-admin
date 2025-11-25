import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import type { ApiHarvest, ApiFarm, ApiCrop } from '../../types/api'
import { MapPin, Package, Sprout, TreePine, Calendar, FileText, BarChart3, Package2 } from 'lucide-react'

interface AuctionLotsSectionProps {
  harvests: ApiHarvest[]
  farm?: ApiFarm | null
  cropsById?: Record<string, ApiCrop>
  currentHarvestByCropId?: Record<string, ApiHarvest>
}

const formatDate = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('vi-VN')
}

export function AuctionLotsSection({
  harvests,
  farm,
  cropsById = {},
  currentHarvestByCropId = {},
}: AuctionLotsSectionProps) {
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package2 className="h-6 w-6 text-blue-600" />
        <h3 className="text-2xl font-bold text-gray-900">Lô Hàng / Mùa Vụ</h3>
        <Badge variant="outline" className="ml-2 px-3 py-1 border-blue-200 text-blue-700">
          {harvests.length} lô
        </Badge>
      </div>
      <div className="grid gap-6">
        {harvests.map((harvest, index) => {
          const crop = cropsById[harvest.cropID]
          const currentHarvest = currentHarvestByCropId[harvest.cropID]
          const gradeDetails = harvest.harvestGradeDetailDTOs ?? []
          const totalQuantity = gradeDetails.reduce((sum, detail) => sum + (detail.quantity ?? 0), 0)

          return (
            <Card key={harvest.id} className="overflow-hidden border border-gray-200">
              {/* Header Section */}
              <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold text-lg">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-blue-700">
                          LOT-{harvest.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    {harvest.note && (
                      <div className="flex items-start gap-2 pl-14">
                        <FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-500">{harvest.note}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Ngày bắt đầu</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">
                        {new Date(harvest.startDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Farm & Crop Info Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Farm Card */}
                  <div className="relative rounded-lg border border-emerald-200 bg-emerald-50/30 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-emerald-100">
                        <MapPin className="h-5 w-5 text-emerald-600" />
                      </div>
                      <h4 className="text-sm font-bold uppercase tracking-wide text-emerald-700">Thông tin trang trại</h4>
                    </div>
                    {farm ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-emerald-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tên trang trại</p>
                            <p className="text-base font-semibold text-gray-900">{farm.name}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <TreePine className="h-4 w-4 text-emerald-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                            <Badge 
                              variant="outline" 
                              className={farm.isActive 
                                ? 'border-emerald-300 text-emerald-700 bg-emerald-50' 
                                : 'border-gray-300 text-gray-500 bg-gray-50'
                              }
                            >
                              {farm.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Không có thông tin trang trại
                      </p>
                    )}
                  </div>

                  {/* Crop Card */}
                  <div className="relative rounded-lg border border-amber-200 bg-amber-50/30 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-amber-100">
                        <Sprout className="h-5 w-5 text-amber-600" />
                      </div>
                      <h4 className="text-sm font-bold uppercase tracking-wide text-amber-700">Thông tin cây trồng</h4>
                    </div>
                    {crop ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Loại mãng cầu</p>
                          <p className="text-sm font-semibold text-gray-900">{crop.custardAppleType || '--'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Diện tích</p>
                          <p className="text-sm font-semibold text-gray-900">{crop.area ? `${crop.area.toLocaleString('vi-VN')} m²` : '--'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Số cây</p>
                          <p className="text-sm font-semibold text-gray-900">{crop.treeCount?.toLocaleString('vi-VN') ?? '--'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Thời gian canh tác</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {crop.farmingDuration ? `${crop.farmingDuration} ngày` : '--'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Ngày trồng</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDate(currentHarvest?.startDate ?? crop.startPlantingDate)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Ngày thu hoạch</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDate(currentHarvest?.harvestDate || '--')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Sprout className="h-4 w-4" />
                        Không có thông tin cây trồng
                      </p>
                    )}
                  </div>
                </div>

                {/* Grade Details Section */}
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <BarChart3 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-wide text-blue-700">Chi tiết phân hạng</h4>
                          <p className="text-xs text-gray-500 mt-0.5">Số lượng từng loại của lô hàng</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 bg-white rounded-lg px-4 py-2.5 border border-blue-200">
                        <Package className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Tổng sản lượng</p>
                          <p className="text-xl font-bold text-gray-900">
                            {totalQuantity.toLocaleString('vi-VN')} {gradeDetails[0]?.unit ?? ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {gradeDetails.length > 0 ? (
                    <div className="p-6">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {gradeDetails.map((detail) => (
                          <div 
                            key={detail.id ?? detail.grade} 
                            className="rounded-lg border border-gray-200 bg-white p-5"
                          >
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div className="flex-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Phân loại</p>
                                <p className="text-xl font-bold text-gray-900">{detail.grade || '—'}</p>
                              </div>
                              <Badge 
                                variant="outline" 
                                className="px-3 py-1.5 text-xs font-semibold rounded-full border-blue-300 text-blue-700 bg-blue-50 whitespace-nowrap"
                              >
                                {detail.unit || '--'}
                              </Badge>
                            </div>
                            <div className="pt-3 border-t border-gray-200">
                              <div className="flex items-end justify-between">
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sản lượng</p>
                                  <p className="text-lg font-bold text-gray-900">
                                    {detail.quantity?.toLocaleString('vi-VN') ?? 0}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-400 font-medium">{detail.unit}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Chưa có dữ liệu phân hạng cho lô hàng này.</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
