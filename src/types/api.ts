export interface APIResponse<T = unknown> { isSuccess: boolean; statusCode: number; message?: string; errors?: string[]; data?: T }
export interface PaginationParams { searchValue?: string; index?: number; pageSize?: number }
export interface LoginRequestDTO { email: string; password: string }
export interface RegisterRequestDTO { Email: string; Password: string; FirstName: string; LastName: string; Address: string; Communes: string; Province: string; PhoneNumber: string; RoleId: string; UserVerifications?: CreateUserVerificationDTO[] }
export interface CreateUserVerificationDTO { document?: File | null; documentType: DocumentType }
export const DocumentType = { IdentityCard: 0, DrivingLicense: 1 } as const
export type DocumentType = typeof DocumentType[keyof typeof DocumentType]
export interface User { id: string; email: string; firstName: string; lastName: string; address: string; communes: string; province: string; phoneNumber: string; roleId: string; role?: Role; emailConfirmed: boolean; phoneNumberConfirmed: boolean; twoFactorEnabled: boolean; lockoutEnabled: boolean; lockoutEnd?: string; accessFailedCount: number; createdAt: string; updatedAt: string }
export interface AuthUser { token: string; user: User; expiresAt: string }
export interface Role { id: string; name: string; fullName: string; normalizedName: string; concurrencyStamp: string; createdAt: string; updatedAt: string }
export interface CreateRoleDTO { name?: string; fullName?: string }
export interface UpdateRoleDTO { id?: string; name?: string; fullName?: string }
export interface RoleClaim { id: string; roleId: string; claimType: string; claimValue: string; role?: Role }
export interface CreateRoleClaimDTO { roleId?: string; claimType?: string; claimValue?: string }
export interface UpdateRoleClaimDTO { roleClaimId?: string; roleId?: string; claimType?: string; claimValue?: string }
export interface ListResponse<T> { items: T[]; totalCount: number; currentPage: number; pageSize: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean }
export interface ApiError { message: string; status: number; errors?: string[] }
export interface CustardAppleType { id: string; name: string; description?: string; createdAt?: string; updatedAt?: string | null }
export interface CreateCustardAppleTypeDTO { name: string; description?: string }
export interface UpdateCustardAppleTypeDTO { name?: string; description?: string }
export interface ApiFarm { id: string; name: string; farmImage?: string; isActive: boolean; userId: string; createdAt: string; updatedAt: string }

export interface ApiCrop {
  id: string
  farmID: string
  area: number
  custardAppleType: string
  farmingDuration: number
  startPlantingDate: string
  nearestHarvestDate: string
  note?: string | null
  treeCount: number
}

// Harvest related types
export interface ApiHarvestGradeDetail {
  id: string
  grade: number
  quantity: number
  unit: string
  harvestID: string
  createdAt: string
  updatedAt: string | null
}

export interface HarvestGradeDetailDTO {
  id?: string
  grade?: string
  quantity?: number
  unit?: string
}

export interface ApiHarvest {
  id: string
  harvestDate: string | null
  startDate: string
  totalQuantity: number
  unit: string
  note: string
  salePrice: number
  cropID: string
  createdAt: string
  updatedAt: string | null
  harvestGradeDetailDTOs: HarvestGradeDetailDTO[]
}

// Order related types
export type OrderParty = 'farmer' | 'buyer'
export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled'
export interface OrderPaymentInfo {
  depositPaid: boolean
  depositAmount: number
  remainingPaid: boolean
  remainingAmount: number
}
export interface OrderBankInfo {
  bankName: string
  accountName: string
  accountNumber: string
}
export interface OrderConversationMessage {
  from: OrderParty
  content: string
  time: string
}
export interface OrderComplaint {
  by: OrderParty
  content: string
  time: string
}
export interface Order {
  id: string
  farm: string
  customer: string
  total: number
  status: OrderStatus
  createdAt: string
  auctionId?: string
  auctionTitle?: string
  winnerName?: string
  payment: OrderPaymentInfo
  farmerBank?: OrderBankInfo
  buyerBank?: OrderBankInfo
  messages?: OrderConversationMessage[]
  complaint?: OrderComplaint
}

// Auction related types
export type AuctionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'
export interface AuctionLot {
  id: string
  cropName: string
  quantity: string
  unit: string
  minPrice: string
}
export interface AuctionBidRecord {
  id: string
  amount: string
  time: string
}
export interface AuctionParticipant {
  id: string
  name: string
  phone?: string
  organization?: string
  bids: AuctionBidRecord[]
}
export interface AuctionWinner {
  participantName: string
  amount: string
  time: string
}
export interface Auction {
  id: string
  title: string
  farmName: string
  startTime: string
  endTime: string
  status: AuctionStatus
  lots: AuctionLot[]
  winner?: AuctionWinner
  participants?: AuctionParticipant[]
  verified?: boolean
}

// UI layer types (for display purposes)
export interface Farm {
  id: string
  name: string
  owner: string
  location: string
  size: string
  type: string
  status: 'active' | 'inactive'
  createdAt: string
  imageUrl?: string
}

export interface Crop {
  id: string
  name: string
  type: string
  area: string
  plantedAt: string
  expectedHarvestAt: string
  status: 'growing' | 'harvested' | 'paused'
  description?: string
  treeCount?: number
  farmingDuration?: number
  farmId: string
  farmName: string
}

export interface UserListItem {
  id: string
  fullName: string
  email: string
  role: 'admin' | 'farmer' | 'wholesaler'
  status: 'active' | 'inactive'
  createdAt: string
}
