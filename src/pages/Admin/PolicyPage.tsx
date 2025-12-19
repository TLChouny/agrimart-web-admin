import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { PenSquare, Trash2, FileText, Search, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { policyApi } from '../../services/api/policyApi'
import type {
  ApiPolicyCategory,
  ApiPolicyItem,
  CreatePolicyCategoryDTO,
  UpdatePolicyCategoryDTO,
  CreatePolicyItemDTO,
  UpdatePolicyItemDTO,
} from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'

export default function PolicyPage() {
  const { toast } = useToastContext()
  const [activeTab, setActiveTab] = useState<'categories' | 'items'>('categories')

  // Categories state
  const [categories, setCategories] = useState<ApiPolicyCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [categoryPage, setCategoryPage] = useState(1)
  const [categorySearchTerm, setCategorySearchTerm] = useState('')
  const [isCategoryFormVisible, setIsCategoryFormVisible] = useState(false)
  const [createCategoryForm, setCreateCategoryForm] = useState<CreatePolicyCategoryDTO>({
    name: '',
    description: '',
  })
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editCategoryForm, setEditCategoryForm] = useState<UpdatePolicyCategoryDTO>({
    name: '',
    description: '',
    isActive: true,
  })
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<ApiPolicyCategory | null>(null)
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)

  // Items state
  const [items, setItems] = useState<ApiPolicyItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [itemPage, setItemPage] = useState(1)
  const [itemSearchTerm, setItemSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [isItemFormVisible, setIsItemFormVisible] = useState(false)
  const [createItemForm, setCreateItemForm] = useState<CreatePolicyItemDTO>({
    categoryId: '',
    content: '',
    description: '',
  })
  const [isCreatingItem, setIsCreatingItem] = useState(false)
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemForm, setEditItemForm] = useState<UpdatePolicyItemDTO>({
    categoryId: '',
    content: '',
    description: '',
    isActive: true,
  })
  const [isUpdatingItem, setIsUpdatingItem] = useState(false)
  const [deleteItemTarget, setDeleteItemTarget] = useState<ApiPolicyItem | null>(null)
  const [isDeletingItem, setIsDeletingItem] = useState(false)

  const PAGE_SIZE = 10

  // Fetch categories
  const fetchCategories = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setIsLoadingCategories(true)
      try {
        const response = await policyApi.getCategories()
        if (response.isSuccess && response.data) {
          setCategories(response.data)
          if (!silent) {
            toast({
              title: TOAST_TITLES.SUCCESS,
              description: 'Lấy danh sách danh mục chính sách thành công',
            })
          }
        } else {
          toast({
            title: TOAST_TITLES.ERROR,
            description: response.message || 'Lỗi khi lấy danh sách danh mục',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: error instanceof Error ? error.message : 'Lỗi khi lấy danh sách danh mục',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingCategories(false)
      }
    },
    [toast]
  )

  // Fetch items
  const fetchItems = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!selectedCategoryId) {
        setItems([])
        return
      }
      setIsLoadingItems(true)
      try {
        const response = await policyApi.getCategoryItems(selectedCategoryId)
        if (response.isSuccess && response.data) {
          setItems(response.data)
          if (!silent) {
            toast({
              title: TOAST_TITLES.SUCCESS,
              description: 'Lấy danh sách chính sách thành công',
            })
          }
        } else {
          toast({
            title: TOAST_TITLES.ERROR,
            description: response.message || 'Lỗi khi lấy danh sách chính sách',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: error instanceof Error ? error.message : 'Lỗi khi lấy danh sách chính sách',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingItems(false)
      }
    },
    [selectedCategoryId, toast]
  )

  useEffect(() => {
    fetchCategories({ silent: true })
  }, [fetchCategories])

  useEffect(() => {
    if (activeTab === 'items' && selectedCategoryId) {
      fetchItems({ silent: true })
    }
  }, [activeTab, selectedCategoryId, fetchItems])

  // Filtered data
  const filteredCategories = useMemo(() => {
    const keyword = categorySearchTerm.trim().toLowerCase()
    if (!keyword) return categories
    return categories.filter(
      cat =>
        cat.name.toLowerCase().includes(keyword) ||
        cat.description.toLowerCase().includes(keyword)
    )
  }, [categories, categorySearchTerm])

  const filteredItems = useMemo(() => {
    const keyword = itemSearchTerm.trim().toLowerCase()
    if (!keyword) return items
    return items.filter(
      item =>
        item.description.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword) ||
        item.categoryName.toLowerCase().includes(keyword)
    )
  }, [items, itemSearchTerm])

  // Category handlers
  const resetCreateCategoryForm = () =>
    setCreateCategoryForm({ name: '', description: '' })
  const startCreateCategory = () => {
    resetCreateCategoryForm()
    setIsCategoryFormVisible(true)
  }
  const handleCreateCategoryInputChange = (
    field: keyof CreatePolicyCategoryDTO,
    value: string
  ) => {
    setCreateCategoryForm(prev => ({ ...prev, [field]: value }))
  }
  const handleCancelCreateCategory = () => {
    resetCreateCategoryForm()
    setIsCategoryFormVisible(false)
  }
  const handleCreateCategorySubmit = async () => {
    if (!createCategoryForm.name.trim() || isCreatingCategory) return
    setIsCreatingCategory(true)
    try {
      const response = await policyApi.createCategory({
        name: createCategoryForm.name.trim(),
        description: createCategoryForm.description.trim(),
      })
      if (response.isSuccess) {
        await fetchCategories()
        const totalPages = Math.max(1, Math.ceil((categories.length + 1) / PAGE_SIZE))
        setCategoryPage(totalPages)
        handleCancelCreateCategory()
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Tạo danh mục chính sách thành công',
        })
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: response.message || 'Lỗi khi tạo danh mục',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: error instanceof Error ? error.message : 'Lỗi khi tạo danh mục',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const openEditCategoryModal = (category: ApiPolicyCategory) => {
    setEditingCategoryId(category.id)
    setEditCategoryForm({
      name: category.name,
      description: category.description,
      isActive: category.isActive,
    })
    setIsEditCategoryModalOpen(true)
  }
  const closeEditCategoryModal = () => {
    setIsEditCategoryModalOpen(false)
    setEditingCategoryId(null)
    setEditCategoryForm({ name: '', description: '', isActive: true })
  }
  const handleEditCategoryInputChange = (
    field: keyof UpdatePolicyCategoryDTO,
    value: string | boolean
  ) => {
    setEditCategoryForm(prev => ({ ...prev, [field]: value }))
  }
  const handleEditCategorySubmit = async () => {
    if (!editingCategoryId || !editCategoryForm.name.trim() || isUpdatingCategory) return
    setIsUpdatingCategory(true)
    try {
      const response = await policyApi.updateCategory(editingCategoryId, {
        name: editCategoryForm.name.trim(),
        description: editCategoryForm.description.trim(),
        isActive: editCategoryForm.isActive,
      })
      if (response.isSuccess) {
        await fetchCategories()
        closeEditCategoryModal()
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Cập nhật danh mục chính sách thành công',
        })
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: response.message || 'Lỗi khi cập nhật danh mục',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: error instanceof Error ? error.message : 'Lỗi khi cập nhật danh mục',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingCategory(false)
    }
  }

  const handleRequestDeleteCategory = (category: ApiPolicyCategory) =>
    setDeleteCategoryTarget(category)
  const handleConfirmDeleteCategory = async () => {
    if (!deleteCategoryTarget || isDeletingCategory) return
    setIsDeletingCategory(true)
    try {
      const response = await policyApi.deleteCategory(deleteCategoryTarget.id)
      if (response.isSuccess) {
        await fetchCategories()
        const updatedLength = categories.length - 1
        const totalPages = Math.max(1, Math.ceil(updatedLength / PAGE_SIZE))
        if (categoryPage > totalPages) {
          setCategoryPage(Math.max(1, totalPages))
        }
        if (editingCategoryId === deleteCategoryTarget.id) closeEditCategoryModal()
        setDeleteCategoryTarget(null)
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Xóa danh mục chính sách thành công',
        })
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: response.message || 'Lỗi khi xóa danh mục',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: error instanceof Error ? error.message : 'Lỗi khi xóa danh mục',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingCategory(false)
    }
  }
  const handleCancelDeleteCategory = () => setDeleteCategoryTarget(null)

  // Item handlers
  const resetCreateItemForm = () =>
    setCreateItemForm({ categoryId: selectedCategoryId || '', content: '', description: '' })
  const startCreateItem = () => {
    if (!selectedCategoryId) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: 'Vui lòng chọn danh mục trước',
        variant: 'destructive',
      })
      return
    }
    resetCreateItemForm()
    setIsItemFormVisible(true)
  }
  const handleCreateItemInputChange = (field: keyof CreatePolicyItemDTO, value: string) => {
    setCreateItemForm(prev => ({ ...prev, [field]: value }))
  }
  const handleCancelCreateItem = () => {
    resetCreateItemForm()
    setIsItemFormVisible(false)
  }
  const handleCreateItemSubmit = async () => {
    if (!createItemForm.categoryId || !createItemForm.content.trim() || isCreatingItem) return
    setIsCreatingItem(true)
    try {
      const response = await policyApi.createItem({
        categoryId: createItemForm.categoryId,
        content: createItemForm.content.trim(),
        description: createItemForm.description.trim(),
      })
      if (response.isSuccess) {
        await fetchItems()
        const totalPages = Math.max(1, Math.ceil((items.length + 1) / PAGE_SIZE))
        setItemPage(totalPages)
        handleCancelCreateItem()
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Tạo chính sách thành công',
        })
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: response.message || 'Lỗi khi tạo chính sách',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: error instanceof Error ? error.message : 'Lỗi khi tạo chính sách',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingItem(false)
    }
  }

  const openEditItemModal = async (item: ApiPolicyItem) => {
    setEditingItemId(item.id)
    setEditItemForm({
      categoryId: item.categoryId,
      content: item.content,
      description: item.description,
      isActive: item.isActive,
    })
    setIsEditItemModalOpen(true)
  }
  const closeEditItemModal = () => {
    setIsEditItemModalOpen(false)
    setEditingItemId(null)
    setEditItemForm({ categoryId: '', content: '', description: '', isActive: true })
  }
  const handleEditItemInputChange = (field: keyof UpdatePolicyItemDTO, value: string | boolean) => {
    setEditItemForm(prev => ({ ...prev, [field]: value }))
  }
  const handleEditItemSubmit = async () => {
    if (!editingItemId || !editItemForm.content.trim() || isUpdatingItem) return
    setIsUpdatingItem(true)
    try {
      const response = await policyApi.updateItem(editingItemId, {
        categoryId: editItemForm.categoryId,
        content: editItemForm.content.trim(),
        description: editItemForm.description.trim(),
        isActive: editItemForm.isActive,
      })
      if (response.isSuccess) {
        await fetchItems()
        closeEditItemModal()
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Cập nhật chính sách thành công',
        })
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: response.message || 'Lỗi khi cập nhật chính sách',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: error instanceof Error ? error.message : 'Lỗi khi cập nhật chính sách',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingItem(false)
    }
  }

  const handleRequestDeleteItem = (item: ApiPolicyItem) => setDeleteItemTarget(item)
  const handleConfirmDeleteItem = async () => {
    if (!deleteItemTarget || isDeletingItem) return
    setIsDeletingItem(true)
    try {
      const response = await policyApi.deleteItem(deleteItemTarget.id)
      if (response.isSuccess) {
        await fetchItems()
        const updatedLength = items.length - 1
        const totalPages = Math.max(1, Math.ceil(updatedLength / PAGE_SIZE))
        if (itemPage > totalPages) {
          setItemPage(Math.max(1, totalPages))
        }
        if (editingItemId === deleteItemTarget.id) closeEditItemModal()
        setDeleteItemTarget(null)
        toast({
          title: TOAST_TITLES.SUCCESS,
          description: 'Xóa chính sách thành công',
        })
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: response.message || 'Lỗi khi xóa chính sách',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: TOAST_TITLES.ERROR,
        description: error instanceof Error ? error.message : 'Lỗi khi xóa chính sách',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingItem(false)
    }
  }
  const handleCancelDeleteItem = () => setDeleteItemTarget(null)

  // Pagination helpers
  const categoryTotalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE))
  const categorySafePage = Math.min(categoryPage, categoryTotalPages)
  const categoryStart = (categorySafePage - 1) * PAGE_SIZE
  const categoryPageItems = filteredCategories.slice(categoryStart, categoryStart + PAGE_SIZE)

  const itemTotalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const itemSafePage = Math.min(itemPage, itemTotalPages)
  const itemStart = (itemSafePage - 1) * PAGE_SIZE
  const itemPageItems = filteredItems.slice(itemStart, itemStart + PAGE_SIZE)

  return (
    <div className="mx-auto max-w-[1800px] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý chính sách</h1>
        <p className="text-responsive-base text-gray-600">
          Quản lý danh mục và nội dung chính sách của hệ thống
        </p>
      </div>

      <Card className="card-responsive">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'categories' | 'items')}>
          <TabsList className="mb-6">
            <TabsTrigger value="categories">Danh mục chính sách</TabsTrigger>
            <TabsTrigger value="items">Nội dung chính sách</TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Danh sách danh mục</h2>
                <p className="text-responsive-sm text-gray-600">
                  {isLoadingCategories
                    ? 'Đang tải...'
                    : `Có ${filteredCategories.length} danh mục`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={categorySearchTerm}
                    onChange={e => setCategorySearchTerm(e.target.value)}
                    placeholder="Tìm theo tên hoặc mô tả"
                    className="pl-9"
                  />
                </div>
                {!isCategoryFormVisible && (
                  <Button onClick={startCreateCategory}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm danh mục
                  </Button>
                )}
              </div>
            </div>

            {isCategoryFormVisible && (
              <div className="mt-4 space-y-4 border rounded-2xl p-4 bg-gray-50">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tên danh mục</label>
                    <Input
                      value={createCategoryForm.name}
                      onChange={e => handleCreateCategoryInputChange('name', e.target.value)}
                      placeholder="Ví dụ: Chính sách bảo mật"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Mô tả</label>
                    <Textarea
                      rows={2}
                      value={createCategoryForm.description}
                      onChange={e =>
                        handleCreateCategoryInputChange('description', e.target.value)
                      }
                      placeholder="Mô tả về danh mục chính sách"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelCreateCategory} disabled={isCreatingCategory}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreateCategorySubmit} disabled={isCreatingCategory}>
                    {isCreatingCategory ? 'Đang tạo...' : 'Thêm mới'}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6 overflow-x-auto">
              {isLoadingCategories ? (
                <SimpleTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Tên</TableHead>
                      <TableHead className="text-left">Mô tả</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-16 animate-pulse rounded bg-gray-200 mx-auto" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </SimpleTable>
              ) : filteredCategories.length > 0 ? (
                <>
                  <SimpleTable>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">Tên</TableHead>
                        <TableHead className="text-left">Mô tả</TableHead>
                        <TableHead className="text-center">Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryPageItems.map(category => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {category.description || '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={category.isActive ? 'default' : 'outline'}>
                              {category.isActive ? 'Hoạt động' : 'Tạm dừng'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-500 hover:text-gray-900"
                                onClick={() => openEditCategoryModal(category)}
                              >
                                <PenSquare className="h-4 w-4" />
                                <span className="sr-only">Sửa</span>
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-500 hover:text-rose-600"
                                onClick={() => handleRequestDeleteCategory(category)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Xóa</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </SimpleTable>
                  {filteredCategories.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-gray-600">
                        Trang {categoryPage}/{categoryTotalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCategoryPage(p => Math.max(1, p - 1))}
                          disabled={categoryPage <= 1}
                        >
                          Trước
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCategoryPage(p => Math.min(categoryTotalPages, p + 1))}
                          disabled={categoryPage >= categoryTotalPages}
                        >
                          Sau
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="rounded-full bg-emerald-50 p-4">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Chưa có danh mục nào</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Thêm danh mục mới để bắt đầu quản lý chính sách.
                  </p>
                  <Button onClick={startCreateCategory}>Thêm danh mục đầu tiên</Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Danh sách chính sách</h2>
                <p className="text-responsive-sm text-gray-600">
                  {isLoadingItems ? 'Đang tải...' : `Có ${filteredItems.length} chính sách`}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-full sm:w-48">
                  <select
                    value={selectedCategoryId || ''}
                    onChange={e => {
                      setSelectedCategoryId(e.target.value || null)
                      setItemPage(1)
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Tất cả danh mục</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={itemSearchTerm}
                    onChange={e => setItemSearchTerm(e.target.value)}
                    placeholder="Tìm theo nội dung"
                    className="pl-9"
                  />
                </div>
                {!isItemFormVisible && (
                  <Button onClick={startCreateItem} disabled={!selectedCategoryId}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm chính sách
                  </Button>
                )}
              </div>
            </div>

            {isItemFormVisible && (
              <div className="mt-4 space-y-4 border rounded-2xl p-4 bg-gray-50">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Danh mục</label>
                    <select
                      value={createItemForm.categoryId}
                      onChange={e => handleCreateItemInputChange('categoryId', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Nội dung</label>
                    <Textarea
                      rows={4}
                      value={createItemForm.content}
                      onChange={e => handleCreateItemInputChange('content', e.target.value)}
                      placeholder="Nội dung chính sách"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Mô tả</label>
                    <Textarea
                      rows={2}
                      value={createItemForm.description}
                      onChange={e => handleCreateItemInputChange('description', e.target.value)}
                      placeholder="Mô tả ngắn gọn về chính sách"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelCreateItem} disabled={isCreatingItem}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreateItemSubmit} disabled={isCreatingItem}>
                    {isCreatingItem ? 'Đang tạo...' : 'Thêm mới'}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6 overflow-x-auto">
              {!selectedCategoryId && activeTab === 'items' ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="rounded-full bg-gray-50 p-4">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Chọn danh mục</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Vui lòng chọn danh mục để xem danh sách chính sách.
                  </p>
                </div>
              ) : isLoadingItems ? (
                <SimpleTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Danh mục</TableHead>
                      <TableHead className="text-left">Mô tả</TableHead>
                      <TableHead className="text-left">Nội dung</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-16 animate-pulse rounded bg-gray-200 mx-auto" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </SimpleTable>
              ) : filteredItems.length > 0 ? (
                <>
                  <SimpleTable>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">Danh mục</TableHead>
                        <TableHead className="text-left">Mô tả</TableHead>
                        <TableHead className="text-left">Nội dung</TableHead>
                        <TableHead className="text-center">Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemPageItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.categoryName}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {item.description || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-md truncate">
                            {item.content || '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.isActive ? 'default' : 'outline'}>
                              {item.isActive ? 'Hoạt động' : 'Tạm dừng'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-500 hover:text-gray-900"
                                onClick={() => openEditItemModal(item)}
                              >
                                <PenSquare className="h-4 w-4" />
                                <span className="sr-only">Sửa</span>
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-500 hover:text-rose-600"
                                onClick={() => handleRequestDeleteItem(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Xóa</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </SimpleTable>
                  {filteredItems.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-gray-600">
                        Trang {itemPage}/{itemTotalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setItemPage(p => Math.max(1, p - 1))}
                          disabled={itemPage <= 1}
                        >
                          Trước
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setItemPage(p => Math.min(itemTotalPages, p + 1))}
                          disabled={itemPage >= itemTotalPages}
                        >
                          Sau
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="rounded-full bg-emerald-50 p-4">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Chưa có chính sách nào</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Thêm chính sách mới để bắt đầu quản lý nội dung.
                  </p>
                  <Button onClick={startCreateItem} disabled={!selectedCategoryId}>
                    Thêm chính sách đầu tiên
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Edit Category Modal */}
      <Dialog
        open={isEditCategoryModalOpen}
        onOpenChange={open => {
          if (!open) closeEditCategoryModal()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục chính sách</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Tên danh mục</label>
              <Input
                value={editCategoryForm.name}
                onChange={e => handleEditCategoryInputChange('name', e.target.value)}
                placeholder="Tên danh mục"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Mô tả</label>
              <Textarea
                rows={3}
                value={editCategoryForm.description}
                onChange={e => handleEditCategoryInputChange('description', e.target.value)}
                placeholder="Mô tả danh mục"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editCategoryForm.isActive}
                  onChange={e => handleEditCategoryInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Hoạt động</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeEditCategoryModal} disabled={isUpdatingCategory}>
              Hủy
            </Button>
            <Button onClick={handleEditCategorySubmit} disabled={isUpdatingCategory}>
              {isUpdatingCategory ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Modal */}
      <Dialog
        open={!!deleteCategoryTarget}
        onOpenChange={open => {
          if (!open) handleCancelDeleteCategory()
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa danh mục chính sách</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bạn có chắc muốn xóa danh mục{' '}
            <span className="font-semibold text-gray-900">{deleteCategoryTarget?.name}</span>? Thao
            tác này không thể hoàn tác.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelDeleteCategory} disabled={isDeletingCategory}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteCategory} disabled={isDeletingCategory}>
              {isDeletingCategory ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      <Dialog
        open={isEditItemModalOpen}
        onOpenChange={open => {
          if (!open) closeEditItemModal()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa chính sách</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Danh mục</label>
              <select
                value={editItemForm.categoryId}
                onChange={e => handleEditItemInputChange('categoryId', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Chọn danh mục</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nội dung</label>
              <Textarea
                rows={6}
                value={editItemForm.content}
                onChange={e => handleEditItemInputChange('content', e.target.value)}
                placeholder="Nội dung chính sách"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Mô tả</label>
              <Textarea
                rows={3}
                value={editItemForm.description}
                onChange={e => handleEditItemInputChange('description', e.target.value)}
                placeholder="Mô tả chính sách"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editItemForm.isActive}
                  onChange={e => handleEditItemInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Hoạt động</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeEditItemModal} disabled={isUpdatingItem}>
              Hủy
            </Button>
            <Button onClick={handleEditItemSubmit} disabled={isUpdatingItem}>
              {isUpdatingItem ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Item Modal */}
      <Dialog
        open={!!deleteItemTarget}
        onOpenChange={open => {
          if (!open) handleCancelDeleteItem()
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa chính sách</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bạn có chắc muốn xóa chính sách này? Thao tác này không thể hoàn tác.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelDeleteItem} disabled={isDeletingItem}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteItem} disabled={isDeletingItem}>
              {isDeletingItem ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

