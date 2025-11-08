import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { PenSquare, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { farmApi } from '../../services/api/farmApi'
import type { CustardAppleType } from '../../types/api'
interface Crop { id: string; name: string; type: string; area: string; plantedAt: string; expectedHarvestAt: string; status: 'growing' | 'harvested' | 'paused'; description?: string }
interface Plot { id: string; name: string; area: string; cropType: string; status: 'growing' | 'harvested' | 'paused'; imageUrl?: string }
interface Farm { id: string; name: string; owner: string; location: string; size: string; type: string; status: 'active' | 'inactive'; createdAt: string; imageUrl?: string; crops?: Crop[]; plots?: Plot[] }

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [isLoadingFarms, setIsLoadingFarms] = useState(false)
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const PAGE_SIZE = 5
  const FARM_PAGE_SIZE = 5
  const [farmPage, setFarmPage] = useState(1)
  const [cropPage, setCropPage] = useState(1)
  const [plotPage, setPlotPage] = useState(1)
  const [typePage, setTypePage] = useState(1)
  const [custardTypes, setCustardTypes] = useState<CustardAppleType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(false)
  const [isTypeFormVisible, setIsTypeFormVisible] = useState(false)
  const [createForm, setCreateForm] = useState<Omit<CustardAppleType, 'id'>>({ name: '', description: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Omit<CustardAppleType, 'id'>>({ name: '', description: '' })
  const [isUpdating, setIsUpdating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CustardAppleType | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const openDetails = (farm: Farm) => { setSelectedFarm(farm); setIsModalOpen(true); setCropPage(1); setPlotPage(1) }
  const closeDetails = () => { setIsModalOpen(false); setSelectedFarm(null) }
  useEffect(() => { setCropPage(1); setPlotPage(1) }, [isModalOpen])

  const fetchCustardAppleTypes = async () => {
    setIsLoadingTypes(true)
    try {
      const response = await farmApi.getCustardAppleTypes()
      if (response.isSuccess && response.data) {
        setCustardTypes(response.data)
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách loại mãng cầu:', error)
    } finally {
      setIsLoadingTypes(false)
    }
  }

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
          crops: [], // API không trả về crops
          plots: [], // API không trả về plots
        }))
        setFarms(convertedFarms)
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách nông trại:', error)
    } finally {
      setIsLoadingFarms(false)
    }
  }

  useEffect(() => {
    fetchCustardAppleTypes()
    fetchFarms()
  }, [])
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

  const resetCreateForm = () => setCreateForm({ name: '', description: '' })
  const startCreateType = () => { resetCreateForm(); setIsTypeFormVisible(true) }
  const handleCreateInputChange = (field: keyof Omit<CustardAppleType, 'id'>, value: string) => { setCreateForm(prev => ({ ...prev, [field]: value })) }
  const handleCancelCreate = () => { resetCreateForm(); setIsTypeFormVisible(false) }
  const handleCreateSubmit = async () => {
    if (!createForm.name.trim() || isCreating) return
    setIsCreating(true)
    try {
      const payload = { name: createForm.name.trim(), description: createForm.description?.trim() || undefined }
      const response = await farmApi.createCustardAppleType(payload)
      if (response.isSuccess) {
        await fetchCustardAppleTypes()
        const totalPages = Math.max(1, Math.ceil((custardTypes.length + 1) / PAGE_SIZE))
        setTypePage(totalPages)
        handleCancelCreate()
      } else {
        console.error('Lỗi khi tạo loại mãng cầu:', response.message)
      }
    } catch (error) {
      console.error('Lỗi khi tạo loại mãng cầu:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const openEditTypeModal = (type: CustardAppleType) => {
    setEditingTypeId(type.id)
    setEditForm({ name: type.name, description: type.description || '' })
    setIsEditModalOpen(true)
  }
  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditingTypeId(null)
    setEditForm({ name: '', description: '' })
  }
  const handleEditInputChange = (field: keyof Omit<CustardAppleType, 'id'>, value: string) => { setEditForm(prev => ({ ...prev, [field]: value })) }
  const handleEditSubmit = async () => {
    if (!editingTypeId || !editForm.name.trim() || isUpdating) return
    setIsUpdating(true)
    try {
      const payload = { name: editForm.name.trim(), description: editForm.description?.trim() || undefined }
      const response = await farmApi.updateCustardAppleType(editingTypeId, payload)
      if (response.isSuccess) {
        await fetchCustardAppleTypes()
        closeEditModal()
      } else {
        console.error('Lỗi khi cập nhật loại mãng cầu:', response.message)
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật loại mãng cầu:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRequestDeleteType = (type: CustardAppleType) => setDeleteTarget(type)
  const handleConfirmDeleteType = async () => {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    try {
      console.log('Đang xóa loại mãng cầu với ID:', deleteTarget.id)
      const response = await farmApi.deleteCustardAppleType(deleteTarget.id)
      console.log('Phản hồi từ API:', response)
      if (response.isSuccess) {
        await fetchCustardAppleTypes()
        const updatedLength = custardTypes.length - 1
        const totalPages = Math.max(1, Math.ceil(updatedLength / PAGE_SIZE))
        if (typePage > totalPages) {
          setTypePage(Math.max(1, totalPages))
        }
        if (editingTypeId === deleteTarget.id) closeEditModal()
        setDeleteTarget(null)
      } else {
        console.error('Lỗi khi xóa loại mãng cầu:', response.message, response.errors)
        alert(`Lỗi khi xóa: ${response.message}${response.errors ? '\n' + response.errors.join('\n') : ''}`)
      }
    } catch (error) {
      console.error('Lỗi khi xóa loại mãng cầu:', error)
      alert(`Lỗi khi xóa loại mãng cầu: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`)
    } finally {
      setIsDeleting(false)
    }
  }
  const handleCancelDeleteType = () => setDeleteTarget(null)

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Quản lý nông trại</h1>
        <p className="text-responsive-base text-gray-600">Danh sách nông trại của người dùng</p>
      </div>

      <Card className="card-responsive mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-responsive-xl font-semibold text-gray-900">Quản lý loại mãng cầu</h2>
            <p className="text-responsive-sm text-gray-600">Có {custardTypes.length} loại mãng cầu trong hệ thống.</p>
          </div>
          {!isTypeFormVisible && (<Button onClick={startCreateType}>Thêm loại mãng cầu</Button>)}
        </div>

        {isTypeFormVisible && (
          <div className="mt-4 space-y-4 border rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tên loại</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={createForm.name}
                  onChange={(event) => handleCreateInputChange('name', event.target.value)}
                  placeholder="Ví dụ: Mãng cầu Bà Đen"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Mô tả</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  rows={2}
                  value={createForm.description}
                  onChange={(event) => handleCreateInputChange('description', event.target.value)}
                  placeholder="Đặc điểm nổi bật, lưu ý canh tác, bảo quản..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelCreate} disabled={isCreating}>Hủy</Button>
              <Button onClick={handleCreateSubmit} disabled={isCreating}>{isCreating ? 'Đang tạo...' : 'Thêm mới'}</Button>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          {isLoadingTypes ? (
            <p className="text-sm text-gray-500">Đang tải danh sách loại mãng cầu...</p>
          ) : custardTypes.length > 0 ? (
            <>
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Tên</TableHead>
                    <TableHead className="min-w-[240px]">Mô tả</TableHead>
                    <TableHead className="text-right min-w-[140px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const items = custardTypes
                    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
                    const safePage = Math.min(typePage, totalPages)
                    const start = (safePage - 1) * PAGE_SIZE
                    const pageItems = items.slice(start, start + PAGE_SIZE)
                    return pageItems.map(type => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell className="text-xs text-gray-600">{type.description || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-gray-900" onClick={() => openEditTypeModal(type)}>
                              <PenSquare className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Sửa</span>
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-rose-600" onClick={() => handleRequestDeleteType(type)}>
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Xóa</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  })()}
                </TableBody>
              </SimpleTable>
              {(() => {
                const items = custardTypes
                if (items.length <= PAGE_SIZE) return null
                const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
                const canPrev = typePage > 1
                const canNext = typePage < totalPages
                return (
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-gray-600">Trang {typePage}/{totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setTypePage(p => Math.max(1, p - 1))} disabled={!canPrev}>Trước</Button>
                      <Button variant="outline" size="sm" onClick={() => setTypePage(p => Math.min(totalPages, p + 1))} disabled={!canNext}>Sau</Button>
                    </div>
                  </div>
                )
              })()}
            </>
          ) : (
            <p className="text-sm text-gray-500">Chưa có loại mãng cầu nào. Thêm mới để bắt đầu quản lý.</p>
          )}
        </div>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={(open) => { if (!open) closeEditModal() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa loại mãng cầu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700" htmlFor="edit-custard-name">Tên loại</label>
              <input
                id="edit-custard-name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={editForm.name}
                onChange={(event) => handleEditInputChange('name', event.target.value)}
                placeholder="Tên loại mãng cầu"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700" htmlFor="edit-custard-description">Mô tả</label>
              <textarea
                id="edit-custard-description"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={3}
                value={editForm.description}
                onChange={(event) => handleEditInputChange('description', event.target.value)}
                placeholder="Cập nhật thông tin mô tả, ghi chú..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeEditModal} disabled={isUpdating}>Hủy</Button>
            <Button onClick={handleEditSubmit} disabled={isUpdating}>{isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) handleCancelDeleteType() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa loại mãng cầu</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Bạn có chắc muốn xóa loại mãng cầu <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>? Thao tác này không thể hoàn tác.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelDeleteType} disabled={isDeleting}>Hủy</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteType} disabled={isDeleting}>{isDeleting ? 'Đang xóa...' : 'Xóa'}</Button>
          </div>
        </DialogContent>
      </Dialog>

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
                          <TableCell className="text-xs">{(farm.plots?.length || 0)} lô</TableCell>
                          <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openDetails(farm)}>Xem chi tiết</Button></TableCell>
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
                        <p className="text-xs text-gray-500"><span className="font-medium">Số lô:</span> {(farm.plots?.length || 0)}</p>
                        <div className="pt-2"><Button size="sm" variant="outline" onClick={() => openDetails(farm)}>Xem chi tiết</Button></div>
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

