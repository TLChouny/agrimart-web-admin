export interface PendingAccount {
  id: string
  email: string
  fullName: string
  phone: string
  address: string
  farmName: string
  farmAddress: string
  farmSize: string
  farmType: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  documents: string[]
}

export interface ApproveAccountRequest { accountId: string }
export interface RejectAccountRequest { accountId: string; reason: string }

