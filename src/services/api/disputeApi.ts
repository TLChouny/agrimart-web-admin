import { httpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type {
  APIResponse,
  ApiDispute,
  ApiDisputeResolve,
  PaginatedDisputes,
  DisputeStatus,
  UpdateDisputeStatusDTO,
  CreateDisputeResolveDTO,
} from '../../types/api'

export interface DisputeListParams {
  status?: DisputeStatus | number
  pageNumber?: number
  pageSize?: number
}

export const disputeApi = {
  async getDisputes(params: DisputeListParams = {}): Promise<APIResponse<PaginatedDisputes>> {
    return httpClient.get<PaginatedDisputes>(ENDPOINTS.dispute.list, {
      cache: false,
      params,
    })
  },

  async getPendingDisputes(): Promise<APIResponse<ApiDispute[]>> {
    return httpClient.get<ApiDispute[]>(ENDPOINTS.dispute.pending, { cache: false })
  },

  async getDisputeById(id: string): Promise<APIResponse<ApiDispute>> {
    return httpClient.get<ApiDispute>(ENDPOINTS.dispute.detail(id), { cache: false })
  },

  async updateDisputeStatus(
    id: string,
    data: UpdateDisputeStatusDTO
  ): Promise<APIResponse<ApiDispute>> {
    // API yêu cầu format trực tiếp { status, adminNote } (không wrap trong dto)
    return httpClient.patch<ApiDispute>(ENDPOINTS.dispute.updateStatus(id), data, {
      invalidateCache: ENDPOINTS.dispute.list,
    })
  },

  async createDisputeResolve(
    data: CreateDisputeResolveDTO
  ): Promise<APIResponse<ApiDisputeResolve>> {
    // API có thể yêu cầu format trực tiếp hoặc wrap trong dto, thử trực tiếp trước
    return httpClient.post<ApiDisputeResolve>(ENDPOINTS.dispute.createResolve, data, {
      invalidateCache: ENDPOINTS.dispute.list,
    })
  },

  async getResolveByDisputeId(disputeId: string): Promise<APIResponse<ApiDisputeResolve>> {
    return httpClient.get<ApiDisputeResolve>(ENDPOINTS.dispute.resolveByDisputeId(disputeId), {
      cache: false,
    })
  },

  async getResolveByEscrowId(escrowId: string): Promise<APIResponse<ApiDisputeResolve>> {
    return httpClient.get<ApiDisputeResolve>(ENDPOINTS.dispute.resolveByEscrowId(escrowId), {
      cache: false,
    })
  },
}


