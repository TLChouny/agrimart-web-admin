// buyRequestApi.ts
import { HttpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse, ApiBuyRequest, PaginatedBuyRequests, BuyRequestStatus, UpdateBuyRequestStatusDTO } from '../../types/api'

const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_URL ?? 'https://gateway.a-379.store'
const buyRequestHttpClient = new HttpClient(GATEWAY_BASE_URL)

export const buyRequestApi = {
  // GET LIST WITH PAGINATION
  async getBuyRequests(
    status?: BuyRequestStatus,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Promise<APIResponse<PaginatedBuyRequests>> {
    const params: Record<string, string | number> = {
      pageNumber,
      pageSize,
    }
    if (status) {
      params.status = status
    }

    return buyRequestHttpClient.get<PaginatedBuyRequests>(
      ENDPOINTS.buyRequest.list,
      {
        cache: false,
        params,
      }
    )
  },

  async getBuyRequestById(id: string): Promise<APIResponse<ApiBuyRequest>> {
    return buyRequestHttpClient.get<ApiBuyRequest>(
      ENDPOINTS.buyRequest.detail(id),
      { cache: false }
    )
  },

  async updateBuyRequestStatus(id: string, status: BuyRequestStatus): Promise<APIResponse<ApiBuyRequest>> {
    return buyRequestHttpClient.put<ApiBuyRequest>(
      ENDPOINTS.buyRequest.updateStatus(id),
      { status } as UpdateBuyRequestStatusDTO
    )
  },
}

