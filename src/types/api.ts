export interface APIResponse<T = unknown> { isSuccess: boolean; statusCode: number; message?: string; errors?: string[]; data?: T }
export interface PaginationParams { searchValue?: string; index?: number; pageSize?: number }
export interface LoginRequestDTO { email: string; password: string }
export interface RegisterRequestDTO { Email: string; Password: string; FirstName: string; LastName: string; Address: string; Communes: string; Province: string; PhoneNumber: string; RoleId: string; UserVerifications?: CreateUserVerificationDTO[] }
export interface CreateUserVerificationDTO { document?: File | null; documentType: DocumentType }
export const DocumentType = { IdentityCard: 0, DrivingLicense: 1 } as const
export type DocumentType = typeof DocumentType[keyof typeof DocumentType]

export interface ApiUserVerification {
  id: string
  url: string
  documentType: DocumentType
  createdAt: string
  updatedAt: string | null
  userId: string
}
export interface User { 
  id: string
  firstName: string
  lastName: string
  email: string
  address: string
  communes: string
  province: string
  phoneNumber: string | null
  role: string // "farmer" | "wholesaler" | "admin"
  createdAt: string
  updatedAt: string | null
  // Optional fields that may exist in some API responses
  status?: number // 0: Pending, 1: Active, 2: Banned
  reputationScore?: number
  reputation?: {
    trustScore: number
    history: unknown[]
  }
  certifications?: ApiCertification[] | null
  verifications?: ApiUserVerification[]
  roleId?: string
  roleObject?: Role
  emailConfirmed?: boolean
  phoneNumberConfirmed?: boolean
  twoFactorEnabled?: boolean
  lockoutEnabled?: boolean
  lockoutEnd?: string
  accessFailedCount?: number
}
export interface AuthUser { token: string; user: User; expiresAt: string }
export interface Role { id: string; name: string; fullName: string; normalizedName: string; concurrencyStamp: string; createdAt: string; updatedAt: string }
export interface CreateRoleDTO { name?: string; fullName?: string }
export interface UpdateRoleDTO { id?: string; name?: string; fullName?: string }
export interface RoleClaim { id: string; roleId: string; claimType: string; claimValue: string; role?: Role }
export interface CreateRoleClaimDTO { roleId?: string; claimType?: string; claimValue?: string }
export interface UpdateRoleClaimDTO { roleClaimId?: string; roleId?: string; claimType?: string; claimValue?: string }
export interface UpdateUserStatusDTO { status: 0 | 1 | 2; reason: string } // 0: Pending, 1: Active, 2: Banned
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

export interface ApiHarvestImage {
  id: string
  harvestID: string
  imageUrl: string
  createdAt: string
  updatedAt: string | null
}

// Statistics - System Profit
export interface SystemProfitPoint {
  time: string
  profit: number
  income: number
  expense: number
}

