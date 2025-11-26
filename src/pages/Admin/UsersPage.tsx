import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { userApi } from '../../services/api/userApi'
import type { User as ApiUser, UserListItem } from '../../types/api'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES, USER_MESSAGES } from '../../services/constants/messages'
import { Search, Users as UsersIcon } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  const [blockedMap, setBlockedMap] = useState<Record<string, boolean>>({})
  const { toast } = useToastContext()
  const [searchTerm, setSearchTerm] = useState('')

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
            if (r === 'admin' || r === 'farmer' || r === 'wholesaler') return r
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
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return users
    return users.filter(user =>
      user.fullName.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      user.id.toLowerCase().includes(keyword)
    )
  }, [users, searchTerm])

  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge variant="outline" className="text-red-600 border-red-600">Admin</Badge>
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
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
            <Button variant="outline" size="sm" onClick={() => fetchUsers()} disabled={isLoading}>
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <SimpleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Họ và tên</TableHead>
                  <TableHead className="w-[25%]">Email</TableHead>
                  <TableHead className="w-[15%]">Vai trò</TableHead>
                  <TableHead className="w-[15%]">Trạng thái</TableHead>
                  <TableHead className="w-[10%] text-right">Khóa</TableHead>
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
                      <TableHead className="w-[35%] text-left">Họ và tên</TableHead>
                      <TableHead className="w-[25%] text-left">Email</TableHead>
                      <TableHead className="w-[15%] text-left">Vai trò</TableHead>
                      <TableHead className="w-[15%] text-left">Trạng thái</TableHead>
                      <TableHead className="w-[10%] text-right">Khóa</TableHead>
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
                        <TableCell className="text-right">
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
                    <label className="mt-3 inline-flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" className="peer sr-only" checked={!!blockedMap[user.id]} onChange={(e) => toggleBlocked(user.id, e.target.checked)} />
                      <span className={`w-9 h-5 rounded-full ${blockedMap[user.id] ? 'bg-rose-500' : 'bg-gray-300'} relative transition-colors`} aria-hidden="true">
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${blockedMap[user.id] ? 'translate-x-4' : ''}`} />
                      </span>
                      <span className="text-xs text-gray-600">{blockedMap[user.id] ? 'Đã khóa' : 'Đang hoạt động'}</span>
                    </label>
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
              <p className="text-sm text-gray-500 max-w-md">Thử thay đổi từ khóa tìm kiếm hoặc tải lại danh sách người dùng.</p>
              <Button onClick={() => { setSearchTerm(''); fetchUsers(); }}>Tải lại danh sách</Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

