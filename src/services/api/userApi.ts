import { httpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse } from '../../types/api'
import type { User as ApiUser, ListResponse, UpdateUserStatusDTO } from '../../types/api'

export const userApi = {
  async list(): Promise<APIResponse<ListResponse<ApiUser> | ApiUser[]>> {
    // Some services return APIResponse<{ items: User[]; ... }>,
    // identity currently returns APIResponse<User[]>; support both.
    // Cache users list với TTL 5 phút vì data không thay đổi thường xuyên
    return httpClient.get<ListResponse<ApiUser> | ApiUser[]>(ENDPOINTS.users.list, { 
      cache: true,
      cacheTTL: 5 * 60 * 1000 // 5 minutes
    })
  },

  async getById(userId: string): Promise<APIResponse<ApiUser>> {
    return httpClient.get<ApiUser>(ENDPOINTS.users.detail(userId), { cache: false })
  },

  async updateStatus(userId: string, data: UpdateUserStatusDTO): Promise<APIResponse<ApiUser>> {
    return httpClient.put<ApiUser>(
      ENDPOINTS.users.updateStatus(userId),
      data,
      { invalidateCache: ENDPOINTS.users.list }
    )
  },
}

