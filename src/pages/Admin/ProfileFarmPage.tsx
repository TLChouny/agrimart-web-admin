import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { farmApi } from '../../services/api/farmApi'
import { auctionApi } from '../../services/api/auctionApi'
import { reportApi } from '../../services/api/reportApi'
import type { ApiFarm, ApiCrop, ApiHarvest, ApiEnglishAuction, AuctionStatus, ReportItem, ApiHarvestGradeDetail, ApiHarvestImage } from '../../types/api'
import { ROUTES } from '../../constants'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { ArrowLeft, LandPlot, Sprout, Scissors, Gavel, Calendar, User, Package, FileWarning, DollarSign, Image as ImageIcon, Eye, X } from 'lucide-react'
import { formatCurrencyVND } from '../../utils/currency'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'

interface CropWithHarvests extends ApiCrop {
  harvests: ApiHarvest[]
  currentHarvest?: ApiHarvest
}

interface AuctionWithReports extends ApiEnglishAuction {
  reports: ReportItem[]
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getAuctionStatusBadge(status: AuctionStatus) {
  switch (status) {
    case 'Draft':
      return <Badge variant="outline" className="text-gray-600 border-gray-600">Bản nháp</Badge>
    case 'Pending':
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Đợi xét duyệt</Badge>
    case 'Rejected':
      return <Badge variant="outline" className="text-red-600 border-red-600">Bị từ chối</Badge>
    case 'Approved':
      return <Badge variant="outline" className="text-green-600 border-green-600">Chấp nhận</Badge>
    case 'OnGoing':
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Đang diễn ra</Badge>
    case 'Completed':
      return <Badge variant="outline" className="text-gray-600 border-gray-600">Hoàn thành</Badge>
    case 'NoWinner':
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Không người chiến thắng</Badge>
    case 'Cancelled':
      return <Badge variant="outline" className="text-rose-600 border-rose-600">Hủy</Badge>
    default:
      return <Badge variant="outline" className="text-gray-600 border-gray-600">Không xác định</Badge>
  }
}

export default function ProfileFarmPage() {
  const { farmId } = useParams<{ farmId: string }>()
  const navigate = useNavigate()
  const { toast } = useToastContext()

  const [farm, setFarm] = useState<ApiFarm | null>(null)
  const [crops, setCrops] = useState<CropWithHarvests[]>([])
  const [auctions, setAuctions] = useState<AuctionWithReports[]>([])
  const [loading, setLoading] = useState(true)
  const [harvestImagesMap, setHarvestImagesMap] = useState<Map<string, ApiHarvestImage[]>>(new Map())
  const [selectedHarvestForImages, setSelectedHarvestForImages] = useState<ApiHarvest | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!farmId) return

