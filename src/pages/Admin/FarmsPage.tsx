import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Crop { id: string; name: string; type: string; area: string; plantedAt: string; expectedHarvestAt: string; status: 'growing' | 'harvested' | 'paused'; description?: string }
interface Plot { id: string; name: string; area: string; cropType: string; status: 'growing' | 'harvested' | 'paused'; imageUrl?: string }
interface Farm { id: string; name: string; owner: string; location: string; size: string; type: string; status: 'active' | 'inactive'; createdAt: string; imageUrl?: string; crops?: Crop[]; plots?: Plot[] }

const initialFarms: Farm[] = [
  { id: '1', name: 'Nông trại A', owner: 'Nguyễn Văn A', location: 'Huyện B, TP.HCM', size: '2.5 ha', type: 'Rau củ quả', status: 'active', createdAt: '2024-01-15T10:30:00Z', imageUrl: 'https://images.unsplash.com/photo-1492496913980-501348b61469?q=80&w=1200', crops: [ { id: 'c1', name: 'Xà lách Romaine', type: 'Rau lá', area: '0.5 ha', plantedAt: '2024-01-01T00:00:00Z', expectedHarvestAt: '2024-02-15T00:00:00Z', status: 'growing', description: 'Trồng theo mô hình hữu cơ, tưới nhỏ giọt.' }, { id: 'c2', name: 'Cải bó xôi', type: 'Rau lá', area: '0.3 ha', plantedAt: '2023-12-20T00:00:00Z', expectedHarvestAt: '2024-02-05T00:00:00Z', status: 'growing' } ], plots: [ { id: 'p1', name: 'Lô A1', area: '0.3 ha', cropType: 'Xà lách', status: 'growing', imageUrl: 'https://images.unsplash.com/photo-1514846326710-096e4a8035e2?q=80&w=1200' }, { id: 'p2', name: 'Lô A2', area: '0.2 ha', cropType: 'Cải bó xôi', status: 'growing' } ] },
  { id: '2', name: 'Nông trại B', owner: 'Trần Thị B', location: 'Huyện C, TP.HCM', size: '1.8 ha', type: 'Cây ăn quả', status: 'active', createdAt: '2024-01-14T14:20:00Z', imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=1200', crops: [ { id: 'c3', name: 'Mãng cầu ta', type: 'Cây ăn quả', area: '1.2 ha', plantedAt: '2023-08-10T00:00:00Z', expectedHarvestAt: '2024-06-01T00:00:00Z', status: 'growing', description: 'Theo dõi sâu bệnh định kỳ, bón phân hữu cơ.' } ], plots: [ { id: 'p3', name: 'Lô B1', area: '0.6 ha', cropType: 'Mãng cầu', status: 'growing' } ] },
  { id: '3', name: 'Nông trại C', owner: 'Lê Văn C', location: 'Huyện D, TP.HCM', size: '3.2 ha', type: 'Lúa gạo', status: 'inactive', createdAt: '2024-01-13T09:15:00Z', imageUrl: 'https://images.unsplash.com/photo-1534143046043-44af3469836e?q=80&w=1200', crops: [ { id: 'c4', name: 'Lúa OM5451', type: 'Lúa', area: '2.0 ha', plantedAt: '2023-10-01T00:00:00Z', expectedHarvestAt: '2024-02-28T00:00:00Z', status: 'paused', description: 'Tạm dừng do ngập mặn, lên phương án khắc phục.' } ], plots: [ { id: 'p4', name: 'Lô C1', area: '1.0 ha', cropType: 'OM5451', status: 'paused' } ] },
]

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>(initialFarms)
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const PAGE_SIZE = 5
  const [cropPage, setCropPage] = useState(1)
  const [plotPage, setPlotPage] = useState(1)

  const openDetails = (farm: Farm) => { setSelectedFarm(farm); setIsModalOpen(true); setCropPage(1); setPlotPage(1) }
  const closeDetails = () => { setIsModalOpen(false); setSelectedFarm(null) }
  useEffect(() => { setCropPage(1); setPlotPage(1) }, [isModalOpen])
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const getStatusBadge = (status: string) => status === 'active' ? (<Badge variant="outline" className="text-green-600 border-green-600">Hoạt động</Badge>) : (<Badge variant="outline" className="text-gray-600 border-gray-600">Không hoạt động</Badge>)
  const getPlotStatusBadge = (status: Plot['status']) => status === 'growing' ? (<Badge variant="outline" className="text-emerald-600 border-emerald-600">Đang sinh trưởng</Badge>) : status === 'harvested' ? (<Badge variant="outline" className="text-blue-600 border-blue-600">Đã thu hoạch</Badge>) : (<Badge variant="outline" className="text-amber-600 border-amber-600">Tạm dừng</Badge>)
  const handleAddPlot = () => {
    if (!selectedFarm) return
    const nextIndex = (selectedFarm.plots?.length || 0) + 1
    const plotToAdd: Plot = { id: `p${Date.now()}`, name: `Lô ${nextIndex}`, area: 'Chưa cập nhật', cropType: 'Chưa cập nhật', status: 'paused' }
    const updatedFarms = farms.map(f => f.id === selectedFarm.id ? { ...f, plots: [...(f.plots || []), plotToAdd] } : f)
    setFarms(updatedFarms)
    const updatedSelected = updatedFarms.find(f => f.id === selectedFarm.id) || null
    setSelectedFarm(updatedSelected)
    const newLen = (selectedFarm.plots?.length || 0) + 1
    setPlotPage(Math.max(1, Math.ceil(newLen / PAGE_SIZE)))
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6">
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
          <div className="hidden lg:block">
            <SimpleTable>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
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
                {farms.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell className="font-mono text-xs">{farm.id}</TableCell>
                    <TableCell className="font-medium"><div className="truncate max-w-[240px]" title={farm.name}>{farm.name}</div></TableCell>
                    <TableCell><div className="truncate max-w-[200px]" title={farm.owner}>{farm.owner}</div></TableCell>
                    <TableCell><div className="truncate max-w-[280px]" title={farm.location}>{farm.location}</div></TableCell>
                    <TableCell className="text-xs">{farm.size}</TableCell>
                    <TableCell>{getStatusBadge(farm.status)}</TableCell>
                    <TableCell className="text-xs">{formatDate(farm.createdAt)}</TableCell>
                    <TableCell className="text-xs">{(farm.plots?.length || 0)} lô</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openDetails(farm)}>Xem chi tiết</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SimpleTable>
          </div>

          <div className="lg:hidden space-y-3">
            {farms.map((farm) => (
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
                    <p className="text-xs text-gray-500"><span className="font-medium">Số lô:</span> {(farm.plots?.length || 0)}</p>
                    <div className="pt-2"><Button size="sm" variant="outline" onClick={() => openDetails(farm)}>Xem chi tiết</Button></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {isModalOpen && selectedFarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetails} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Chi tiết nông trại · {selectedFarm.name}</h3>
              <button onClick={closeDetails} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-600" /></button>
            </div>
            <div className="p-5 space-y-5 max-h-[85vh] overflow-auto">
              {selectedFarm.imageUrl && (<img src={selectedFarm.imageUrl} alt={selectedFarm.name} className="w-full max-h-64 object-cover rounded" />)}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Chủ sở hữu:</span> <span className="font-medium">{selectedFarm.owner}</span></div>
                <div><span className="text-gray-500">Địa điểm:</span> <span className="font-medium">{selectedFarm.location}</span></div>
                <div><span className="text-gray-500">Diện tích:</span> <span className="font-medium">{selectedFarm.size}</span></div>
                <div><span className="text-gray-500">Loại hình:</span> <span className="font-medium">{selectedFarm.type}</span></div>
                <div className="flex items-center gap-2"><span className="text-gray-500">Trạng thái:</span> {getStatusBadge(selectedFarm.status)}</div>
                <div><span className="text-gray-500">Ngày tạo:</span> <span className="font-medium">{formatDate(selectedFarm.createdAt)}</span></div>
              </div>

              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Cây trồng (Crops)</h4>
                {selectedFarm.crops && selectedFarm.crops.length > 0 ? (
                  <div className="overflow-x-auto">
                    <SimpleTable>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Tên</TableHead>
                          <TableHead className="min-w-[100px]">Loại</TableHead>
                          <TableHead className="min-w-[80px]">Diện tích</TableHead>
                          <TableHead className="min-w-[110px]">Gieo trồng</TableHead>
                          <TableHead className="min-w-[120px]">Dự kiến thu hoạch</TableHead>
                          <TableHead className="min-w-[100px]">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const items = selectedFarm.crops || []
                          const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
                          const safePage = Math.min(cropPage, totalPages)
                          const start = (safePage - 1) * PAGE_SIZE
                          const pageItems = items.slice(start, start + PAGE_SIZE)
                          return pageItems.map((crop) => (
                            <TableRow key={crop.id}>
                              <TableCell className="font-medium">{crop.name}</TableCell>
                              <TableCell className="text-xs">{crop.type}</TableCell>
                              <TableCell className="text-xs">{crop.area}</TableCell>
                              <TableCell className="text-xs">{formatDate(crop.plantedAt)}</TableCell>
                              <TableCell className="text-xs">{formatDate(crop.expectedHarvestAt)}</TableCell>
                              <TableCell className="text-xs">
                                {crop.status === 'growing' && (<Badge variant="outline" className="text-emerald-600 border-emerald-600">Đang sinh trưởng</Badge>)}
                                {crop.status === 'harvested' && (<Badge variant="outline" className="text-blue-600 border-blue-600">Đã thu hoạch</Badge>)}
                                {crop.status === 'paused' && (<Badge variant="outline" className="text-amber-600 border-amber-600">Tạm dừng</Badge>)}
                              </TableCell>
                            </TableRow>
                          ))
                        })()}
                      </TableBody>
                    </SimpleTable>
                    {(() => {
                      const items = selectedFarm.crops || []
                      if (items.length <= PAGE_SIZE) return null
                      const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
                      const canPrev = cropPage > 1
                      const canNext = cropPage < totalPages
                      return (
                        <div className="flex items-center justify-between mt-3 text-sm">
                          <span className="text-gray-600">Trang {cropPage}/{totalPages}</span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCropPage(p => Math.max(1, p - 1))} disabled={!canPrev}>Trước</Button>
                            <Button variant="outline" size="sm" onClick={() => setCropPage(p => Math.min(totalPages, p + 1))} disabled={!canNext}>Sau</Button>
                          </div>
                        </div>
                      )
                    })()}
                    {selectedFarm.crops.some(c => c.description) && (
                      <div className="mt-3 text-xs text-gray-600">
                        {selectedFarm.crops.map(c => c.description ? (<div key={c.id} className="mb-1"><span className="font-medium">{c.name}:</span> {c.description}</div>) : null)}
                      </div>
                    )}
                  </div>
                ) : (<p className="text-sm text-gray-500">Chưa có dữ liệu cây trồng.</p>)}
              </div>

              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Lô đất (Plots)</h4>
                {selectedFarm.plots && selectedFarm.plots.length > 0 ? (
                  <div className="overflow-x-auto">
                    <SimpleTable>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[100px]">Hình ảnh</TableHead>
                          <TableHead className="min-w-[140px]">Tên lô</TableHead>
                          <TableHead className="min-w-[100px]">Diện tích</TableHead>
                          <TableHead className="min-w-[140px]">Loại cây trồng</TableHead>
                          <TableHead className="min-w-[120px]">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const items = selectedFarm.plots || []
                          const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
                          const safePage = Math.min(plotPage, totalPages)
                          const start = (safePage - 1) * PAGE_SIZE
                          const pageItems = items.slice(start, start + PAGE_SIZE)
                          return pageItems.map((plot) => (
                            <TableRow key={plot.id}>
                              <TableCell>{plot.imageUrl ? (<img src={plot.imageUrl} alt={plot.name} className="w-20 h-14 object-cover rounded" />) : (<div className="w-20 h-14 bg-gray-100 rounded" />)}</TableCell>
                              <TableCell className="font-medium">{plot.name}</TableCell>
                              <TableCell className="text-xs">{plot.area}</TableCell>
                              <TableCell className="text-xs">{plot.cropType}</TableCell>
                              <TableCell className="text-xs">{getPlotStatusBadge(plot.status)}</TableCell>
                            </TableRow>
                          ))
                        })()}
                      </TableBody>
                    </SimpleTable>
                    {(() => {
                      const items = selectedFarm.plots || []
                      if (items.length <= PAGE_SIZE) return null
                      const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
                      const canPrev = plotPage > 1
                      const canNext = plotPage < totalPages
                      return (
                        <div className="flex items-center justify-between mt-3 text-sm">
                          <span className="text-gray-600">Trang {plotPage}/{totalPages}</span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPlotPage(p => Math.max(1, p - 1))} disabled={!canPrev}>Trước</Button>
                            <Button variant="outline" size="sm" onClick={() => setPlotPage(p => Math.min(totalPages, p + 1))} disabled={!canNext}>Sau</Button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : (<p className="text-sm text-gray-500">Chưa có dữ liệu lô đất.</p>)}

                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-gray-600">Admin tạo lô mặc định. Farmer sẽ vào cập nhật chi tiết sau.</p>
                    <Button onClick={handleAddPlot}>Tạo lô mặc định</Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end"><Button variant="outline" onClick={closeDetails}>Đóng</Button></div>
          </div>
        </div>
      )}
    </div>
  )
}

