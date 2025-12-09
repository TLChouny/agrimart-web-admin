import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { X, Image as ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { farmApi } from '../../services/api/farmApi'
import type { ApiHarvest, ApiHarvestGradeDetail, ApiHarvestImage } from '../../types/api'
import { formatCurrencyVND } from '../../utils/currency'

export default function HarvestsPage() {
  const [harvests, setHarvests] = useState<ApiHarvest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const PAGE_SIZE = 5
  const [page, setPage] = useState(1)
  const [selectedHarvest, setSelectedHarvest] = useState<ApiHarvest | null>(null)
  const [gradeDetails, setGradeDetails] = useState<ApiHarvestGradeDetail[]>([])
  const [harvestImages, setHarvestImages] = useState<ApiHarvestImage[]>([])
  const [isLoadingGradeDetails, setIsLoadingGradeDetails] = useState(false)
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isGradeDetailModalOpen, setIsGradeDetailModalOpen] = useState(false)

  // API functions
  const fetchHarvests = async () => {
    setIsLoading(true)
    try {
      const response = await farmApi.getHarvests()
      if (response.isSuccess && response.data) {
        setHarvests(response.data)
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách thu hoạch:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHarvests()
  }, [])

  // Helper functions
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Event handlers
  const handleViewGradeDetails = async (harvest: ApiHarvest) => {
    setSelectedHarvest(harvest)
    setIsGradeDetailModalOpen(true)
    setIsLoadingGradeDetails(true)
    setIsLoadingImages(true)
    
    try {
      // Load grade details và images cùng lúc
      const [gradeRes, imagesRes] = await Promise.all([
        farmApi.getHarvestGradeDetailsByHarvestId(harvest.id),
        farmApi.getHarvestImagesByHarvestId(harvest.id).catch(() => ({ isSuccess: false, data: [] }))
      ])
      
      if (gradeRes.isSuccess && gradeRes.data) {
        setGradeDetails(gradeRes.data)
      } else {
        setGradeDetails([])
      }
      
      if (imagesRes.isSuccess && imagesRes.data) {
        setHarvestImages(imagesRes.data)
      } else {
        setHarvestImages([])
      }
    } catch (error) {
      console.error('Lỗi khi tải chi tiết thu hoạch:', error)
      setGradeDetails([])
      setHarvestImages([])
    } finally {
      setIsLoadingGradeDetails(false)
      setIsLoadingImages(false)
    }
  }

  const handleCloseGradeDetailModal = () => {
    setIsGradeDetailModalOpen(false)
    setSelectedHarvest(null)
    setGradeDetails([])
    setHarvestImages([])
  }

  // Computed values
  const filteredHarvests = harvests
  const totalPages = Math.max(1, Math.ceil(filteredHarvests.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pageItems = filteredHarvests.slice(start, start + PAGE_SIZE)

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thu hoạch</h1>
        <p className="text-responsive-base text-gray-600">Danh sách tất cả các vụ thu hoạch</p>
      </div>

      <Card className="card-responsive">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Danh sách thu hoạch</h2>
          <p className="text-responsive-sm text-gray-600">
            Có {filteredHarvests.length} vụ thu hoạch trong hệ thống
          </p>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-gray-500">Đang tải danh sách thu hoạch...</p>
          ) : filteredHarvests.length > 0 ? (
            <>
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[17%] min-w-[140px]">Ngày bắt đầu</TableHead>
                    <TableHead className="w-[17%] min-w-[140px]">Ngày thu hoạch</TableHead>
                    <TableHead className="w-[12%] min-w-[100px]">Số lượng</TableHead>
                    <TableHead className="w-[10%] min-w-[80px]">Đơn vị</TableHead>
                    <TableHead className="w-[14%] min-w-[120px]">Giá bán</TableHead>
                    <TableHead className="w-[15%] min-w-[150px]">Ghi chú</TableHead>
                    <TableHead className="w-[15%] min-w-[150px] text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map(harvest => (
                    <TableRow key={harvest.id}>
                      <TableCell className="text-xs w-[17%]">{formatDateTime(harvest.startDate)}</TableCell>
                      <TableCell className="text-xs w-[17%]">
                        {harvest.harvestDate ? (
                          formatDateTime(harvest.harvestDate)
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            Chưa thu hoạch
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs w-[12%]">{harvest.totalQuantity}</TableCell>
                      <TableCell className="text-xs w-[10%]">{harvest.unit}</TableCell>
                      <TableCell className="text-xs w-[14%]">
                        {harvest.salePrice > 0 ? formatCurrencyVND(harvest.salePrice) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 w-[15%]">{harvest.note || '—'}</TableCell>
                      <TableCell className="text-right w-[15%]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewGradeDetails(harvest)}
                          className="text-xs"
                        >
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
              {filteredHarvests.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-gray-600">
                    Trang {safePage}/{totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Chưa có dữ liệu thu hoạch.</p>
          )}
        </div>
      </Card>

      {/* Harvest Grade Detail Modal */}
      <Dialog open={isGradeDetailModalOpen} onOpenChange={setIsGradeDetailModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Chi tiết phân loại thu hoạch
                {selectedHarvest && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Ngày bắt đầu: {formatDateTime(selectedHarvest.startDate)})
                  </span>
                )}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseGradeDetailModal}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* Grade Details Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Chi tiết phân loại</h3>
              {isLoadingGradeDetails ? (
                <p className="text-sm text-gray-500 text-center py-4">Đang tải chi tiết phân loại...</p>
              ) : gradeDetails.length > 0 ? (
                <SimpleTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[20%] min-w-[100px]">Cấp độ</TableHead>
                      <TableHead className="w-[20%] min-w-[120px]">Số lượng</TableHead>
                      <TableHead className="w-[15%] min-w-[80px]">Đơn vị</TableHead>
                      <TableHead className="w-[45%] min-w-[200px]">Ngày tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeDetails.map(gradeDetail => (
                      <TableRow key={gradeDetail.id}>
                        <TableCell className="text-xs w-[20%]">
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Cấp {gradeDetail.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs w-[20%]">{gradeDetail.quantity}</TableCell>
                        <TableCell className="text-xs w-[15%]">{gradeDetail.unit}</TableCell>
                        <TableCell className="text-xs w-[45%]">{formatDateTime(gradeDetail.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </SimpleTable>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu phân loại thu hoạch.</p>
              )}
            </div>

            {/* Images Section */}
            {selectedHarvest && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Hình ảnh ({harvestImages.length})</h3>
                {isLoadingImages ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Đang tải hình ảnh...</p>
                  </div>
                ) : harvestImages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {harvestImages.map((image, index) => (
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
                  <div className="text-center py-8">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Chưa có hình ảnh nào cho vụ thu hoạch này.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

