import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { userApi } from '../../services/api/userApi'
import { certificationApi } from '../../services/api/certificationApi'
import type { User as ApiUser, UserListItem, ApiCertification } from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES, USER_MESSAGES } from '../../services/constants/messages'
import { Search, Users as UsersIcon, Filter, ChevronDown, Eye, Award } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, ApiUser>>({}) // Lưu toàn bộ user data
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  const [blockedMap, setBlockedMap] = useState<Record<string, boolean>>({})
  const { toast } = useToastContext()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [userCertifications, setUserCertifications] = useState<ApiCertification[]>([])
  const [isLoadingCertifications, setIsLoadingCertifications] = useState(false)

  // API functions
  const fetchUsers = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await userApi.list()
      if (res.isSuccess) {
        const payload = res.data as ApiUser[] | { items: ApiUser[] }
        const apiUsers: ApiUser[] = Array.isArray(payload) ? payload : (payload?.items ?? [])
        const mapRole = (u: ApiUser): UserListItem['role'] => {
          const r = (u as unknown as { role?: unknown }).role
          if (typeof r === 'string') {
            if (r === 'farmer' || r === 'wholesaler') return r
          }
          if (r && typeof r === 'object' && 'name' in (r as Record<string, unknown>)) {
            const name = String((r as { name?: unknown }).name || '').toLowerCase()
            if (name === 'admin' || name === 'farmer' || name === 'wholesaler') return name as UserListItem['role']
          }
          return 'wholesaler'
        }
        const mapped: UserListItem[] = apiUsers.map(u => ({
          id: u.id,
          fullName: `${u.firstName} ${u.lastName}`.trim(),
          email: u.email,
          role: mapRole(u),
          status: 'active',
          createdAt: u.createdAt,
        }))
        setUsers(mapped)
        // Lưu toàn bộ user data để hiển thị chi tiết
        setUsersMap(Object.fromEntries(apiUsers.map(u => [u.id, u])))
        setBlockedMap(Object.fromEntries(mapped.map(u => [u.id, false])))
        setPage(1)
        if (!silent) {
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: USER_MESSAGES.FETCH_SUCCESS,
          })
        }
      } else {
        const message = res.message || USER_MESSAGES.FETCH_ERROR
        setError(message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : USER_MESSAGES.FETCH_ERROR
      setError(message)
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchUsers({ silent: true })
  }, [fetchUsers])

  // Helper functions
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })

  const filteredUsers = useMemo(() => {
    let filtered = users

    // Filter by search term
    const keyword = searchTerm.trim().toLowerCase()
    if (keyword) {
      filtered = filtered.filter(user =>
      user.fullName.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      user.id.toLowerCase().includes(keyword)
    )
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (statusFilter === 'active') {
          return user.status === 'active' && !blockedMap[user.id]
        } else if (statusFilter === 'inactive') {
          return user.status === 'inactive' || blockedMap[user.id]
        }
        return true
      })
    }

    // Sắp xếp theo ngày tạo mới nhất
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA // Mới nhất trước
    })
  }, [users, searchTerm, roleFilter, statusFilter, blockedMap])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, roleFilter, statusFilter])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'farmer': return <Badge variant="outline" className="text-green-600 border-green-600">Farmer</Badge>
      case 'wholesaler': return <Badge variant="outline" className="text-blue-600 border-blue-600">Wholesaler</Badge>
      default: return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="outline" className="text-green-600 border-green-600">Hoạt động</Badge>
      case 'inactive': return <Badge variant="outline" className="text-gray-600 border-gray-600">Không hoạt động</Badge>
      default: return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Event handlers
  const toggleBlocked = (userId: string, value: boolean) => {
    setBlockedMap(prev => ({ ...prev, [userId]: value }))
    toast({
      title: TOAST_TITLES.INFO,
      description: USER_MESSAGES.BLOCK_PLACEHOLDER,
    })
  }

  const handleViewDetail = (userId: string) => {
    const user = usersMap[userId]
    if (user) {
      setSelectedUser(user)
      setIsDetailModalOpen(true)
      // Load certifications for this user
      setIsLoadingCertifications(true)
      certificationApi.getByUserId(userId)
        .then(res => {
          if (res.isSuccess && res.data) {
            setUserCertifications(Array.isArray(res.data) ? res.data : [])
          } else {
            setUserCertifications([])
          }
        })
        .catch(() => setUserCertifications([]))
        .finally(() => setIsLoadingCertifications(false))
    } else {
      toast({
        title: TOAST_TITLES.ERROR,
        description: 'Không tìm thấy thông tin chi tiết người dùng',
        variant: 'destructive',
      })
    }
  }

  const getCertificationStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Chờ duyệt</Badge>
      case 1:
        return <Badge variant="outline" className="text-green-600 border-green-600">Đã duyệt</Badge>
      case 2:
        return <Badge variant="outline" className="text-red-600 border-red-600">Đã từ chối</Badge>
      case 3:
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Hết hạn</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pagedUsers = filteredUsers.slice(start, start + PAGE_SIZE)
  const canPrev = safePage > 1
  const canNext = safePage < totalPages

  return (
    <div className="mx-auto max-w-[1800px] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý người dùng</h1>
        <p className="text-base text-gray-600">Theo dõi trạng thái tài khoản và phân quyền.</p>
      </div>

      <Card className="p-6">
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Danh sách người dùng</h2>
            <p className="text-sm text-gray-600">
              {isLoading ? 'Đang tải...' : `Hiển thị ${filteredUsers.length} / ${users.length} người dùng`}
              {error && <span className="text-red-600"> · {error}</span>}
            </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, email hoặc ID"
              className="pl-9"
            />
          </div>
            <Button variant="secondary" size="sm" onClick={() => fetchUsers()} disabled={isLoading}>
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          </div>
        </div>

        {/* Bộ lọc theo style AuctionsPage */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter tabs cho vai trò */}
          <button
            type="button"
            onClick={() => { setRoleFilter('all'); setPage(1) }}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              roleFilter === 'all'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:text-emerald-700'
            }`}
          >
            Tất cả vai trò
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs">
              {users.length}
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => { setRoleFilter('farmer'); setPage(1) }}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              roleFilter === 'farmer'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:text-emerald-700'
            }`}
          >
            Farmer
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs">
              {users.filter(u => u.role === 'farmer').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setRoleFilter('wholesaler'); setPage(1) }}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              roleFilter === 'wholesaler'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:text-emerald-700'
            }`}
          >
            Wholesaler
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs">
              {users.filter(u => u.role === 'wholesaler').length}
            </span>
          </button>

          {/* Dropdown cho trạng thái */}
          <div className="relative">
            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${
              statusFilter !== 'all' ? 'text-emerald-600' : 'text-gray-400'
            }`} />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className={`appearance-none rounded-2xl border px-10 py-2 pr-8 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                statusFilter !== 'all'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:text-emerald-700'
              }`}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
            </select>
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${
              statusFilter !== 'all' ? 'text-emerald-600' : 'text-gray-400'
            }`} />
          </div>
        </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <SimpleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Họ và tên</TableHead>
                  <TableHead className="w-[20%]">Email</TableHead>
                  <TableHead className="w-[12%]">Vai trò</TableHead>
                  <TableHead className="w-[12%]">Trạng thái</TableHead>
                  {/* <TableHead className="w-[10%] text-right">Khóa</TableHead> */}
                  <TableHead className="w-[16%] text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {[35, 25, 15, 15, 10].map((width, idx) => (
                      <TableCell key={idx} style={{ width: `${width}%` }}>
                        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </SimpleTable>
          ) : pagedUsers.length > 0 ? (
            <>
              <div className="hidden md:block">
                <SimpleTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%] text-left">Họ và tên</TableHead>
                      <TableHead className="w-[20%] text-left">Email</TableHead>
                      <TableHead className="w-[12%] text-left">Vai trò</TableHead>
                      <TableHead className="w-[12%] text-left">Trạng thái</TableHead>
                      {/* <TableHead className="w-[10%] text-right">Khóa</TableHead> */}
                      <TableHead className="w-[16%] text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedUsers.map((user) => (
                      <TableRow key={user.id} className="min-h-[56px]">
                        <TableCell className="font-medium text-gray-900">
                          <div className="truncate" title={user.fullName}>{user.fullName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="truncate text-gray-700" title={user.email}>{user.email}</div>
                          <p className="text-xs text-gray-500">Tạo: {formatDate(user.createdAt)}</p>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        {/* <TableCell className="text-right">
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none justify-end">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={!!blockedMap[user.id]}
                              onChange={(e) => toggleBlocked(user.id, e.target.checked)}
                            />
                            <span className={`w-10 h-6 rounded-full ${blockedMap[user.id] ? 'bg-rose-500' : 'bg-gray-300'} relative transition-colors`} aria-hidden="true">
                              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${blockedMap[user.id] ? 'translate-x-4' : ''}`} />
                            </span>
                            <span className="text-xs text-gray-600">{blockedMap[user.id] ? 'Blocked' : 'Active'}</span>
                          </label>
                        </TableCell> */}
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetail(user.id)}
                            className="text-xs"
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            Chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </SimpleTable>
              </div>

              <div className="md:hidden space-y-3">
                {pagedUsers.map((user) => (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-500 uppercase tracking-[0.3em]">Người dùng</p>
                        <h3 className="font-semibold text-gray-900 truncate" title={user.fullName}>{user.fullName}</h3>
                        <p className="text-sm text-gray-500 truncate" title={user.email}>{user.email}</p>
                      </div>
                      <UsersIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.status)}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-gray-500">ID: {user.id}</p>
                      <p className="text-xs text-gray-500">Ngày tạo: {formatDate(user.createdAt)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" className="peer sr-only" checked={!!blockedMap[user.id]} onChange={(e) => toggleBlocked(user.id, e.target.checked)} />
                      <span className={`w-9 h-5 rounded-full ${blockedMap[user.id] ? 'bg-rose-500' : 'bg-gray-300'} relative transition-colors`} aria-hidden="true">
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${blockedMap[user.id] ? 'translate-x-4' : ''}`} />
                      </span>
                      <span className="text-xs text-gray-600">{blockedMap[user.id] ? 'Đã khóa' : 'Đang hoạt động'}</span>
                    </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(user.id)}
                        className="text-xs"
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        Chi tiết
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-end mt-4 text-sm">
                  <span className="text-gray-600 mr-4">Trang {safePage}/{totalPages}</span>
                  <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!canPrev}>
                  Trước
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={!canNext}>
                  Sau
                </Button>
              </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full bg-emerald-50 p-4">
                <UsersIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Chưa có người dùng nào phù hợp</h3>
              <p className="text-sm text-gray-500 max-w-md">Thử thay đổi từ khóa tìm kiếm, bộ lọc hoặc tải lại danh sách người dùng.</p>
              <Button onClick={() => { 
                setSearchTerm('')
                setRoleFilter('all')
                setStatusFilter('all')
                fetchUsers()
              }}>Xóa bộ lọc và tải lại</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Dialog hiển thị chi tiết user */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-gray-900">
              Chi tiết người dùng
            </DialogTitle>
          </DialogHeader>

          {selectedUser ? (
            <div className="space-y-6 mt-4">
              {/* Thông tin cơ bản */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Thông tin cơ bản</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">ID</p>
                    <p className="text-sm font-semibold text-slate-900 font-mono break-all">{selectedUser.id}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Email</p>
                    <p className="text-sm font-semibold text-slate-900 break-all">{selectedUser.email}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Họ</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedUser.firstName || '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Tên</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedUser.lastName || '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Số điện thoại</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedUser.phoneNumber || '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Vai trò</p>
                    <div className="mt-1">{getRoleBadge(users.find(u => u.id === selectedUser.id)?.role || 'wholesaler')}</div>
                  </div>
                </div>
              </div>

              {/* Địa chỉ */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Địa chỉ</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Địa chỉ</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedUser.address || '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Xã/Phường</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedUser.communes || '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Tỉnh/Thành phố</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedUser.province || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Trạng thái và Reputation */}
              {(selectedUser.status !== undefined || selectedUser.reputationScore !== undefined) && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Trạng thái & Uy tín</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedUser.status !== undefined && (
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Trạng thái</p>
                        <div className="mt-1">
                          {selectedUser.status === 0 && <Badge variant="outline" className="text-yellow-600 border-yellow-600">Chờ duyệt</Badge>}
                          {selectedUser.status === 1 && <Badge variant="outline" className="text-green-600 border-green-600">Hoạt động</Badge>}
                          {selectedUser.status === 2 && <Badge variant="outline" className="text-red-600 border-red-600">Bị cấm</Badge>}
                        </div>
                      </div>
                    )}
                    {selectedUser.reputationScore !== undefined && (
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Điểm uy tín</p>
                        <p className="text-sm font-semibold text-slate-900">{selectedUser.reputationScore}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chứng chỉ */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Chứng chỉ đã duyệt
                </h3>
                {isLoadingCertifications ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    <p className="mt-2 text-xs text-slate-500">Đang tải chứng chỉ...</p>
                  </div>
                ) : userCertifications.length > 0 ? (
                  <div className="space-y-3">
                    {userCertifications.map((cert) => (
                      <div key={cert.id} className="rounded-2xl bg-white p-4 border border-slate-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 mb-1">{cert.certificationName}</p>
                            <p className="text-xs text-slate-600">{cert.issuingOrganization}</p>
                          </div>
                          {getCertificationStatusBadge(cert.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                          <div>
                            <p className="text-slate-500 mb-0.5">Ngày cấp</p>
                            <p className="text-slate-900 font-medium">{formatDate(cert.issueDate)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-0.5">Ngày hết hạn</p>
                            <p className="text-slate-900 font-medium">{formatDate(cert.expiryDate)}</p>
                          </div>
                        </div>
                        {cert.certificateUrl && (
                          <div className="mt-3">
                            <img
                              src={cert.certificateUrl}
                              alt={cert.certificationName}
                              className="w-full max-w-xs rounded-lg border border-slate-200 shadow-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Chưa có chứng chỉ nào được duyệt</p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">Không có thông tin để hiển thị</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

