import { httpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse } from '../../types/api'
import type {
  ApiWallet,
  ApiLedger,
  CreateLedgerDTO,
  ApiTransaction,
  ApiWithdrawRequest,
  CreateWithdrawRequestDTO,
  RejectWithdrawRequestDTO,
  ApiUserBankAccount,
  ApiBank,
} from '../../types/api'

export const walletApi = {
  async getWallets(): Promise<APIResponse<ApiWallet[]>> {
    return httpClient.get<ApiWallet[]>(ENDPOINTS.wallet.list, { cache: false })
  },

  async getSystemWallet(): Promise<APIResponse<ApiWallet>> {
    return httpClient.get<ApiWallet>(ENDPOINTS.wallet.system, { cache: false })
  },

  async getWalletById(id: string): Promise<APIResponse<ApiWallet>> {
    return httpClient.get<ApiWallet>(ENDPOINTS.wallet.detail(id), { cache: false })
  },

  async getWalletByUserId(userId: string): Promise<APIResponse<ApiWallet>> {
    return httpClient.get<ApiWallet>(ENDPOINTS.wallet.byUser(userId), { cache: false })
  },

  async getLedgers(): Promise<APIResponse<ApiLedger[]>> {
    return httpClient.get<ApiLedger[]>(ENDPOINTS.ledger.list, { cache: false })
  },

  async getLedgersByWallet(walletId: string): Promise<APIResponse<ApiLedger[]>> {
    return httpClient.get<ApiLedger[]>(ENDPOINTS.ledger.byWallet(walletId), { cache: false })
  },

  async createLedger(data: CreateLedgerDTO): Promise<APIResponse<ApiLedger>> {
    return httpClient.post<ApiLedger>(ENDPOINTS.ledger.create, data, { invalidateCache: ENDPOINTS.ledger.list })
  },

  async getLedgersByTransaction(transactionId: string): Promise<APIResponse<ApiLedger[]>> {
    return httpClient.get<ApiLedger[]>(ENDPOINTS.ledger.byTransaction(transactionId), { cache: false })
  },

  async getTransactions(): Promise<APIResponse<ApiTransaction[]>> {
    return httpClient.get<ApiTransaction[]>(ENDPOINTS.transaction.list, { cache: false })
  },

  async getTransactionById(id: string): Promise<APIResponse<ApiTransaction>> {
    return httpClient.get<ApiTransaction>(ENDPOINTS.transaction.detail(id), { cache: false })
  },

  async getTransactionsByWallet(walletId: string): Promise<APIResponse<ApiTransaction[]>> {
    return httpClient.get<ApiTransaction[]>(ENDPOINTS.transaction.byWallet(walletId), { cache: false })
  },

  // Withdraw Request APIs
  async getWithdrawRequests(): Promise<APIResponse<ApiWithdrawRequest[]>> {
    return httpClient.get<ApiWithdrawRequest[]>(ENDPOINTS.withdrawRequest.list, { cache: false })
  },

  async getWithdrawRequestById(id: string): Promise<APIResponse<ApiWithdrawRequest>> {
    return httpClient.get<ApiWithdrawRequest>(ENDPOINTS.withdrawRequest.detail(id), { cache: false })
  },

  async getWithdrawRequestsByUser(userId: string): Promise<APIResponse<ApiWithdrawRequest[]>> {
    return httpClient.get<ApiWithdrawRequest[]>(ENDPOINTS.withdrawRequest.byUser(userId), { cache: false })
  },

  async getMyWithdrawRequests(): Promise<APIResponse<ApiWithdrawRequest[]>> {
    return httpClient.get<ApiWithdrawRequest[]>(ENDPOINTS.withdrawRequest.myRequests, { cache: false })
  },

  async createWithdrawRequest(data: CreateWithdrawRequestDTO): Promise<APIResponse<ApiWithdrawRequest>> {
    return httpClient.post<ApiWithdrawRequest>(ENDPOINTS.withdrawRequest.create, data, {
      invalidateCache: ENDPOINTS.withdrawRequest.list,
    })
  },

  async approveWithdrawRequest(id: string): Promise<APIResponse<ApiWithdrawRequest>> {
    return httpClient.post<ApiWithdrawRequest>(
      ENDPOINTS.withdrawRequest.approve(id),
      {},
      {
        invalidateCache: ENDPOINTS.withdrawRequest.list,
      }
    )
  },

  async rejectWithdrawRequest(id: string, data?: RejectWithdrawRequestDTO): Promise<APIResponse<ApiWithdrawRequest>> {
    return httpClient.post<ApiWithdrawRequest>(
      ENDPOINTS.withdrawRequest.reject(id),
      data || {},
      {
        invalidateCache: ENDPOINTS.withdrawRequest.list,
      }
    )
  },

  async completeWithdrawRequest(id: string): Promise<APIResponse<ApiWithdrawRequest>> {
    return httpClient.post<ApiWithdrawRequest>(
      ENDPOINTS.withdrawRequest.complete(id),
      {},
      {
        invalidateCache: ENDPOINTS.withdrawRequest.list,
      }
    )
  },

  // User Bank Account APIs
  async getUserBankAccountById(id: string): Promise<APIResponse<ApiUserBankAccount>> {
    return httpClient.get<ApiUserBankAccount>(ENDPOINTS.userBankAccount.detail(id), { cache: false })
  },

  // Bank APIs
  async getBanks(): Promise<APIResponse<ApiBank[]>> {
    return httpClient.get<ApiBank[]>(ENDPOINTS.bank.list, { cache: false })
  },
}

