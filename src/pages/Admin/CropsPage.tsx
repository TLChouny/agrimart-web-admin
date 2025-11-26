import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { X, Search, RefreshCw, Sprout, Eye } from 'lucide-react'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { farmApi } from '../../services/api/farmApi'
import type { Crop, Farm, ApiHarvest } from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { CROP_MESSAGES, FARM_MESSAGES, HARVEST_MESSAGES, TOAST_TITLES } from '../../services/constants/messages'

export default function CropsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [farms, setFarms] = useState<Farm[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [isLoadingFarms, setIsLoadingFarms] = useState(false)
  const [isLoadingCrops, setIsLoadingCrops] = useState(false)
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const PAGE_SIZE = 10
  const [cropPage, setCropPage] = useState(1)
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null)
  const [harvests, setHarvests] = useState<ApiHarvest[]>([])
  const [isLoadingHarvests, setIsLoadingHarvests] = useState(false)
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false)
  const [farmError, setFarmError] = useState<string | null>(null)
  const [cropError, setCropError] = useState<string | null>(null)
  const [harvestError, setHarvestError] = useState<string | null>(null)
  const { toast } = useToastContext()

  // API functions
  const fetchFarms = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsLoadingFarms(true)
    setFarmError(null)
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
        if (!silent) {
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: FARM_MESSAGES.FETCH_SUCCESS,
          })
        }
      } else {
        const message = response.message || FARM_MESSAGES.FETCH_ERROR
        setFarmError(message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : FARM_MESSAGES.FETCH_ERROR
      setFarmError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoadingFarms(false)
    }
  }, [toast])

  const fetchCrops = useCallback(async (farmId?: string, { silent = false }: { silent?: boolean } = {}) => {
    setIsLoadingCrops(true)
    setCropError(null)
    try {
      const farmsToFetch = farmId ? farms.filter(f => f.id === farmId) : farms
      if (farmsToFetch.length === 0) {
        setCrops([])
        if (!silent) {
          toast({
            title: TOAST_TITLES.INFO,
            description: CROP_MESSAGES.NO_FARM_SELECTED,
          })
        }
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
          toast({
            title: TOAST_TITLES.INFO,
            description: `${CROP_MESSAGES.PARTIAL_ERROR} (${farm.name})`,
          })
        }
      }
      setCrops(allCrops)
      if (!silent) {
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: CROP_MESSAGES.FETCH_SUCCESS,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : CROP_MESSAGES.FETCH_ERROR
      setCropError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoadingCrops(false)
    }
  }, [farms, toast])

  useEffect(() => {
    fetchFarms({ silent: true })
  }, [fetchFarms])

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
      fetchCrops(selectedFarmId || undefined, { silent: true })
    }
  }, [farms, selectedFarmId, fetchCrops])

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
    setHarvestError(null)
    try {
      const response = await farmApi.getHarvestsByCropId(crop.id)
      if (response.isSuccess && response.data) {
        setHarvests(response.data)
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: HARVEST_MESSAGES.FETCH_SUCCESS,
        })
      } else {
        setHarvests([])
        toast({
          title: TOAST_TITLES.INFO,
          description: HARVEST_MESSAGES.FETCH_ERROR,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : HARVEST_MESSAGES.FETCH_ERROR
      console.error('Lỗi khi tải danh sách thu hoạch:', error)
      setHarvests([])
      setHarvestError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
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
  const baseFilteredCrops = selectedFarmId ? crops.filter(c => c.farmId === selectedFarmId) : crops
  
  const filteredCrops = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    return baseFilteredCrops.filter(crop =>
      !keyword ||
      crop.name.toLowerCase().includes(keyword) ||
      crop.farmName.toLowerCase().includes(keyword) ||
      crop.type.toLowerCase().includes(keyword) ||
      (crop.description && crop.description.toLowerCase().includes(keyword))
    )
  }, [baseFilteredCrops, searchTerm])

  // Reset page when search or filter changes
  useEffect(() => {
    setCropPage(1)
  }, [searchTerm, selectedFarmId])

  const totalPages = Math.max(1, Math.ceil(filteredCrops.length / PAGE_SIZE))
  const safePage = Math.min(cropPage, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pageItems = filteredCrops.slice(start, start + PAGE_SIZE)

  return (
    <div className="mx-auto max-w-[1800px] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vụ trồng</h1>
        <p className="text-base text-gray-600">Danh sách vụ trồng của các nông trại</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xs">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Lọc theo nông trại</h2>
            {isLoadingFarms ? (
              <p className="text-sm text-gray-500">Đang tải...</p>
            ) : (
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white h-10"
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
            {farmError && <p className="text-xs text-red-600 mt-2">{farmError}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchFarms()} disabled={isLoadingFarms}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingFarms ? 'animate-spin' : ''}`} />
            {isLoadingFarms ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Danh sách vụ trồng</h2>
            <p className="text-sm text-gray-600">
              {isLoadingCrops ? 'Đang tải...' : `Hiển thị ${filteredCrops.length} / ${crops.length} vụ trồng`}
              {cropError && <span className="text-red-600"> · {cropError}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, nông trại, loại..."
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCrops(selectedFarmId || undefined)}
              disabled={isLoadingCrops || farms.length === 0}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCrops ? 'animate-spin' : ''}`} />
              {isLoadingCrops ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoadingCrops ? (
            <div className="min-w-[1000px]">
              <SimpleTable>
                <TableHeader>
                <TableRow>
                  <TableHead className="text-left w-[22%] min-w-[200px]">Vụ trồng</TableHead>
                  <TableHead className="text-left w-[26%] min-w-[220px]">Thông tin</TableHead>
                  <TableHead className="text-left hidden lg:table-cell w-[14%] min-w-[110px]">Gieo trồng</TableHead>
                  <TableHead className="text-left hidden xl:table-cell w-[14%] min-w-[130px]">Dự kiến thu hoạch</TableHead>
                  <TableHead className="text-left w-[10%] min-w-[120px]">Trạng thái</TableHead>
                  <TableHead className="text-right w-[14%] min-w-[120px] whitespace-nowrap">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i} className="hover:bg-gray-50">
                    <TableCell className="w-[22%]">
                      <div className="space-y-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                      </div>
                    </TableCell>
                    <TableCell className="w-[26%]">
                      <div className="space-y-1">
                        <div className="h-3 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse hidden md:block" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse hidden md:block w-32" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell w-[14%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="hidden xl:table-cell w-[14%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="w-[10%]"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                    <TableCell className="text-right w-[14%]"><div className="h-8 bg-gray-200 rounded animate-pulse w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SimpleTable>
            </div>
          ) : filteredCrops.length > 0 ? (
            <>
              <div className="min-w-[900px]">
                <SimpleTable>
                  <TableHeader>
                  <TableRow>
                    <TableHead className="text-left w-[22%] min-w-[200px]">Vụ trồng</TableHead>
                    {/* <TableHead className="text-left min-w-[150px]">Loại</TableHead> */}
                    <TableHead className="text-left w-[26%] min-w-[220px]">Thông tin</TableHead>
                    <TableHead className="text-left hidden lg:table-cell w-[14%] min-w-[110px]">Gieo trồng</TableHead>
                    <TableHead className="text-left hidden xl:table-cell w-[14%] min-w-[130px]">Dự kiến thu hoạch</TableHead>
                    <TableHead className="text-left w-[10%] min-w-[120px]">Trạng thái</TableHead>
                    <TableHead className="text-right w-[14%] min-w-[120px] whitespace-nowrap">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map(crop => (
                    <TableRow key={crop.id} className="hover:bg-gray-50">
                      <TableCell className="min-h-[48px] w-[22%]">
                        <div>
                          <div className="font-medium text-gray-900">{crop.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{crop.farmName}</div>
                        </div>
                      </TableCell>
                      {/* <TableCell className="text-sm min-h-[48px]">{crop.type}</TableCell> */}
                      <TableCell className="text-sm min-h-[48px] w-[26%]">
                        <div className="space-y-0.5">
                          <div>Diện tích: <span className="font-medium">{crop.area} m²</span></div>
                          <div className="hidden md:block">Số cây: <span className="font-medium">{crop.treeCount ?? '—'}</span></div>
                          <div className="hidden md:block text-xs text-gray-500">Thời gian canh tác: {crop.farmingDuration ? `${crop.farmingDuration} ngày` : '—'}</div>
                          {crop.description && (
                            <div className="text-xs text-gray-500 truncate max-w-[200px]" title={crop.description}>
                              Mô tả: {crop.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm min-h-[36px] hidden lg:table-cell w-[14%]">{formatDate(crop.plantedAt)}</TableCell>
                      <TableCell className="text-sm min-h-[36px] hidden xl:table-cell w-[14%]">{formatDate(crop.expectedHarvestAt)}</TableCell>
                      <TableCell className="min-h-[48px] w-[10%]">{getStatusBadge(crop.status)}</TableCell>
                      <TableCell className="text-right min-h-[48px] min-w-[120px] whitespace-nowrap w-[14%]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHarvests(crop)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Chi tiết</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-end mt-4 text-sm">
                  <span className="text-gray-600 mr-4">Trang {cropPage}/{totalPages}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCropPage(p => Math.max(1, p - 1))}
                      disabled={cropPage <= 1}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCropPage(p => Math.min(totalPages, p + 1))}
                      disabled={cropPage >= totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Sprout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || selectedFarmId ? 'Không tìm thấy vụ trồng' : 'Chưa có vụ trồng nào'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm || selectedFarmId
                  ? 'Thử tìm kiếm với từ khóa khác hoặc chọn nông trại khác'
                  : 'Hiện tại chưa có vụ trồng nào trong hệ thống'}
              </p>
              {(searchTerm || selectedFarmId) && (
                <div className="flex gap-2 justify-center">
                  {searchTerm && (
                    <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                      Xóa tìm kiếm
                    </Button>
                  )}
                  {selectedFarmId && (
                    <Button variant="outline" size="sm" onClick={() => handleFarmFilterChange(null)}>
                      Xóa bộ lọc
                    </Button>
                  )}
                </div>
              )}
            </div>
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
            {harvestError && <p className="text-sm text-red-600 text-center mb-3">{harvestError}</p>}
            {isLoadingHarvests ? (
              <p className="text-sm text-gray-500 text-center py-4">Đang tải danh sách thu hoạch...</p>
            ) : harvests.length > 0 ? (
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[18%] min-w-[120px]">Ngày bắt đầu</TableHead>
                    <TableHead className="w-[18%] min-w-[120px]">Ngày thu hoạch</TableHead>
                    <TableHead className="w-[14%] min-w-[100px]">Số lượng</TableHead>
                    <TableHead className="w-[10%] min-w-[80px]">Đơn vị</TableHead>
                    <TableHead className="w-[16%] min-w-[120px]">Giá bán</TableHead>
                    <TableHead className="w-[24%] min-w-[200px]">Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {harvests.map(harvest => (
                    <TableRow key={harvest.id}>
                      <TableCell className="text-xs w-[18%]">{formatDateTime(harvest.startDate)}</TableCell>
                      <TableCell className="text-xs w-[18%]">
                        {harvest.harvestDate ? (
                          formatDateTime(harvest.harvestDate)
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            Chưa thu hoạch
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs w-[14%]">{harvest.totalQuantity}</TableCell>
                      <TableCell className="text-xs w-[10%]">{harvest.unit}</TableCell>
                      <TableCell className="text-xs w-[16%]">
                        {harvest.salePrice > 0 ? formatCurrency(harvest.salePrice) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 w-[24%]">{harvest.note || '—'}</TableCell>
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

