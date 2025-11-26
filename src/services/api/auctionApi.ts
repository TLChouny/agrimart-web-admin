// auctionApi.ts
import { HttpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type {
  ApiEnglishAuctionHarvest,
  APIResponse,
  AuctionStatus,
  ApiAuctionLog,
  AuctionLogType,
  ApiAuctionPauseSession,
  PauseAuctionDTO,
  ResumeAuctionDTO,
  ApiAuctionExtend,
  ApiAuctionBid,
} from '../../types/api'
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
  },

  async getAuctionLogsByAuctionId(
    auctionId: string
  ): Promise<APIResponse<ApiAuctionLog[]>> {
    return auctionHttpClient.get<ApiAuctionLog[]>(
      ENDPOINTS.auction.auctionLog.byAuction(auctionId),
      { cache: false }
    )
  },

  async getAuctionLogsByType(
    logType: AuctionLogType
  ): Promise<APIResponse<ApiAuctionLog[]>> {
    return auctionHttpClient.get<ApiAuctionLog[]>(
      ENDPOINTS.auction.auctionLog.byType(logType),
      { cache: false }
    )
  },
  async pauseEnglishAuction(
    payload: PauseAuctionDTO
  ): Promise<APIResponse<ApiAuctionPauseSession>> {
    return auctionHttpClient.post<ApiAuctionPauseSession>(
      ENDPOINTS.auction.englishAuction.pause,
      payload
    )
  },

  async resumeEnglishAuction(
    payload: ResumeAuctionDTO
  ): Promise<APIResponse<ApiAuctionPauseSession>> {
    return auctionHttpClient.post<ApiAuctionPauseSession>(
      ENDPOINTS.auction.englishAuction.resume,
      payload
    )
  },

  async getAuctionExtends(): Promise<APIResponse<ApiAuctionExtend[]>> {
    return auctionHttpClient.get<ApiAuctionExtend[]>(
      ENDPOINTS.auction.auctionExtend.list,
      { cache: false }
    )
  },

  async getAuctionExtendsByAuctionId(auctionId: string): Promise<APIResponse<ApiAuctionExtend[]>> {
    return auctionHttpClient.get<ApiAuctionExtend[]>(
      ENDPOINTS.auction.auctionExtend.byAuction(auctionId),
      { cache: false }
    )
  },

  async getAuctionPausesByAuctionId(auctionId: string): Promise<APIResponse<ApiAuctionPauseSession[]>> {
    return auctionHttpClient.get<ApiAuctionPauseSession[]>(
      ENDPOINTS.auction.auctionPause.byAuction(auctionId),
      { cache: false }
    )
  },

  async getBidsByAuctionId(auctionId: string): Promise<APIResponse<ApiAuctionBid[]>> {
    return auctionHttpClient.get<ApiAuctionBid[]>(
      ENDPOINTS.auction.bid.byAuction(auctionId),
      { cache: false }
    )
  },
}