      try {
        setLoading(true)

        // Lấy thông tin farm
        const farmsRes = await farmApi.getFarms()
        if (farmsRes.isSuccess && farmsRes.data) {
          const foundFarm = farmsRes.data.find(f => f.id === farmId)
          if (foundFarm) {
            setFarm(foundFarm)

            // Lấy tất cả crops của farm
            const cropsRes = await farmApi.getCropsByFarmId(farmId)
            if (cropsRes.isSuccess && cropsRes.data) {
              const cropsWithHarvests: CropWithHarvests[] = []

              for (const crop of cropsRes.data) {
                // Lấy tất cả harvests của crop (sử dụng GET /crop/{cropId}/harvest)
                const harvestsRes = await farmApi.getHarvestsByCropId(crop.id)
                let allHarvests: ApiHarvest[] = harvestsRes.isSuccess && harvestsRes.data ? harvestsRes.data : []

                // Lấy current harvest (có thể không có)
                let currentHarvest: ApiHarvest | undefined = undefined
                try {
                  const currentHarvestRes = await farmApi.getCurrentHarvestByCropId(crop.id)
                  if (currentHarvestRes.isSuccess && currentHarvestRes.data) {
                    currentHarvest = currentHarvestRes.data
                  }
                } catch (err) {
                  // Không có current harvest là bình thường, không cần xử lý lỗi
                  console.log(`Crop ${crop.id} không có current harvest`)
                }

                // Lấy grade details và images cho mỗi harvest
                const harvestsWithGrades: ApiHarvest[] = []
                const imagesMap = new Map<string, ApiHarvestImage[]>()
                
                for (const harvest of allHarvests) {
                  try {
                    const gradeRes = await farmApi.getHarvestGradeDetailsByHarvestId(harvest.id)
                    const gradeDetails = gradeRes.isSuccess && gradeRes.data
                      ? gradeRes.data.map((detail: ApiHarvestGradeDetail) => ({
                          id: detail.id,
                          grade: detail.grade?.toString(),
                          quantity: detail.quantity,
                          unit: detail.unit,
                        }))
                      : []

                    // Lấy hình ảnh của harvest
                    try {
                      const imagesRes = await farmApi.getHarvestImagesByHarvestId(harvest.id)
                      if (imagesRes.isSuccess && imagesRes.data) {
                        imagesMap.set(harvest.id, imagesRes.data)
                      }
                    } catch (err) {
                      console.error(`Lỗi lấy images cho harvest ${harvest.id}:`, err)
                    }

                    harvestsWithGrades.push({
                      ...harvest,
                      harvestGradeDetailDTOs: gradeDetails,
                    })
                  } catch (err) {
                    console.error(`Lỗi lấy grade detail cho harvest ${harvest.id}:`, err)
                    harvestsWithGrades.push(harvest)
                  }
                }
                
                // Cập nhật images map
                setHarvestImagesMap(prev => {
                  const newMap = new Map(prev)
                  imagesMap.forEach((images, harvestId) => {
                    newMap.set(harvestId, images)
                  })
                  return newMap
                })

                // Sắp xếp harvests: current harvest trước (nếu có), sau đó là các harvest khác theo thời gian
                const sortedHarvests = harvestsWithGrades.sort((a, b) => {
                  // Current harvest luôn ở đầu (nếu có)
                  if (currentHarvest) {
                    if (a.id === currentHarvest.id) return -1
                    if (b.id === currentHarvest.id) return 1
                  }
                  // Các harvest khác sắp xếp theo thời gian (mới nhất trước)
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                })

                cropsWithHarvests.push({
                  ...crop,
                  harvests: sortedHarvests,
                  currentHarvest,
                })
              }

              setCrops(cropsWithHarvests)
            }

            // Lấy tất cả auctions của farmer (thông qua farmerId)
            const allStatuses: AuctionStatus[] = ['Pending', 'Approved', 'Rejected', 'OnGoing', 'Completed', 'NoWinner', 'Cancelled', 'Draft']
            const allAuctions: AuctionWithReports[] = []

            for (const status of allStatuses) {
              const auctionRes = await auctionApi.getEnglishAuctions(status, 1, 1000)
              if (auctionRes.isSuccess && auctionRes.data) {
                const items = auctionRes.data.items || []
                // Lọc theo farmerId
                const farmAuctions = items.filter(a => a.farmerId === foundFarm.userId)
                
                // Lấy reports cho mỗi auction
                for (const auction of farmAuctions) {
                  try {
                    const reportsRes = await reportApi.getReportsByAuctionId(auction.id)
                    const reports = reportsRes.isSuccess && reportsRes.data ? reportsRes.data.items : []
                    allAuctions.push({
                      ...auction,
                      reports,
                    })
                  } catch (err) {
                    console.error(`Lỗi lấy reports cho auction ${auction.id}:`, err)
                    allAuctions.push({
                      ...auction,
                      reports: [],
                    })
                  }
                }
              }
            }

            // Sắp xếp theo ngày tạo mới nhất
            allAuctions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            setAuctions(allAuctions)
          } else {
            toast({
              title: TOAST_TITLES.ERROR,
              description: 'Không tìm thấy nông trại',
              variant: 'destructive',
            })
            navigate(ROUTES.ADMIN_FARMS)
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải dữ liệu'
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [farmId, navigate, toast])

  if (loading) {
    return (
      <div className="mx-auto max-w-[1800px] p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!farm) {
    return (
      <div className="mx-auto max-w-[1800px] p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Không tìm thấy nông trại</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1800px] p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.ADMIN_FARMS)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hồ Sơ Nông Trại</h1>
      </div>

      {/* Farm Information Card */}
      <Card className="mb-6 p-6">
        <div className="flex items-start gap-6">
          {farm.farmImage && (
            <img
              src={farm.farmImage}
              alt={farm.name}
              className="w-32 h-32 object-cover rounded-lg border border-gray-200"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <LandPlot className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-gray-900">{farm.name}</h2>
              <Badge variant="outline" className={farm.isActive ? 'text-green-600 border-green-600' : 'text-gray-600 border-gray-600'}>
                {farm.isActive ? 'Hoạt động' : 'Không hoạt động'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>User ID: {farm.userId}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Ngày tạo: {formatDate(farm.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Cập nhật: {farm.updatedAt ? formatDate(farm.updatedAt) : 'Chưa cập nhật'}</span>
              </div>
            </div>
            {/* Farmer Revenue */}
            {(() => {
              const completedAuctions = auctions.filter(a => a.status === 'Completed' && (a.winningPrice || a.currentPrice))
              const totalRevenue = completedAuctions.reduce((sum, a) => sum + (a.winningPrice ?? a.currentPrice ?? 0), 0)
              return (
                <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-gray-900">Tổng doanh thu từ đấu giá</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrencyVND(totalRevenue)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Từ {completedAuctions.length} phiên đấu giá đã hoàn tất
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      </Card>

      {/* Crops Section */}
      <Card className="mb-6 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sprout className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">Lô Trồng ({crops.length})</h2>
        </div>

        {crops.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Chưa có lô trồng nào</p>
        ) : (
          <div className="space-y-6">
            {crops.map((crop) => (
              <div key={crop.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Lô trồng #{crop.id.slice(0, 8)}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Diện tích:</span> {crop.area} m²
                      </div>
                      <div>
                        <span className="font-medium">Loại:</span> {crop.custardAppleType}
                      </div>
                      <div>
                        <span className="font-medium">Số cây:</span> {crop.treeCount}
                      </div>
                      <div>
                        <span className="font-medium">Thời gian canh tác:</span> {crop.farmingDuration} ngày
                      </div>
                      <div>
                        <span className="font-medium">Ngày bắt đầu:</span> {formatDate(crop.startPlantingDate)}
                      </div>
                      <div>
                        <span className="font-medium">Dự kiến thu hoạch:</span> {formatDate(crop.nearestHarvestDate)}
                      </div>
                    </div>
                    {crop.note && (
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Ghi chú:</span> {crop.note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Harvests Section */}
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Scissors className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">
                      Vụ Thu Hoạch ({crop.harvests.length})
                    </h4>
                    {crop.currentHarvest && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Có vụ hiện tại
                      </Badge>
                    )}
                  </div>

                  {crop.harvests.length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có vụ thu hoạch nào</p>
                  ) : (
                    <div className="space-y-3">
                      {crop.harvests.map((harvest) => {
                        const isCurrent = crop.currentHarvest?.id === harvest.id
                        return (
                          <div
                            key={harvest.id}
                            className={`p-4 rounded-lg border ${
                              isCurrent
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Package className={`w-4 h-4 ${isCurrent ? 'text-green-600' : 'text-gray-600'}`} />
                                <span className="font-semibold text-sm">
                                  {isCurrent ? 'Vụ hiện tại' : 'Vụ trước'}
                                </span>
                                {isCurrent && (
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                    Đang hoạt động
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 font-mono">{harvest.id.slice(0, 8)}...</span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-700 mb-3">
                              <div>
                                <span className="font-medium text-gray-600">Ngày bắt đầu:</span>
                                <span className="ml-2">{formatDate(harvest.startDate)}</span>
                              </div>
                              {harvest.harvestDate && (
                                <div>
                                  <span className="font-medium text-gray-600">Ngày thu hoạch:</span>
                                  <span className="ml-2">{formatDate(harvest.harvestDate)}</span>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-600">Tổng số lượng:</span>
                                <span className="ml-2 font-semibold">{harvest.totalQuantity} {harvest.unit}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Giá bán:</span>
                                <span className="ml-2 font-semibold text-green-600">
                                  {formatCurrencyVND(harvest.salePrice)}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Ngày tạo:</span>
                                <span className="ml-2 text-xs">{formatDateTime(harvest.createdAt)}</span>
                              </div>
                              {harvest.updatedAt && (
                                <div>
                                  <span className="font-medium text-gray-600">Cập nhật:</span>
                                  <span className="ml-2 text-xs">{formatDateTime(harvest.updatedAt)}</span>
                                </div>
                              )}
                            </div>
                            {harvest.note && (
                              <div className="mb-3 p-2 bg-white rounded border border-gray-200">
                                <span className="text-xs font-medium text-gray-600">Ghi chú:</span>
                                <p className="text-sm text-gray-700 mt-1">{harvest.note}</p>
                              </div>
                            )}

                            {harvest.harvestGradeDetailDTOs && harvest.harvestGradeDetailDTOs.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <span className="text-sm font-semibold text-gray-700 mb-2 block">Chi tiết phân loại:</span>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {harvest.harvestGradeDetailDTOs.map((grade, idx) => (
                                    <div key={idx} className="p-2 bg-white rounded border border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-600">Cấp {grade.grade}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {grade.quantity} {grade.unit}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Harvest Images */}
                            {(() => {
                              const images = harvestImagesMap.get(harvest.id) || []
                              if (images.length === 0) return null
                              
                              return (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="flex items-center justify-between mb-4">
                                    <span className="text-base font-semibold text-gray-900">Hình ảnh ({images.length}):</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedHarvestForImages(harvest)
                                        setIsImageModalOpen(true)
                                      }}
                                      className="text-sm"
                                    >
                                      <ImageIcon className="w-4 h-4 mr-2" />
                                      Xem tất cả
                                    </Button>
                                  </div>
                                  <div className="flex gap-4 overflow-x-auto pb-2">
                                    {images.slice(0, 3).map(image => (
                                      <div key={image.id} className="relative group flex-shrink-0">
                                        <img
                                          src={image.imageUrl}
                                          alt={`Harvest ${harvest.id}`}
                                          className="w-64 h-48 object-cover rounded-xl border-2 border-gray-200 hover:border-emerald-400 hover:shadow-xl transition-all cursor-pointer"
                                          onClick={() => {
                                            setSelectedHarvestForImages(harvest)
                                            setIsImageModalOpen(true)
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-opacity rounded-xl" />
                                      </div>
                                    ))}
                                    {images.length > 3 && (
                                      <div
                                        className="w-64 h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-gray-50 transition-all flex-shrink-0"
                                        onClick={() => {
                                          setSelectedHarvestForImages(harvest)
                                          setIsImageModalOpen(true)
                                        }}
                                      >
                                        <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                                        <span className="text-base font-semibold text-gray-600">+{images.length - 3}</span>
                                        <span className="text-sm text-gray-500">ảnh khác</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Auctions Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Gavel className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-900">Phiên Đấu Giá ({auctions.length})</h2>
          </div>
          {(() => {
            const completedAuctions = auctions.filter(a => a.status === 'Completed' && (a.winningPrice || a.currentPrice))
            const totalRevenue = completedAuctions.reduce((sum, a) => sum + (a.winningPrice ?? a.currentPrice ?? 0), 0)
            if (totalRevenue > 0) {
              return (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Tổng doanh thu</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrencyVND(totalRevenue)}</p>
                </div>
              )
            }
            return null
          })()}
        </div>

        {auctions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Chưa có phiên đấu giá nào</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctions.map((auction) => (
              <Card key={auction.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-emerald-300" onClick={() => navigate(ROUTES.ADMIN_AUCTIONS_BY_ID.replace(':id', auction.id))}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate mb-1">{auction.sessionCode}</h3>
                      <p className="text-xs text-gray-500 truncate">{auction.note || 'Không có ghi chú'}</p>
                    </div>
                    {getAuctionStatusBadge(auction.status)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-xs font-medium text-gray-600">Giá khởi điểm</span>
                      <span className="text-sm font-bold text-blue-700">{formatCurrencyVND(auction.startingPrice)}</span>
                    </div>
                    {auction.currentPrice && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-xs font-medium text-gray-600">Giá hiện tại</span>
                        <span className="text-sm font-bold text-green-700">{formatCurrencyVND(auction.currentPrice)}</span>
                      </div>
                    )}
                    {auction.winningPrice && (
                      <div className="flex items-center justify-between p-2 bg-amber-50 rounded">
                        <span className="text-xs font-medium text-gray-600">Giá thắng</span>
                        <span className="text-sm font-bold text-amber-700">{formatCurrencyVND(auction.winningPrice)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-200 space-y-1 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Ngày bắt đầu:</span>
                      <span className="font-medium">{formatDate(auction.publishDate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Ngày kết thúc:</span>
                      <span className="font-medium">{formatDate(auction.endDate)}</span>
                    </div>
                    {auction.reports.length > 0 && (
                      <div className="flex items-center gap-1 pt-1">
                        <FileWarning className="w-3 h-3 text-orange-600" />
                        <span className="text-orange-600 font-medium">{auction.reports.length} báo cáo</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(ROUTES.ADMIN_AUCTIONS_BY_ID.replace(':id', auction.id))
                      }}
                      className="text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Xem chi tiết
                    </Button>
                    {auction.status === 'Completed' && (auction.winningPrice || auction.currentPrice) && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Doanh thu</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {formatCurrencyVND(auction.winningPrice ?? auction.currentPrice ?? 0)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Harvest Images Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Hình ảnh thu hoạch
                {selectedHarvestForImages && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Ngày bắt đầu: {formatDate(selectedHarvestForImages.startDate)})
                  </span>
                )}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsImageModalOpen(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-4">
            {selectedHarvestForImages ? (() => {
              const images = harvestImagesMap.get(selectedHarvestForImages.id) || []
              return images.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:border-emerald-400 transition-all shadow-sm hover:shadow-lg">
                        <img
                          src={image.imageUrl}
                          alt={`Harvest image ${index + 1}`}
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-opacity rounded-lg pointer-events-none" />
                      <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                          {formatDateTime(image.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">Chưa có hình ảnh nào cho vụ thu hoạch này.</p>
                </div>
              )
            })() : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Đang tải...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

