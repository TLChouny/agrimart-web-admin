import { HttpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse, ApiBuyRequest, ListResponse } from '../../types/api'

const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_URL ?? 'https://gateway.a-379.store'
const buyRequestHttpClient = new HttpClient(GATEWAY_BASE_URL)

export interface BuyRequestListParams {
  pageNumber?: number
  pageSize?: number
  status?: string | number
  searchValue?: string
}

const DEFAULT_PAGE_NUMBER = 1
const DEFAULT_PAGE_SIZE = 10

export const buyRequestApi = {
  async list(params: BuyRequestListParams = {}): Promise<APIResponse<ListResponse<ApiBuyRequest>>> {
    const { pageNumber = DEFAULT_PAGE_NUMBER, pageSize = DEFAULT_PAGE_SIZE, status, searchValue } = params
    
    return buyRequestHttpClient.get<ListResponse<ApiBuyRequest>>(ENDPOINTS.buyRequest.list, {
      cache: false,
      params: {
        pageNumber,
        pageSize,
        ...(status !== undefined && { status }),
        ...(searchValue && { searchValue }),
      },
    })
  },

  async getById(id: string): Promise<APIResponse<ApiBuyRequest>> {
    return buyRequestHttpClient.get<ApiBuyRequest>(ENDPOINTS.buyRequest.detail(id), { cache: false })
  },
}



