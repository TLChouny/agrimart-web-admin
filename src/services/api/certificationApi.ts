import { httpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse } from '../../types/api'
import type { ApiCertification, ApproveCertificationDTO } from '../../types/api'

export const certificationApi = {
  async getPending(): Promise<APIResponse<ApiCertification[]>> {
    return httpClient.get<ApiCertification[]>(ENDPOINTS.certification.pending, { cache: false })
  },

  async getById(id: string): Promise<APIResponse<ApiCertification>> {
    return httpClient.get<ApiCertification>(ENDPOINTS.certification.detail(id), { cache: false })
  },

  async getByUserId(userId: string): Promise<APIResponse<ApiCertification[]>> {
    return httpClient.get<ApiCertification[]>(ENDPOINTS.certification.byUser(userId), { cache: false })
  },

  async approve(id: string, data: ApproveCertificationDTO): Promise<APIResponse<ApiCertification>> {
    return httpClient.put<ApiCertification>(
      ENDPOINTS.certification.approve(id),
      data,
      { invalidateCache: ENDPOINTS.certification.pending }
    )
  },
}

