import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { farmApi } from '../../services/api/farmApi'
import { ROUTES } from '../../constants'
import type { Farm } from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { FARM_MESSAGES, TOAST_TITLES } from '../../services/constants/messages'
import { Search, RefreshCw, LandPlot as FarmIcon, Eye } from 'lucide-react'

export default function FarmsPage() {
  const navigate = useNavigate()
  const [farms, setFarms] = useState<Farm[]>([])
  const [isLoadingFarms, setIsLoadingFarms] = useState(false)
  const [cropCounts, setCropCounts] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const FARM_PAGE_SIZE = 10
  const [farmPage, setFarmPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToastContext()

  // Navigation handlers
  const handleViewCrops = (farmId: string) => {
    navigate(`${ROUTES.ADMIN_CROPS}?farmId=${farmId}`)
  }

  // API functions
  const fetchFarms = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsLoadingFarms(true)
    setError(null)
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

        try {
          const results = await Promise.all(
            convertedFarms.map(async (farm) => {
              const cropsRes = await farmApi.getCropsByFarmId(farm.id)
              const count = cropsRes.isSuccess && Array.isArray(cropsRes.data) ? cropsRes.data.length : 0
              return [farm.id, count] as const
            })
          )
          const countsMap = Object.fromEntries(results)
          setCropCounts(countsMap)
        } catch (err) {
          console.error('Lỗi khi lấy số lượng crop cho các nông trại:', err)
          toast({
            title: TOAST_TITLES.INFO,
            description: FARM_MESSAGES.CROP_COUNT_ERROR,
          })
        }

        if (!silent) {
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: FARM_MESSAGES.FETCH_SUCCESS,
          })
        }
      } else {
        const message = response.message || FARM_MESSAGES.FETCH_ERROR
        setError(message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : FARM_MESSAGES.FETCH_ERROR
      setError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoadingFarms(false)
    }
  }, [toast])

  useEffect(() => {
    fetchFarms({ silent: true })
  }, [fetchFarms])

  // Filtered farms
  const filteredFarms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    return farms.filter(farm =>
      !keyword ||
      farm.name.toLowerCase().includes(keyword) ||
      farm.owner.toLowerCase().includes(keyword) ||
      farm.location.toLowerCase().includes(keyword)
    )
  }, [farms, searchTerm])

  // Reset page when search changes
  useEffect(() => {
    setFarmPage(1)
  }, [searchTerm])

  // Helper functions
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const getStatusBadge = (status: string) => status === 'active' ? (<Badge variant="outline" className="text-green-600 border-green-600">Hoạt động</Badge>) : (<Badge variant="outline" className="text-gray-600 border-gray-600">Không hoạt động</Badge>)

  const totalPages = Math.max(1, Math.ceil(filteredFarms.length / FARM_PAGE_SIZE))
  const safePage = Math.min(farmPage, totalPages)
  const start = (safePage - 1) * FARM_PAGE_SIZE
  const pageItems = filteredFarms.slice(start, start + FARM_PAGE_SIZE)

  return (
    <div className="mx-auto max-w-[1800px] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý nông trại</h1>
        <p className="text-base text-gray-600">Danh sách nông trại của người dùng</p>
      </div>

      <Card className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Danh sách nông trại</h2>
            <p className="text-sm text-gray-600">
              {isLoadingFarms ? 'Đang tải...' : `Hiển thị ${filteredFarms.length} / ${farms.length} nông trại`}
              {error && <span className="text-red-600"> · {error}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, chủ sở hữu..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchFarms()} disabled={isLoadingFarms}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingFarms ? 'animate-spin' : ''}`} />
              {isLoadingFarms ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoadingFarms ? (
            <SimpleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left w-[18%]">Tên nông trại</TableHead>
                  <TableHead className="text-left w-[15%]">Chủ sở hữu</TableHead>
                  <TableHead className="text-left w-[22%]">Địa điểm</TableHead>
                  <TableHead className="text-left w-[8%]">Diện tích</TableHead>
                  <TableHead className="text-left w-[9%]">Trạng thái</TableHead>
                  <TableHead className="text-left w-[10%]">Ngày tạo</TableHead>
                  <TableHead className="text-right w-[8%]">Lô đất</TableHead>
                  <TableHead className="text-right w-[10%]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i} className="hover:bg-gray-50">
                    <TableCell className="w-[18%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="w-[15%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="w-[22%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="w-[8%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="w-[9%]"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                    <TableCell className="w-[10%]"><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                    <TableCell className="text-right w-[8%]"><div className="h-4 bg-gray-200 rounded animate-pulse w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right w-[10%]"><div className="h-8 bg-gray-200 rounded animate-pulse w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SimpleTable>
          ) : filteredFarms.length > 0 ? (
            <>
              <div className="hidden lg:block">
                <SimpleTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left w-[18%]">Tên nông trại</TableHead>
                      <TableHead className="text-left w-[15%]">Chủ sở hữu</TableHead>
                      <TableHead className="text-left w-[22%]">Địa điểm</TableHead>
                      {/* <TableHead className="text-left w-[8%]">Diện tích</TableHead> */}
                      <TableHead className="text-left w-[9%]">Trạng thái</TableHead>
                      <TableHead className="text-left w-[10%]">Ngày tạo</TableHead>
                      <TableHead className="text-right w-[8%]">Lô đất</TableHead>
                      <TableHead className="text-right w-[8%]">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((farm) => (
                      <TableRow key={farm.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium min-h-[48px] w-[18%]">
                          <button
                            onClick={() => navigate(ROUTES.ADMIN_FARM_PROFILE.replace(':farmId', farm.id))}
                            className="text-left truncate max-w-[240px] text-blue-600 hover:text-blue-700 hover:underline"
                            title={farm.name}
                          >
                            {farm.name}
                          </button>
                        </TableCell>
                        <TableCell className="min-h-[48px] w-[15%]"><div className="truncate max-w-[200px]" title={farm.owner}>{farm.owner}</div></TableCell>
                        <TableCell className="min-h-[48px] w-[22%]"><div className="truncate max-w-[280px]" title={farm.location}>{farm.location}</div></TableCell>
                        {/* <TableCell className="text-sm min-h-[48px] w-[8%]">{farm.size}</TableCell> */}
                        <TableCell className="min-h-[48px] w-[9%]">{getStatusBadge(farm.status)}</TableCell>
                        <TableCell className="text-sm min-h-[48px] w-[10%]">{formatDate(farm.createdAt)}</TableCell>
                        <TableCell className="text-sm text-right min-h-[48px] w-[8%]">{cropCounts[farm.id] ?? '—'} lô</TableCell>
                        <TableCell className="text-right min-h-[48px] w-[10%]">
                          <Button size="sm" variant="outline" onClick={() => handleViewCrops(farm.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Xem vụ trồng
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </SimpleTable>
                {totalPages > 1 && (
                  <div className="flex items-center justify-end mt-4 text-sm">
                    <span className="text-gray-600 mr-4">Trang {farmPage}/{totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setFarmPage(p => Math.max(1, p - 1))} disabled={farmPage <= 1}>
                        Trước
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setFarmPage(p => Math.min(totalPages, p + 1))} disabled={farmPage >= totalPages}>
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:hidden space-y-4">
                {pageItems.map((farm) => (
                  <div key={farm.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {farm.imageUrl && (<img src={farm.imageUrl} alt={farm.name} className="w-full h-36 object-cover rounded mb-2" />)}
                          <button
                            onClick={() => navigate(ROUTES.ADMIN_FARM_PROFILE.replace(':farmId', farm.id))}
                            className="font-medium text-gray-900 truncate text-left text-blue-600 hover:text-blue-700 hover:underline"
                            title={farm.name}
                          >
                            {farm.name}
                          </button>
                          <p className="text-sm text-gray-500 truncate" title={farm.owner}>Chủ sở hữu: {farm.owner}</p>
                        </div>
                        <div className="ml-2">{getStatusBadge(farm.status)}</div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="truncate" title={farm.location}><span className="font-medium">Địa điểm:</span> {farm.location}</p>
                        <div className="flex gap-4 text-xs"><span><span className="font-medium">Diện tích:</span> {farm.size}</span><span><span className="font-medium">Loại:</span> {farm.type}</span></div>
                        <p className="text-xs text-gray-500"><span className="font-medium">Ngày tạo:</span> {formatDate(farm.createdAt)}</p>
                        <p className="text-xs text-gray-500"><span className="font-medium">Số crop:</span> {cropCounts[farm.id] ?? '—'}</p>
                        <div className="pt-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewCrops(farm.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Xem vụ trồng
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-end mt-4 text-sm">
                    <span className="text-gray-600 mr-4">Trang {farmPage}/{totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setFarmPage(p => Math.max(1, p - 1))} disabled={farmPage <= 1}>
                        Trước
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setFarmPage(p => Math.min(totalPages, p + 1))} disabled={farmPage >= totalPages}>
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <FarmIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'Không tìm thấy nông trại' : 'Chưa có nông trại nào'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm 
                  ? 'Thử tìm kiếm với từ khóa khác' 
                  : 'Hiện tại chưa có nông trại nào trong hệ thống'}
              </p>
              {searchTerm && (
                <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

