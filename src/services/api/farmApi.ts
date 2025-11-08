import { HttpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse } from '../../types/api'
import type { CustardAppleType, CreateCustardAppleTypeDTO, UpdateCustardAppleTypeDTO, ApiFarm } from '../../types/api'

const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_URL ?? 'https://gateway.a-379.store'
const farmHttpClient = new HttpClient(GATEWAY_BASE_URL)

export const farmApi = {
  async getFarms(): Promise<APIResponse<ApiFarm[]>> {
    return farmHttpClient.get<ApiFarm[]>(ENDPOINTS.farm.list, { cache: false })
  },
  async deleteFarm(id: string): Promise<APIResponse<void>> {
    return farmHttpClient.delete<void>(ENDPOINTS.farm.delete(id), { invalidateCache: ENDPOINTS.farm.list })
  },
  async getCustardAppleTypes(): Promise<APIResponse<CustardAppleType[]>> {
    return farmHttpClient.get<CustardAppleType[]>(ENDPOINTS.farm.custardAppleType.list, { cache: false })
  },
  async getCustardAppleTypeById(id: string): Promise<APIResponse<CustardAppleType>> {
    return farmHttpClient.get<CustardAppleType>(ENDPOINTS.farm.custardAppleType.detail(id), { cache: false })
  },
  async createCustardAppleType(data: CreateCustardAppleTypeDTO): Promise<APIResponse<CustardAppleType>> {
    return farmHttpClient.post<CustardAppleType>(ENDPOINTS.farm.custardAppleType.create, data, { invalidateCache: ENDPOINTS.farm.custardAppleType.list })
  },
  async updateCustardAppleType(id: string, data: UpdateCustardAppleTypeDTO): Promise<APIResponse<CustardAppleType>> {
    return farmHttpClient.put<CustardAppleType>(ENDPOINTS.farm.custardAppleType.update(id), data, { invalidateCache: ENDPOINTS.farm.custardAppleType.list })
  },
  async deleteCustardAppleType(id: string): Promise<APIResponse<void>> {
    return farmHttpClient.delete<void>(ENDPOINTS.farm.custardAppleType.delete(id), { invalidateCache: ENDPOINTS.farm.custardAppleType.list })
  },
}

