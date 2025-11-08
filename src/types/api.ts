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

