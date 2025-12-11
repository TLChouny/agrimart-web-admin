import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { useAuth } from '../../contexts/AuthContext'
import type { User as ApiUser } from '../../types/api'

export default function AdminSettingsPage() {
  const { token } = useAuth()

  const getApiUser = (): ApiUser | null => {
    try {
      const userStr = localStorage.getItem('currentUser')
      if (userStr) {
        return JSON.parse(userStr) as ApiUser
      }
    } catch (error) {
      console.error('Lỗi khi đọc thông tin người dùng:', error)
    }
    return null
  }

  const apiUser = getApiUser()

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatBoolean = (value: boolean | undefined) => {
    return value ? (
      <Badge variant="outline" className="text-green-600 border-green-600">Có</Badge>
    ) : (
      <Badge variant="outline" className="text-gray-600 border-gray-600">Không</Badge>
    )
  }

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Cài đặt hệ thống</h1>
        <p className="text-responsive-base text-gray-600">Thông tin tài khoản của bạn</p>
      </div>

      <Card className="card-responsive">
        <div className="mb-4">
          <h2 className="text-responsive-xl font-semibold text-gray-900 mb-2">Thông tin cá nhân</h2>
        </div>

        {apiUser ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">ID</label>
                <p className="text-sm text-gray-900 mt-1 font-mono">{apiUser.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900 mt-1">{apiUser.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Họ</label>
                <p className="text-sm text-gray-900 mt-1">{apiUser.firstName || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tên</label>
                <p className="text-sm text-gray-900 mt-1">{apiUser.lastName || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Họ và tên</label>
                <p className="text-sm text-gray-900 mt-1">{`${apiUser.firstName} ${apiUser.lastName}`.trim() || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                <p className="text-sm text-gray-900 mt-1">{apiUser.phoneNumber || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Địa chỉ</label>
                <p className="text-sm text-gray-900 mt-1">{apiUser.address || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Xã/Phường</label>
                <p className="text-sm text-gray-900 mt-1">{apiUser.communes || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tỉnh/Thành phố</label>
                <p className="text-sm text-gray-900 mt-1">{apiUser.province || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Vai trò ID</label>
                <p className="text-sm text-gray-900 mt-1 font-mono">{apiUser.roleId || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Vai trò</label>
                <p className="text-sm text-gray-900 mt-1">
                  {typeof apiUser.role === 'string' 
                    ? apiUser.role 
                    : apiUser.roleObject?.name || apiUser.roleObject?.fullName || apiUser.roleId || '—'}
                </p>
              </div>
              {apiUser.roleObject && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Chi tiết vai trò</label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      {apiUser.roleObject?.name 
                        || apiUser.roleObject?.fullName 
                        || apiUser.roleId 
                        || (typeof apiUser.role === 'string' ? apiUser.role : '—')}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Trạng thái tài khoản</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email đã xác nhận</label>
                  <div className="mt-1">{formatBoolean(apiUser.emailConfirmed)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Số điện thoại đã xác nhận</label>
                  <div className="mt-1">{formatBoolean(apiUser.phoneNumberConfirmed)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Xác thực hai yếu tố</label>
                  <div className="mt-1">{formatBoolean(apiUser.twoFactorEnabled)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Khóa tài khoản</label>
                  <div className="mt-1">{formatBoolean(apiUser.lockoutEnabled)}</div>
                </div>
                {apiUser.lockoutEnd && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ngày hết hạn khóa</label>
                    <p className="text-sm text-gray-900 mt-1">{formatDate(apiUser.lockoutEnd)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Số lần đăng nhập sai</label>
                  <p className="text-sm text-gray-900 mt-1">{apiUser.accessFailedCount || 0}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Thông tin hệ thống</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày tạo</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(apiUser.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày cập nhật</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(apiUser.updatedAt)}</p>
                </div>
                {token && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Token (ẩn một phần)</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono break-all">
                      {token.substring(0, 20)}...{token.substring(token.length - 20)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Không thể tải thông tin người dùng.</p>
        )}
      </Card>
    </div>
  )
}

