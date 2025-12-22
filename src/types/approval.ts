export interface PendingAccount {
  id: string
  email: string
  fullName: string
  phone: string
  address: string
  // Role để phân biệt farmer / wholesaler / admin
  role: 'farmer' | 'wholesaler' | 'admin'
  farmName: string
  farmAddress: string
  farmSize: string
  farmType: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  documents: string[]
  verifications?: Array<{
    id: string
    url: string
    documentType: number
    createdAt: string
    updatedAt: string | null
    userId: string
  }>
}

export interface ApproveAccountRequest { accountId: string }
export interface RejectAccountRequest { accountId: string; reason: string }

