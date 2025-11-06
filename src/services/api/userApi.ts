import { httpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse } from '../../types/api'
import type { User as ApiUser, ListResponse } from '../../types/api'

export const userApi = {
  async list(): Promise<APIResponse<ListResponse<ApiUser> | ApiUser[]>> {
    // Some services return APIResponse<{ items: User[]; ... }>,
    // identity currently returns APIResponse<User[]>; support both.
    return httpClient.get<ListResponse<ApiUser> | ApiUser[]>(ENDPOINTS.users.list, { cache: false })
  },
}