export interface SystemProfitSummary {
  data: SystemProfitPoint[]
  timeRange: 'daily' | 'monthly'
  startDate: string
  endDate: string
  totalProfit: number
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
export type AuctionStatus = 'Draft' | 'Pending' | 'Rejected' | 'Approved' | 'OnGoing' | 'Completed' | 'NoWinner' | 'Cancelled' |'Pause'
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

export interface PaginatedEnglishAuctions {
  items: ApiEnglishAuction[]
  pageNumber: number
  pageSize: number
  totalPages: number
  totalCount: number
  previousPage: boolean
  nextPage: boolean
}

export interface ApiEnglishAuction {
  id: string
  publishDate: string
  endDate: string
  farmerId: string
  sessionCode: string
  startingPrice: number
  currentPrice: number | null
  winningPrice: number | null
  minBidIncrement: number
  enableBuyNow: boolean
  buyNowPrice: number
  enableAntiSniping: boolean
  antiSnipingExtensionSeconds: number
  status: 'Draft' | 'Pending' | 'Rejected' | 'Approved' | 'OnGoing' | 'Pause' | 'Completed' | 'NoWinner' | 'Cancelled'
  winnerId: string | null
  note: string
  expectedHarvestDate: string
  expectedTotalQuantity: number
  createdAt: string
  updatedAt: string
  harvests: ApiHarvest[]
}

export interface ApiEnglishAuctionHarvest {
  auctionSessionId: string
  harvestId: string
}

export interface PauseAuctionDTO {
  auctionId: string
  reason: string
}

export interface ResumeAuctionDTO {
  auctionId: string
  extendMinute?: number
}

export interface ApiAuctionPauseSession {
  id: string
  auctionId: string
  pauseStartAt: string
  pauseEndAt: string | null
  pauseDurationInMinutes: number | null
  reason: string
  note: string
  createdAt: string
  updatedAt: string | null
}

export type AuctionExtendType = 'PauseTime' | 'ResumeTime' | 'Other'

export interface ApiAuctionExtend {
  id: string
  extendDurationInMinutes: number
  extendType: AuctionExtendType
  auctionId: string
  createdAt: string
  updatedAt: string | null
}

export interface ApiAuctionBidLog {
  id: string
  bidId: string
  userId: string
  userName: string
  type: string
  isAutoBidding: boolean
  dateTimeUpdate: string
  oldEntity: string | null
  newEntity: string | null
}

// Auction Log related types
export type AuctionLogType = 'Create' | 'StatusChange' | 'Publish' | 'Update' | 'Delete' | 'End' | 'Extend' | 'Pause' | 'Resume'
export interface ApiAuctionLog {
  id: string
  auctionPostId: string
  userId: string
  type: AuctionLogType
  dateTimeUpdate: string
  oldEntity: string | null
  newEntity: string | null
  createdAt: string
  updatedAt: string | null
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

export type ReportType = 'Fraud' | 'FalseInformation' | 'TechnicalIssue' | 'PolicyViolated' | 'Other'
export type ReportStatus = 'Pending' | 'InReview' | 'Resolved' | 'ActionTaken' | 'Rejected'

export interface ReportItem {
  id: string
  auctionId: string
  reporterId: string
  note: string
  reportType: ReportType
  reportStatus: ReportStatus
  createdAt: string
  updatedAt: string | null
}

export interface PaginatedReports {
  items: ReportItem[]
  pageNumber: number
  pageSize: number
  totalPages: number
  totalCount: number
  previousPage: boolean
  nextPage: boolean
}

export interface ReportListParams {
  status?: ReportStatus
  type?: ReportType
  pageNumber?: number
  pageSize?: number
}

export interface UpdateReportStatusRequest {
  reportStatus: ReportStatus
}

// Post related types
export type PostStatus = 'Draft' | 'Published' | 'Archived' | 'Deleted'
export interface ApiPost {
  id: string
  title: string
  content: string
  authorId: string
  authorName?: string
  status: PostStatus
  category?: string
  tags?: string[]
  viewCount?: number
  likeCount?: number
  featuredImage?: string
  publishedAt?: string | null
  createdAt: string
  updatedAt: string | null
}

export interface PaginatedPosts {
  items: ApiPost[]
  pageNumber: number
  pageSize: number
  totalPages: number
  totalCount: number
  previousPage: boolean
  nextPage: boolean
}

export interface CreatePostDTO {
  title: string
  content: string
  category?: string
  tags?: string[]
  featuredImage?: string
  status?: PostStatus
}

export interface UpdatePostDTO {
  title?: string
  content?: string
  category?: string
  tags?: string[]
  featuredImage?: string
  status?: PostStatus
}

// Wallet related types
export type WalletStatus = 0 | 1 | 2 // 0: Active, 1: Suspended, 2: Closed
export type Direction = 1 | 2 // 1: Credit (+), 2: Debit (-)

export interface ApiWallet {
  id: string
  userId: string
  isSystemWallet: boolean
  balance: number
  walletStatus: WalletStatus
  currency: string
  createdAt: string
  updatedAt: string | null
}

export interface ApiLedger {
  id?: string
  walletId: string
  transactionId: string
  direction: Direction
  amount: number
  balanceAfter: number
  description: string
  createdAt?: string
  updatedAt?: string | null
}

export interface CreateLedgerDTO {
  walletId: string
  transactionId: string
  direction: Direction
  amount: number
  balanceAfter: number
  description: string
}

// Transaction related types
export type TransactionType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 // 0: Unknown, 1: PayEscrow, 2: ReleaseEscrow, 3: RefundEscrow, 4: AddFunds, 5: WithdrawFunds, 6: PayRemainingEscrow, 7: AuctionJoinFee, 8: RefundAuctionJoinFee, 9: AuctionFee
export type PaymentType = 0 | 1 | 2 // 0: Unknown, 1: VNPay, 2: Wallet

export interface ApiEscrow {
  id: string
  auctionId?: string | null
  buyRequestId?: string | null
  amount: number
  status: string
  createdAt: string
  updatedAt: string | null
}

export interface ApiTransaction {
  id: string
  code: string
  desc: string
  success: boolean
  orderCode: number
  amount: number
  transactionDateTime: string
  currency: string
  paymentLinkId: string
  escrowId: string
  transactionType: TransactionType
  paymentType: PaymentType
  relatedEntityId?: string | null
  relatedEntityType?: string | null
  fromWalletId: string | null
  toWalletId: string | null
  signature: string
  createdAt: string
  updatedAt: string | null
}

// Buy Request related types
export interface ApiBuyRequestDetail {
  id?: string
  buyRequestId?: string
  grade?: number
  quantity?: number
  price?: number
  allowedDeviationPercent?: number
  unit?: string
  createdAt?: string
  updatedAt?: string | null
}

export interface ApiBuyRequest {
  id: string
  requestCode?: string
  requiredDate?: string
  expectedPrice?: number
  totalQuantity?: number
  status?: string | number
  isBuyingBulk?: boolean
  message?: string
  wholesalerId?: string
  harvestId?: string
  farmerId?: string
  details?: ApiBuyRequestDetail[]
  createdAt?: string
  updatedAt?: string | null
}

// Withdraw Request related types
export type WithdrawRequestStatus = 0 | 1 | 2 | 3 | 4 // 0: Pending, 1: Approved, 2: Rejected, 3: Completed, 4: Cancelled

export interface ApiWithdrawRequest {
  id: string
  userId: string
  walletId: string
  amount: number
  transactionId: string
  status: WithdrawRequestStatus
  userBankAccountId: string
  reason: string | null
  createdAt: string
  updatedAt: string | null
}

export interface CreateWithdrawRequestDTO {
  walletId: string
  amount: number
  userBankAccountId: string
}

export interface RejectWithdrawRequestDTO {
  reason?: string
}

// Bank related types
export interface ApiBank {
  id: number
  name: string
  code: string
  shortName: string
  logo: string
}

export interface ApiUserBankAccount {
  id: string
  userId: string
  accountNumber: string
  accountName: string
  bankId: number
  bank: ApiBank
  isPrimary: boolean
  createdAt: string
  updatedAt: string | null
}

// Dispute related types
export type DisputeStatus = 0 | 1 | 2 | 3 | 4 // 0: Pending, 1: Approved, 2: Rejected, 3: InAdminReview, 4: Resolved

export interface ApiDisputeAttachment {
  id: string
  url: string
}

export interface ApiDispute {
  id: string
  escrowId: string
  actualAmount: number
  actualGrade1Amount: number | null
  actualGrade2Amount: number | null
  actualGrade3Amount: number | null
  disputeMessage: string
  disputeStatus: DisputeStatus
  resolvedAt: string | null
  attachments: ApiDisputeAttachment[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedDisputes {
  data: ApiDispute[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface ApiDisputeResolve {
  id: string
  disputeId?: string
  escrowId?: string
  refundAmount: number
  isFinalDecision: boolean
  adminNote: string
  createdAt: string
  updatedAt: string | null
  disputeStatus?: number
}

export interface UpdateDisputeStatusDTO {
  status: 3 | 4 // 3: InAdminReview, 4: Resolved (sử dụng number thay vì string enum)
  adminNote?: string
}

export interface CreateDisputeResolveDTO {
  escrowId: string
  refundAmount: number
  isFinalDecision: boolean
  adminNote: string
}

// Certification related types
export type CertificationStatus = 0 | 1 | 2 | 3 // 0: Pending, 1: Active, 2: Reject, 3: Expired
export type CertificationType = 0 | 1 // Add more types as needed

export interface ApiCertification {
  id: string
  userId: string
  type: CertificationType
  certificationName: string
  issuingOrganization: string
  issueDate: string
  expiryDate: string
  certificateUrl: string
  status: CertificationStatus
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface ApproveCertificationDTO {
  status: 1 | 2 // 1: Active, 2: Reject
  rejectionReason?: string // Required when status is 2 (Reject)
}

// Policy related types
export interface ApiPolicyCategory {
  id: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreatePolicyCategoryDTO {
  name: string
  description: string
}

export interface UpdatePolicyCategoryDTO {
  name: string
  description: string
  isActive: boolean
}

export interface ApiPolicyItem {
  id: string
  categoryId: string
  categoryName: string
  content: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreatePolicyItemDTO {
  categoryId: string
  content: string
  description: string
}

export interface UpdatePolicyItemDTO {
  categoryId: string
  content: string
  description: string
  isActive: boolean
}
