import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { PenSquare, Trash2, Tags, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { farmApi } from '../../services/api/farmApi'
import type { CustardAppleType } from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { CATEGORY_MESSAGES, TOAST_TITLES } from '../../services/constants/messages'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToastContext()
  const PAGE_SIZE = 5

  // API functions
  const fetchCustardAppleTypes = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsLoadingTypes(true)
    setError(null)
    try {
      const response = await farmApi.getCustardAppleTypes()
      if (response.isSuccess && response.data) {
        setCustardTypes(response.data)
        if (!silent) {
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: CATEGORY_MESSAGES.FETCH_SUCCESS,
          })
        }
      } else {
        const message = response.message || CATEGORY_MESSAGES.FETCH_ERROR
        setError(message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : CATEGORY_MESSAGES.FETCH_ERROR
      setError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoadingTypes(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCustardAppleTypes({ silent: true })
  }, [fetchCustardAppleTypes])

  const filteredTypes = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return custardTypes
    return custardTypes.filter(type =>
      type.name.toLowerCase().includes(keyword) ||
      (type.description || '').toLowerCase().includes(keyword)
    )
  }, [custardTypes, searchTerm])

  useEffect(() => {
    setTypePage(1)
  }, [searchTerm])

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
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: CATEGORY_MESSAGES.CREATE_SUCCESS,
        })
      } else {
        const message = response.message || CATEGORY_MESSAGES.CREATE_ERROR
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : CATEGORY_MESSAGES.CREATE_ERROR
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
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
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: CATEGORY_MESSAGES.UPDATE_SUCCESS,
        })
      } else {
        const message = response.message || CATEGORY_MESSAGES.UPDATE_ERROR
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : CATEGORY_MESSAGES.UPDATE_ERROR
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRequestDeleteType = (type: CustardAppleType) => setDeleteTarget(type)
  const handleConfirmDeleteType = async () => {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    try {
      const response = await farmApi.deleteCustardAppleType(deleteTarget.id)
      if (response.isSuccess) {
        await fetchCustardAppleTypes()
        const updatedLength = custardTypes.length - 1
        const totalPages = Math.max(1, Math.ceil(updatedLength / PAGE_SIZE))
        if (typePage > totalPages) {
          setTypePage(Math.max(1, totalPages))
        }
        if (editingTypeId === deleteTarget.id) closeEditModal()
        setDeleteTarget(null)
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: CATEGORY_MESSAGES.DELETE_SUCCESS,
        })
      } else {
        const message = response.message || CATEGORY_MESSAGES.DELETE_ERROR
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : CATEGORY_MESSAGES.DELETE_ERROR
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }
  const handleCancelDeleteType = () => setDeleteTarget(null)

  return (
    <div className="mx-auto max-w-[1800px] p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          {/* <p className="text-xs uppercase tracking-[0.4em] text-emerald-600 mb-2">Danh mục</p> */}
          <h1 className="text-2xl font-bold text-gray-900">Quản lý loại mãng cầu</h1>
          <p className="text-responsive-base text-gray-600">Tạo và cập nhật danh mục phục vụ các quy trình nông trại.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên hoặc mô tả"
              className="pl-9"
            />
          </div>
          {!isTypeFormVisible && (
            <Button onClick={startCreateType}>
              Thêm loại mãng cầu
            </Button>
          )}
        </div>
      </div>

      <Card className="card-responsive">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Danh sách loại mãng cầu</h2>
            <p className="text-responsive-sm text-gray-600">
              {isLoadingTypes ? 'Đang tải...' : `Có ${filteredTypes.length} loại`}
              {error ? ` · Lỗi: ${error}` : ''}
            </p>
          </div>
          {isTypeFormVisible && (
            <Button variant="outline" onClick={handleCancelCreate} disabled={isCreating}>
              Hủy thêm mới
            </Button>
          )}
        </div>

        {isTypeFormVisible && (
          <div className="mt-4 space-y-4 border rounded-2xl p-4 bg-gray-50">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tên loại</label>
                <Input
                  value={createForm.name}
                  onChange={(event) => handleCreateInputChange('name', event.target.value)}
                  placeholder="Ví dụ: Mãng cầu Bà Đen"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Mô tả</label>
                <Textarea
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

        <div className="mt-6 overflow-x-auto">
          {isLoadingTypes ? (
            <SimpleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%] min-w-[160px] text-left">Tên</TableHead>
                  <TableHead className="w-[50%] min-w-[240px] text-left">Mô tả</TableHead>
                  <TableHead className="text-right w-[20%] min-w-[140px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, rowIdx) => (
                  <TableRow key={rowIdx}>
                    <TableCell className="py-5 w-[30%]">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                    </TableCell>
                    <TableCell className="py-5 w-[50%]">
                      <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
                    </TableCell>
                    <TableCell className="py-5 text-right w-[20%]">
                      <div className="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SimpleTable>
          ) : filteredTypes.length > 0 ? (
            <>
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%] min-w-[160px] text-left">Tên</TableHead>
                    <TableHead className="w-[50%] min-w-[240px] text-left">Mô tả</TableHead>
                    <TableHead className="text-right w-[20%] min-w-[140px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const totalPages = Math.max(1, Math.ceil(filteredTypes.length / PAGE_SIZE))
                    const safePage = Math.min(typePage, totalPages)
                    const start = (safePage - 1) * PAGE_SIZE
                    const pageItems = filteredTypes.slice(start, start + PAGE_SIZE)
                    return pageItems.map(type => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium w-[30%]">{type.name}</TableCell>
                        <TableCell className="text-sm text-gray-600 w-[50%]">{type.description || '—'}</TableCell>
                        <TableCell className="text-right w-[20%]">
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
                if (filteredTypes.length <= PAGE_SIZE) return null
                const totalPages = Math.max(1, Math.ceil(filteredTypes.length / PAGE_SIZE))
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
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="rounded-full bg-emerald-50 p-4">
                <Tags className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Chưa có loại mãng cầu nào</h3>
              <p className="text-sm text-gray-500 max-w-md">Thêm loại mới để bắt đầu phân loại sản phẩm cho hệ thống.</p>
              <Button onClick={startCreateType}>Thêm loại đầu tiên</Button>
            </div>
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

