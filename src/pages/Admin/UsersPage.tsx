import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'

interface User {
  id: string
  fullName: string
  email: string
  role: 'admin' | 'farmer' | 'wholesaler'
  status: 'active' | 'inactive'
  createdAt: string
}

const mockUsers: User[] = [
  { id: '1', fullName: 'Nguyễn Văn A', email: 'user1@example.com', role: 'farmer', status: 'active', createdAt: '2024-01-15T10:30:00Z' },
  { id: '2', fullName: 'Trần Thị B', email: 'user2@example.com', role: 'wholesaler', status: 'active', createdAt: '2024-01-14T14:20:00Z' },
  { id: '3', fullName: 'Lê Văn C', email: 'user3@example.com', role: 'farmer', status: 'inactive', createdAt: '2024-01-13T09:15:00Z' },
]

export default function UsersPage() {
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

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Quản lý người dùng</h1>
        <p className="text-responsive-base text-gray-600">Danh sách người dùng trong hệ thống</p>
      </div>

      <Card className="card-responsive">
        <div className="mb-4">
          <h2 className="text-responsive-xl font-semibold text-gray-900 mb-2">Danh sách người dùng</h2>
          <p className="text-responsive-sm text-gray-600">Có {mockUsers.length} người dùng trong hệ thống</p>
        </div>

        <div className="overflow-x-auto">
          <div className="hidden md:block">
            <SimpleTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[60px]">ID</TableHead>
                  <TableHead className="min-w-[100px]">Họ và tên</TableHead>
                  <TableHead className="min-w-[120px]">Email</TableHead>
                  <TableHead className="min-w-[80px]">Vai trò</TableHead>
                  <TableHead className="min-w-[80px]">Trạng thái</TableHead>
                  <TableHead className="min-w-[80px]">Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="min-w-[60px] font-mono text-xs">{user.id}</TableCell>
                    <TableCell className="min-w-[100px] font-medium">
                      <div className="truncate max-w-[100px]" title={user.fullName}>{user.fullName}</div>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="truncate max-w-[120px]" title={user.email}>{user.email}</div>
                    </TableCell>
                    <TableCell className="min-w-[80px]">{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="min-w-[80px]">{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="min-w-[80px] text-xs">{formatDate(user.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SimpleTable>
          </div>

          <div className="md:hidden space-y-3">
            {mockUsers.map((user) => (
              <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate" title={user.fullName}>{user.fullName}</h3>
                      <p className="text-sm text-gray-500 truncate" title={user.email}>{user.email}</p>
                    </div>
                    <div className="ml-2 flex flex-col gap-1">
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.status)}
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
        </div>
      </Card>
    </div>
  )
}

