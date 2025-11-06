import { httpClient } from './api/httpClient'
import { ENDPOINTS } from './constants/apiConstants'
import type { User } from '../types'
import type { User as ApiUser } from '../types/api'
import { ERROR_MESSAGES } from './constants/messages'

export interface AdminLoginRequest { email: string; password: string }
export interface AdminLoginResponse { user: User; token: string }
export interface AdminAuthData { user: ApiUser; token: { accessToken: string; refreshToken: string } }

export class AdminAuthService {
  async login(credentials: AdminLoginRequest): Promise<AdminLoginResponse> {
    try {
      const response = await httpClient.post<AdminAuthData>(ENDPOINTS.auth.login, {
        email: credentials.email,
        password: credentials.password,
      })
      if (response.isSuccess && response.data) {
        localStorage.setItem('authToken', response.data.token.accessToken)
        localStorage.setItem('refreshToken', response.data.token.refreshToken)
        localStorage.setItem('currentUser', JSON.stringify(response.data.user))
        const user = this.transformApiUserToAppUser(response.data.user)
        try {
          const base64Payload = response.data.token.accessToken.split('.')[1]
          const payload = JSON.parse(atob(base64Payload))
          if (payload.role !== 'admin') {
            this.clearLocalStorage()
            throw new Error(ERROR_MESSAGES.NOT_ADMIN_DETAIL)
          }
        } catch {
          this.clearLocalStorage()
          throw new Error(ERROR_MESSAGES.CANNOT_VALIDATE_ADMIN)
        }
        return { user, token: response.data.token.accessToken }
      }
      throw new Error(response.message || 'Đăng nhập thất bại')
    } catch (error) {
      if (error instanceof Error) throw error
      throw new Error('Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.')
    }
  }

  isAdmin(user: User | null): boolean { return user?.role === 'admin' }
  isCurrentUserAdmin(): boolean { return this.isAdmin(this.getStoredUser()) }
  async logout(): Promise<void> { this.clearLocalStorage() }
  getCurrentAdmin(): User | null { const u = this.getStoredUser(); return this.isAdmin(u) ? u : null }
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('currentUser')
    if (userStr) {
      try { const apiUser = JSON.parse(userStr) as ApiUser; return this.transformApiUserToAppUser(apiUser) } 
      catch { this.clearLocalStorage() }
    }
    return null
  }
  private transformApiUserToAppUser(apiUser: ApiUser): User {
    return {
      id: apiUser.id,
      name: `${apiUser.firstName} ${apiUser.lastName}`.trim(),
      email: apiUser.email,
      phone: apiUser.phoneNumber,
      role: 'admin',
      address: { provinceId: '', provinceName: apiUser.province, districtId: '', districtName: apiUser.communes, detailAddress: apiUser.address },
      createdAt: new Date(apiUser.createdAt)
    }
  }
  private clearLocalStorage(): void {
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('currentUser')
  }
}

export const adminAuthService = new AdminAuthService()

