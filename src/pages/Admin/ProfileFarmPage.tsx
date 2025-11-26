import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { farmApi } from '../../services/api/farmApi'
import { auctionApi } from '../../services/api/auctionApi'
import { reportApi } from '../../services/api/reportApi'
import type { ApiFarm, ApiCrop, ApiHarvest, ApiEnglishAuction, AuctionStatus, ReportItem, ApiHarvestGradeDetail } from '../../types/api'
import { ROUTES } from '../../constants'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { ArrowLeft, LandPlot, Sprout, Scissors, Gavel, Calendar, User, Package, FileWarning, TrendingUp, DollarSign } from 'lucide-react'

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

                // Lấy grade details cho mỗi harvest
                const harvestsWithGrades: ApiHarvest[] = []
                for (const harvest of allHarvests) {
                  try {
                    const gradeRes = await farmApi.getHarvestGradeDetailsByHarvestId(harvest.id)
                    if (gradeRes.isSuccess && gradeRes.data) {
                      const gradeDetails = gradeRes.data.map((detail: ApiHarvestGradeDetail) => ({
                        id: detail.id,
                        grade: detail.grade?.toString(),
                        quantity: detail.quantity,
                        unit: detail.unit,
                      }))
                      harvestsWithGrades.push({
                        ...harvest,
                        harvestGradeDetailDTOs: gradeDetails,
                      })
                    } else {
                      harvestsWithGrades.push(harvest)
                    }
                  } catch (err) {
                    console.error(`Lỗi lấy grade detail cho harvest ${harvest.id}:`, err)
                    harvestsWithGrades.push(harvest)
                  }
                }

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                                <span className="ml-2 font-semibold text-green-600">{harvest.salePrice.toLocaleString('vi-VN')} đ</span>
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
        <div className="flex items-center gap-2 mb-6">
          <Gavel className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">Phiên Đấu Giá ({auctions.length})</h2>
        </div>

        {auctions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Chưa có phiên đấu giá nào</p>
        ) : (
          <div className="space-y-6">
            {auctions.map((auction) => (
              <div key={auction.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Gavel className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{auction.sessionCode}</h3>
                      {getAuctionStatusBadge(auction.status)}
                      {auction.reports.length > 0 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <FileWarning className="w-3 h-3 mr-1" />
                          {auction.reports.length} báo cáo
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Ngày tạo:</span>
                        <span className="ml-2 text-xs">{formatDateTime(auction.createdAt)}</span>
                      </div>
                      {auction.updatedAt && (
                        <div>
                          <span className="font-medium">Cập nhật:</span>
                          <span className="ml-2 text-xs">{formatDateTime(auction.updatedAt)}</span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-600">Giá khởi điểm</span>
                        </div>
                        <p className="text-lg font-bold text-blue-700">{auction.startingPrice.toLocaleString('vi-VN')} đ</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-600">Giá hiện tại</span>
                        </div>
                        <p className="text-lg font-bold text-green-700">
                          {auction.currentPrice ? `${auction.currentPrice.toLocaleString('vi-VN')} đ` : '—'}
                        </p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Gavel className="w-4 h-4 text-amber-600" />
                          <span className="font-medium text-gray-600">Giá thắng</span>
                        </div>
                        <p className="text-lg font-bold text-amber-700">
                          {auction.winningPrice ? `${auction.winningPrice.toLocaleString('vi-VN')} đ` : '—'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="font-medium text-gray-600 text-xs block mb-1">Bước giá tối thiểu</span>
                        <p className="text-lg font-bold text-gray-700">{auction.minBidIncrement.toLocaleString('vi-VN')} đ</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 mt-3">
                      <div>
                        <span className="font-medium">Ngày bắt đầu:</span>
                        <span className="ml-2">{formatDateTime(auction.publishDate)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Ngày kết thúc:</span>
                        <span className="ml-2">{formatDateTime(auction.endDate)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Dự kiến thu hoạch:</span>
                        <span className="ml-2">{formatDate(auction.expectedHarvestDate)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Số lượng dự kiến:</span>
                        <span className="ml-2">{auction.expectedTotalQuantity}</span>
                      </div>
                      <div>
                        <span className="font-medium">Mua ngay:</span>
                        <span className="ml-2">{auction.enableBuyNow ? 'Có' : 'Không'}</span>
                        {auction.enableBuyNow && auction.buyNowPrice && (
                          <span className="ml-2 font-semibold">({auction.buyNowPrice.toLocaleString('vi-VN')} đ)</span>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Chống snipe:</span>
                        <span className="ml-2">{auction.enableAntiSniping ? 'Có' : 'Không'}</span>
                      </div>
                    </div>
                    {auction.note && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Ghi chú:</span>
                        <p className="text-sm text-gray-700 mt-1">{auction.note}</p>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(ROUTES.ADMIN_AUCTIONS_BY_ID.replace(':id', auction.id))}
                    >
                      Xem chi tiết
                    </Button>
                  </div>
                </div>

                {/* Reports Section */}
                {auction.reports.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <FileWarning className="w-4 h-4 text-orange-600" />
                      <h4 className="font-semibold text-gray-900">Báo cáo ({auction.reports.length})</h4>
                    </div>
                    <div className="space-y-2">
                      {auction.reports.map((report) => (
                        <div key={report.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {report.reportType}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${
                                report.reportStatus === 'Pending' ? 'text-yellow-600 border-yellow-600' :
                                report.reportStatus === 'Resolved' ? 'text-green-600 border-green-600' :
                                report.reportStatus === 'Rejected' ? 'text-red-600 border-red-600' :
                                'text-gray-600 border-gray-600'
                              }`}>
                                {report.reportStatus}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">{formatDateTime(report.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700">{report.note}</p>
                          <p className="text-xs text-gray-500 mt-1">Reporter ID: {report.reporterId.slice(0, 8)}...</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

