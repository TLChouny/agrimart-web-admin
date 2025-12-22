import { HttpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse, ApiBuyRequest } from '../../types/api'

const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_URL ?? 'https://gateway.a-379.store'
const buyRequestHttpClient = new HttpClient(GATEWAY_BASE_URL)

export const buyRequestApi = {
  async getById(id: string): Promise<APIResponse<ApiBuyRequest>> {
    return buyRequestHttpClient.get<ApiBuyRequest>(ENDPOINTS.buyRequest.detail(id), { cache: false })
  },
}



