export * from './api'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: "admin" | "farmer" | "wholesaler"
  address?: UserAddress
  createdAt: Date
}

// Admin Notification Types
export type AdminNotificationType = 
  | 'account_pending'      // Tài khoản cần duyệt
  | 'certification_pending' // Chứng chỉ cần duyệt
  | 'auction_pending'      // Phiên đấu giá cần duyệt
  | 'withdraw_pending'     // Yêu cầu rút tiền cần xử lý
  | 'dispute_pending'      // Khiếu nại cần xử lý
  | 'wallet_transfer'      // Có tiền chuyển đến ví hệ thống
  | 'system'               // Thông báo hệ thống chung

export type AdminNotificationSeverity = 'info' | 'warning' | 'success' | 'error'

export interface AdminNotification {
  id: string
  type: AdminNotificationType
  title: string
  message: string
  severity: AdminNotificationSeverity
  isRead: boolean
  relatedEntityId?: string
  relatedEntityType?: string
  data?: Record<string, unknown>
  createdAt: string
  readAt?: string | null
}

export interface UserAddress {
  provinceId: string
  provinceName: string
  districtId: string
  districtName: string
  detailAddress?: string
}

export interface IdentityVerificationInfo { frontImage: File | null; backImage: File | null }
export interface CCCDInfo { frontImage: File | null; backImage: File | null }
export interface LoginCredentials { email: string; password: string }
export interface RegisterData { name: string; email: string; phone?: string; role: User["role"]; password?: string; address?: UserAddress }

export interface Product { id: string; name: string; description: string; price: number; farmerId: string; category: string; imageUrl?: string; inStock: boolean; createdAt: Date }
export interface Order { id: string; userId: string; products: OrderItem[]; total: number; status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"; createdAt: Date }
export interface OrderItem { productId: string; quantity: number; price: number }

