import { httpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse } from '../../types/api'
import type { ApiWallet, ApiLedger, CreateLedgerDTO } from '../../types/api'

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
}

