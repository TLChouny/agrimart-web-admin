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

