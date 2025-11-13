import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { farmApi } from '../../services/api/farmApi'
import { ROUTES } from '../../constants'
import type { Farm } from '../../types/api'

export default function FarmsPage() {
  const navigate = useNavigate()
  const [farms, setFarms] = useState<Farm[]>([])
  const [isLoadingFarms, setIsLoadingFarms] = useState(false)
  const [cropCounts, setCropCounts] = useState<Record<string, number>>({})
  const FARM_PAGE_SIZE = 5
  const [farmPage, setFarmPage] = useState(1)

  // Navigation handlers
  const handleViewCrops = (farmId: string) => {
    navigate(`${ROUTES.ADMIN_CROPS}?farmId=${farmId}`)
  }

  // API functions
  const fetchFarms = async () => {
    setIsLoadingFarms(true)
    try {
      const response = await farmApi.getFarms()
      if (response.isSuccess && response.data) {
        // Chuyển đổi ApiFarm sang Farm format để tương thích với UI hiện tại
        const convertedFarms: Farm[] = response.data.map(apiFarm => ({
          id: apiFarm.id,
          name: apiFarm.name,
          owner: 'Chưa cập nhật', // API không trả về owner, cần lấy từ user service
          location: 'Chưa cập nhật', // API không trả về location
          size: 'Chưa cập nhật', // API không trả về size
          type: 'Chưa cập nhật', // API không trả về type
          status: apiFarm.isActive ? 'active' : 'inactive',
          createdAt: apiFarm.createdAt,
          imageUrl: apiFarm.farmImage,
        }))
        setFarms(convertedFarms)

        // Lấy số lượng crop cho từng farm
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
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách nông trại:', error)
    } finally {
      setIsLoadingFarms(false)
    }
  }

  useEffect(() => {
    fetchFarms()
  }, [])

  // Helper functions
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const getStatusBadge = (status: string) => status === 'active' ? (<Badge variant="outline" className="text-green-600 border-green-600">Hoạt động</Badge>) : (<Badge variant="outline" className="text-gray-600 border-gray-600">Không hoạt động</Badge>)

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Quản lý nông trại</h1>
        <p className="text-responsive-base text-gray-600">Danh sách nông trại của người dùng</p>
      </div>

      <Card className="card-responsive">
        <div className="mb-4">
          <h2 className="text-responsive-xl font-semibold text-gray-900 mb-2">Danh sách nông trại</h2>
          <p className="text-responsive-sm text-gray-600">Có {farms.length} nông trại trong hệ thống</p>
        </div>

        <div className="overflow-x-hidden">
          {isLoadingFarms ? (
            <p className="text-sm text-gray-500">Đang tải danh sách nông trại...</p>
          ) : farms.length > 0 ? (
            <>
              <div className="hidden lg:block">
                <SimpleTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên nông trại</TableHead>
                      <TableHead>Chủ sở hữu</TableHead>
                      <TableHead>Địa điểm</TableHead>
                      <TableHead>Diện tích</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead>Lô đất</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const items = farms
                      const totalPages = Math.max(1, Math.ceil(items.length / FARM_PAGE_SIZE))
                      const safePage = Math.min(farmPage, totalPages)
                      const start = (safePage - 1) * FARM_PAGE_SIZE
                      const pageItems = items.slice(start, start + FARM_PAGE_SIZE)
                      return pageItems.map((farm) => (
                        <TableRow key={farm.id}>
                          <TableCell className="font-medium"><div className="truncate max-w-[240px]" title={farm.name}>{farm.name}</div></TableCell>
                          <TableCell><div className="truncate max-w-[200px]" title={farm.owner}>{farm.owner}</div></TableCell>
                          <TableCell><div className="truncate max-w-[280px]" title={farm.location}>{farm.location}</div></TableCell>
                          <TableCell className="text-xs">{farm.size}</TableCell>
                          <TableCell>{getStatusBadge(farm.status)}</TableCell>
                          <TableCell className="text-xs">{formatDate(farm.createdAt)}</TableCell>
                          <TableCell className="text-xs">{cropCounts[farm.id] ?? '—'} lô</TableCell>
                          <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => handleViewCrops(farm.id)}>Xem vụ trồng</Button></TableCell>
                        </TableRow>
                      ))
                    })()}
                  </TableBody>
                </SimpleTable>
                {(() => {
                  const items = farms
                  if (items.length <= FARM_PAGE_SIZE) return null
                  const totalPages = Math.max(1, Math.ceil(items.length / FARM_PAGE_SIZE))
                  const canPrev = farmPage > 1
                  const canNext = farmPage < totalPages
                  return (
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-gray-600">Trang {farmPage}/{totalPages}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setFarmPage(p => Math.max(1, p - 1))} disabled={!canPrev}>Trước</Button>
                        <Button variant="outline" size="sm" onClick={() => setFarmPage(p => Math.min(totalPages, p + 1))} disabled={!canNext}>Sau</Button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="lg:hidden space-y-3">
                {(() => {
                  const items = farms
                  const totalPages = Math.max(1, Math.ceil(items.length / FARM_PAGE_SIZE))
                  const safePage = Math.min(farmPage, totalPages)
                  const start = (safePage - 1) * FARM_PAGE_SIZE
                  const pageItems = items.slice(start, start + FARM_PAGE_SIZE)
                  return pageItems.map((farm) => (
                  <div key={farm.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {farm.imageUrl && (<img src={farm.imageUrl} alt={farm.name} className="w-full h-36 object-cover rounded mb-2" />)}
                          <h3 className="font-medium text-gray-900 truncate" title={farm.name}>{farm.name}</h3>
                          <p className="text-sm text-gray-500 truncate" title={farm.owner}>Chủ sở hữu: {farm.owner}</p>
                        </div>
                        <div className="ml-2">{getStatusBadge(farm.status)}</div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="truncate" title={farm.location}><span className="font-medium">Địa điểm:</span> {farm.location}</p>
                        <div className="flex gap-4 text-xs"><span><span className="font-medium">Diện tích:</span> {farm.size}</span><span><span className="font-medium">Loại:</span> {farm.type}</span></div>
                        <p className="text-xs text-gray-500"><span className="font-medium">Ngày tạo:</span> {formatDate(farm.createdAt)}</p>
                        <p className="text-xs text-gray-500"><span className="font-medium">Số crop:</span> {cropCounts[farm.id] ?? '—'}</p>
                        <div className="pt-2"><Button size="sm" variant="outline" onClick={() => handleViewCrops(farm.id)}>Xem vụ trồng</Button></div>
                      </div>
                    </div>
                  </div>
                  ))
                })()}
                {(() => {
                  const items = farms
                  if (items.length <= FARM_PAGE_SIZE) return null
                  const totalPages = Math.max(1, Math.ceil(items.length / FARM_PAGE_SIZE))
                  const canPrev = farmPage > 1
                  const canNext = farmPage < totalPages
                  return (
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-gray-600">Trang {farmPage}/{totalPages}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setFarmPage(p => Math.max(1, p - 1))} disabled={!canPrev}>Trước</Button>
                        <Button variant="outline" size="sm" onClick={() => setFarmPage(p => Math.min(totalPages, p + 1))} disabled={!canNext}>Sau</Button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Chưa có nông trại nào trong hệ thống.</p>
          )}
        </div>
      </Card>

    </div>
  )
}

