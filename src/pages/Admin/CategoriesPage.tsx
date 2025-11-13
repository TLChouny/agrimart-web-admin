import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { PenSquare, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { farmApi } from '../../services/api/farmApi'
import type { CustardAppleType } from '../../types/api'

export default function CategoriesPage() {
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
  const PAGE_SIZE = 5

  // API functions
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

  useEffect(() => {
    fetchCustardAppleTypes()
  }, [])

  // Form handlers
  const resetCreateForm = () => setCreateForm({ name: '', description: '' })
  const startCreateType = () => {
    resetCreateForm()
    setIsTypeFormVisible(true)
  }
  const handleCreateInputChange = (field: keyof Omit<CustardAppleType, 'id'>, value: string) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }
  const handleCancelCreate = () => {
    resetCreateForm()
    setIsTypeFormVisible(false)
  }
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
  const handleEditInputChange = (field: keyof Omit<CustardAppleType, 'id'>, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }
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
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Phân loại</h1>
        <p className="text-responsive-base text-gray-600">Quản lý loại mãng cầu trong hệ thống</p>
      </div>

      <Card className="card-responsive">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-responsive-xl font-semibold text-gray-900">Quản lý loại mãng cầu</h2>
            <p className="text-responsive-sm text-gray-600">Có {custardTypes.length} loại mãng cầu trong hệ thống.</p>
          </div>
          {!isTypeFormVisible && <Button onClick={startCreateType}>Thêm loại mãng cầu</Button>}
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
              <Button variant="outline" onClick={handleCancelCreate} disabled={isCreating}>
                Hủy
              </Button>
              <Button onClick={handleCreateSubmit} disabled={isCreating}>
                {isCreating ? 'Đang tạo...' : 'Thêm mới'}
              </Button>
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
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-500 hover:text-gray-900"
                              onClick={() => openEditTypeModal(type)}
                            >
                              <PenSquare className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Sửa</span>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-500 hover:text-rose-600"
                              onClick={() => handleRequestDeleteType(type)}
                            >
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTypePage(p => Math.max(1, p - 1))}
                        disabled={!canPrev}
                      >
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTypePage(p => Math.min(totalPages, p + 1))}
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
            <Button variant="outline" onClick={closeEditModal} disabled={isUpdating}>
              Hủy
            </Button>
            <Button onClick={handleEditSubmit} disabled={isUpdating}>
              {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) handleCancelDeleteType() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa loại mãng cầu</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bạn có chắc muốn xóa loại mãng cầu <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>? Thao tác này không thể hoàn tác.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelDeleteType} disabled={isDeleting}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteType} disabled={isDeleting}>
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

