// auctionApi.ts
import { HttpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { ApiEnglishAuctionHarvest, APIResponse, AuctionStatus } from '../../types/api'
import type { ApiEnglishAuction } from '../../types/api'

const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_URL ?? 'https://gateway.a-379.store'
const auctionHttpClient = new HttpClient(GATEWAY_BASE_URL)

export const auctionApi = {
  // GET LIST WITH PAGINATION
  async getEnglishAuctions(
    status?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Promise<APIResponse<{ items: ApiEnglishAuction[] }>> {
    const params = {
      ...(status && { status }),
      pageNumber,
      pageSize,
    }

    return auctionHttpClient.get<{ items: ApiEnglishAuction[] }>(
      ENDPOINTS.auction.englishAuction.list,
      {
        cache: false,
        params,
      }
    )
  },

  async getEnglishAuctionById(
    id: string
  ): Promise<APIResponse<ApiEnglishAuction>> {
    return auctionHttpClient.get<ApiEnglishAuction>(
      `${ENDPOINTS.auction.englishAuction.list}/${id}`,
      { cache: false }
    )
  },
  
  async getHarvestsByAuctionSessionId(auctionSessionId: string) {
    return auctionHttpClient.get<ApiEnglishAuctionHarvest[]>(
      ENDPOINTS.auction.englishAuction.harvestsBySession(auctionSessionId),
      { cache: false }
    );
  },

  async updateEnglishAuctionStatus(
    id: string,
    status: AuctionStatus
  ): Promise<APIResponse<boolean>> {
    return auctionHttpClient.put<boolean>(
      `${ENDPOINTS.auction.englishAuction.list}/${id}/status`,
      null, // body trống
      { params: { status } } // query param
    )
  }
  
}
