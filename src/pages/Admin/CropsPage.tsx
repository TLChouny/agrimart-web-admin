import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { farmApi } from '../../services/api/farmApi'
import type { Crop, Farm, ApiHarvest } from '../../types/api'

export default function CropsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [farms, setFarms] = useState<Farm[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [isLoadingFarms, setIsLoadingFarms] = useState(false)
  const [isLoadingCrops, setIsLoadingCrops] = useState(false)
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const PAGE_SIZE = 5
  const [cropPage, setCropPage] = useState(1)
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null)
  const [harvests, setHarvests] = useState<ApiHarvest[]>([])
  const [isLoadingHarvests, setIsLoadingHarvests] = useState(false)
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false)

  // API functions
  const fetchFarms = async () => {
    setIsLoadingFarms(true)
    try {
      const response = await farmApi.getFarms()
      if (response.isSuccess && response.data) {
        const convertedFarms: Farm[] = response.data.map(apiFarm => ({
          id: apiFarm.id,
          name: apiFarm.name,
          owner: 'Chưa cập nhật',
          location: 'Chưa cập nhật',
          size: 'Chưa cập nhật',
          type: 'Chưa cập nhật',
          status: apiFarm.isActive ? 'active' : 'inactive',
          createdAt: apiFarm.createdAt,
          imageUrl: apiFarm.farmImage,
        }))
        setFarms(convertedFarms)
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách nông trại:', error)
    } finally {
      setIsLoadingFarms(false)
    }
  }

  const fetchCrops = async (farmId?: string) => {
    setIsLoadingCrops(true)
    try {
      const farmsToFetch = farmId ? farms.filter(f => f.id === farmId) : farms
      if (farmsToFetch.length === 0) {
        setCrops([])
        return
      }

      const allCrops: Crop[] = []
      for (const farm of farmsToFetch) {
        try {
          const response = await farmApi.getCropsByFarmId(farm.id)
          if (response.isSuccess && response.data) {
            const mappedCrops: Crop[] = response.data.map(c => ({
              id: c.id,
              name: `${c.custardAppleType} (${c.treeCount} cây)`,
              type: c.custardAppleType,
              area: `${c.area}`,
              plantedAt: c.startPlantingDate,
              expectedHarvestAt: c.nearestHarvestDate,
              status: 'growing',
              description: c.note || undefined,
              treeCount: c.treeCount,
              farmingDuration: c.farmingDuration,
              farmId: farm.id,
              farmName: farm.name,
            }))
            allCrops.push(...mappedCrops)
          }
        } catch (error) {
          console.error(`Lỗi khi tải cây trồng của nông trại ${farm.name}:`, error)
        }
      }
      setCrops(allCrops)
    } catch (error) {
      console.error('Lỗi khi tải danh sách cây trồng:', error)
    } finally {
      setIsLoadingCrops(false)
    }
  }

  useEffect(() => {
    fetchFarms()
  }, [])

  // 从 URL 查询参数中读取 farmId（在 farms 加载完成后）
  useEffect(() => {
    if (farms.length > 0) {
      const farmIdFromUrl = searchParams.get('farmId')
      if (farmIdFromUrl) {
        // 验证 farmId 是否存在于 farms 列表中
        const farmExists = farms.some(f => f.id === farmIdFromUrl)
        if (farmExists) {
          setSelectedFarmId(farmIdFromUrl)
        } else {
          // 如果 farmId 不存在，清除 URL 参数
          setSearchParams({})
        }
      }
    }
  }, [farms, searchParams, setSearchParams])

  useEffect(() => {
    if (farms.length > 0) {
      fetchCrops(selectedFarmId || undefined)
    }
  }, [farms, selectedFarmId])

  // Helper functions
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

  const getStatusBadge = (status: string) => {
    if (status === 'growing') {
      return <Badge variant="outline" className="text-emerald-600 border-emerald-600">Đang sinh trưởng</Badge>
    }
    if (status === 'harvested') {
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Đã thu hoạch</Badge>
    }
    if (status === 'paused') {
      return <Badge variant="outline" className="text-amber-600 border-amber-600">Tạm dừng</Badge>
    }
    return null
  }

  // Event handlers
  const handleFarmFilterChange = (farmId: string | null) => {
    setSelectedFarmId(farmId)
    setCropPage(1)
    // 更新 URL 查询参数
    if (farmId) {
      setSearchParams({ farmId })
    } else {
      setSearchParams({})
    }
  }

  const handleViewHarvests = async (crop: Crop) => {
    setSelectedCrop(crop)
    setIsHarvestModalOpen(true)
    setIsLoadingHarvests(true)
    try {
      const response = await farmApi.getHarvestsByCropId(crop.id)
      if (response.isSuccess && response.data) {
        setHarvests(response.data)
      } else {
        setHarvests([])
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách thu hoạch:', error)
      setHarvests([])
    } finally {
      setIsLoadingHarvests(false)
    }
  }

  const handleCloseHarvestModal = () => {
    setIsHarvestModalOpen(false)
    setSelectedCrop(null)
    setHarvests([])
  }

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Computed values
  const filteredCrops = selectedFarmId ? crops.filter(c => c.farmId === selectedFarmId) : crops

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Vụ trồng</h1>
        <p className="text-responsive-base text-gray-600">Danh sách vụ trồng của các nông trại</p>
      </div>

      <Card className="card-responsive mb-6">
        <div className="mb-4">
          <h2 className="text-responsive-xl font-semibold text-gray-900 mb-2">Lọc theo nông trại</h2>
          <div className="max-w-xs">
            {isLoadingFarms ? (
              <p className="text-sm text-gray-500">Đang tải...</p>
            ) : (
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                value={selectedFarmId || ''}
                onChange={(e) => handleFarmFilterChange(e.target.value || null)}
              >
                <option value="">Tất cả nông trại</option>
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </Card>

      <Card className="card-responsive">
        <div className="mb-4">
          <h2 className="text-responsive-xl font-semibold text-gray-900 mb-2">Danh sách vụ trồng</h2>
          <p className="text-responsive-sm text-gray-600">
            {selectedFarmId
              ? `Có ${filteredCrops.length} vụ trồng trong nông trại đã chọn`
              : `Có ${filteredCrops.length} vụ trồng trong hệ thống`}
          </p>
        </div>

        <div className="overflow-x-auto">
          {isLoadingCrops ? (
            <p className="text-sm text-gray-500">Đang tải danh sách vụ trồng...</p>
          ) : filteredCrops.length > 0 ? (
            <>
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Nông trại</TableHead>
                    <TableHead className="min-w-[120px]">Tên</TableHead>
                    <TableHead className="min-w-[100px]">Loại</TableHead>
                    <TableHead className="min-w-[80px]">Diện tích</TableHead>
                    <TableHead className="min-w-[90px]">Số cây</TableHead>
                    <TableHead className="min-w-[110px]">Gieo trồng</TableHead>
                    <TableHead className="min-w-[120px]">Dự kiến thu hoạch</TableHead>
                    <TableHead className="min-w-[120px]">TG canh tác (ngày)</TableHead>
                    <TableHead className="min-w-[100px]">Trạng thái</TableHead>
                    <TableHead className="min-w-[200px]">Ghi chú</TableHead>
                    <TableHead className="min-w-[120px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const items = filteredCrops
                    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
                    const safePage = Math.min(cropPage, totalPages)
                    const start = (safePage - 1) * PAGE_SIZE
                    const pageItems = items.slice(start, start + PAGE_SIZE)
                    return pageItems.map(crop => (
                      <TableRow key={crop.id}>
                        <TableCell className="font-medium">{crop.farmName}</TableCell>
                        <TableCell className="font-medium">{crop.name}</TableCell>
                        <TableCell className="text-xs">{crop.type}</TableCell>
                        <TableCell className="text-xs">{crop.area}</TableCell>
                        <TableCell className="text-xs">{crop.treeCount ?? '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(crop.plantedAt)}</TableCell>
                        <TableCell className="text-xs">{formatDate(crop.expectedHarvestAt)}</TableCell>
                        <TableCell className="text-xs">{crop.farmingDuration ?? '—'}</TableCell>
                        <TableCell className="text-xs">{getStatusBadge(crop.status)}</TableCell>
                        <TableCell className="text-xs text-gray-600">{crop.description || '—'}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHarvests(crop)}
                            className="text-xs"
                          >
                            Xem chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  })()}
                </TableBody>
              </SimpleTable>
              {(() => {
                const items = filteredCrops
                if (items.length <= PAGE_SIZE) return null
                const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
                const canPrev = cropPage > 1
                const canNext = cropPage < totalPages
                return (
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-gray-600">
                      Trang {cropPage}/{totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCropPage(p => Math.max(1, p - 1))}
                        disabled={!canPrev}
                      >
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCropPage(p => Math.min(totalPages, p + 1))}
                        disabled={!canNext}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )
              })()}
            </>
          ) : (
            <p className="text-sm text-gray-500">Chưa có dữ liệu vụ trồng.</p>
          )}
        </div>
      </Card>

      {/* Harvest Details Modal */}
      <Dialog open={isHarvestModalOpen} onOpenChange={setIsHarvestModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Danh sách thu hoạch - {selectedCrop?.name}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseHarvestModal}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-4">
            {isLoadingHarvests ? (
              <p className="text-sm text-gray-500 text-center py-4">Đang tải danh sách thu hoạch...</p>
            ) : harvests.length > 0 ? (
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Ngày bắt đầu</TableHead>
                    <TableHead className="min-w-[120px]">Ngày thu hoạch</TableHead>
                    <TableHead className="min-w-[100px]">Số lượng</TableHead>
                    <TableHead className="min-w-[80px]">Đơn vị</TableHead>
                    <TableHead className="min-w-[120px]">Giá bán</TableHead>
                    <TableHead className="min-w-[200px]">Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {harvests.map(harvest => (
                    <TableRow key={harvest.id}>
                      <TableCell className="text-xs">{formatDateTime(harvest.startDate)}</TableCell>
                      <TableCell className="text-xs">
                        {harvest.harvestDate ? (
                          formatDateTime(harvest.harvestDate)
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            Chưa thu hoạch
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{harvest.totalQuantity}</TableCell>
                      <TableCell className="text-xs">{harvest.unit}</TableCell>
                      <TableCell className="text-xs">
                        {harvest.salePrice > 0 ? formatCurrency(harvest.salePrice) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{harvest.note || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu thu hoạch.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

