import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { userApi } from '../../services/api/userApi'
import type { User as ApiUser, UserListItem } from '../../types/api'

export default function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  const [blockedMap, setBlockedMap] = useState<Record<string, boolean>>({})

  // API functions
  const fetchUsers = async () => {
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
          // Try role object with name property
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
      } else {
        setError(res.message || 'Không thể tải danh sách người dùng')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải người dùng')
      console.error('Lỗi khi tải danh sách người dùng:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Helper functions
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })

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
    // TODO: call API to block/unblock when BE available
  }

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Quản lý người dùng</h1>
        <p className="text-responsive-base text-gray-600">Danh sách người dùng trong hệ thống</p>
      </div>

      <Card className="card-responsive">
        <div className="mb-4">
          <h2 className="text-responsive-xl font-semibold text-gray-900 mb-2">Danh sách người dùng</h2>
          <p className="text-responsive-sm text-gray-600">{isLoading ? 'Đang tải...' : `Có ${users.length} người dùng trong hệ thống`}{error ? ` · Lỗi: ${error}` : ''}</p>
        </div>

        <div className="overflow-x-auto">
          {(() => {
            const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
            const safePage = Math.min(page, totalPages)
            const start = (safePage - 1) * PAGE_SIZE
            const pagedUsers = users.slice(start, start + PAGE_SIZE)
            const canPrev = safePage > 1
            const canNext = safePage < totalPages
            return (
              <>
          <div className="hidden md:block">
            <SimpleTable>
              <TableHeader>
                <TableRow>
                  <TableHead style={{width:'35%'}}>Họ và tên</TableHead>
                  <TableHead style={{width:'25%'}}>Email</TableHead>
                  <TableHead style={{width:'15%'}}>Vai trò</TableHead>
                  <TableHead style={{width:'15%'}}>Trạng thái</TableHead>
                  <TableHead style={{width:'10%'}}>Khóa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell style={{width:'35%'}} className="font-medium">
                      <div className="truncate" title={user.fullName}>{user.fullName}</div>
                    </TableCell>
                    <TableCell style={{width:'25%'}}>
                      <div className="truncate" title={user.email}>{user.email}</div>
                    </TableCell>
                    <TableCell style={{width:'15%'}}>{getRoleBadge(user.role)}</TableCell>
                    <TableCell style={{width:'15%'}}>{getStatusBadge(user.status)}</TableCell>
                    <TableCell style={{width:'10%'}}>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={!!blockedMap[user.id]}
                          onChange={(e) => toggleBlocked(user.id, e.target.checked)}
                        />
                        <span className={`w-10 h-6 rounded-full ${blockedMap[user.id] ? 'bg-rose-500' : 'bg-gray-300'} relative transition-colors`} aria-hidden="true">
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${blockedMap[user.id] ? 'translate-x-4' : ''}`} />
                        </span>
                        <span className="text-xs text-gray-700">{blockedMap[user.id] ? 'Blocked' : 'Active'}</span>
                      </label>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SimpleTable>
          </div>
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-gray-600">Trang {safePage}/{totalPages}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!canPrev} className={`px-3 py-1 rounded border text-sm ${canPrev ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}>Trước</button>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={!canNext} className={`px-3 py-1 rounded border text-sm ${canNext ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}>Sau</button>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {pagedUsers.map((user) => (
              <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate" title={user.fullName}>{user.fullName}</h3>
                      <p className="text-sm text-gray-500 truncate" title={user.email}>{user.email}</p>
                    </div>
                    <div className="ml-2 flex flex-col gap-1 items-end">
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.status)}
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none mt-1">
                        <input type="checkbox" className="peer sr-only" checked={!!blockedMap[user.id]} onChange={(e) => toggleBlocked(user.id, e.target.checked)} />
                        <span className={`w-9 h-5 rounded-full ${blockedMap[user.id] ? 'bg-rose-500' : 'bg-gray-300'} relative transition-colors`} aria-hidden="true">
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${blockedMap[user.id] ? 'translate-x-4' : ''}`} />
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="text-xs text-gray-500"><span className="font-medium">ID:</span> {user.id}</p>
                    <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Ngày tạo:</span> {formatDate(user.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-sm md:hidden">
            <span className="text-gray-600">Trang {safePage}/{totalPages}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!canPrev} className={`px-3 py-1 rounded border text-sm ${canPrev ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}>Trước</button>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={!canNext} className={`px-3 py-1 rounded border text-sm ${canNext ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}>Sau</button>
            </div>
          </div>
          </>
            )
          })()}
        </div>
      </Card>
    </div>
  )
}

