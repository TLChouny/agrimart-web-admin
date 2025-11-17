// auctionApi.ts
import { HttpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse } from '../../types/api'
import type { ApiEnglishAuction } from '../../types/api'

const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_URL ?? 'https://gateway.a-379.store'
const auctionHttpClient = new HttpClient(GATEWAY_BASE_URL)

export const auctionApi = {
  async getEnglishAuctions(status?: string, pageNumber: number = 1, pageSize: number = 10): Promise<APIResponse<{ items: ApiEnglishAuction[] }>> {
    const params = {
      ...(status && { status }),
      pageNumber,
      pageSize,
    }
    return auctionHttpClient.get<{ items: ApiEnglishAuction[] }>(ENDPOINTS.auction.englishAuction.list, { cache: false, params })
  },
}