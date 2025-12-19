// policyApi.ts
import { HttpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type {
  APIResponse,
  ApiPolicyCategory,
  ApiPolicyItem,
  CreatePolicyCategoryDTO,
  UpdatePolicyCategoryDTO,
  CreatePolicyItemDTO,
  UpdatePolicyItemDTO,
} from '../../types/api'

const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_URL ?? 'https://gateway.a-379.store'
const policyHttpClient = new HttpClient(GATEWAY_BASE_URL)

export const policyApi = {
  // Policy Categories
  async getCategories(): Promise<APIResponse<ApiPolicyCategory[]>> {
    return policyHttpClient.get<ApiPolicyCategory[]>(ENDPOINTS.policy.categories.list, {
      cache: false,
    })
  },

  async getCategoryById(id: string): Promise<APIResponse<ApiPolicyCategory>> {
    return policyHttpClient.get<ApiPolicyCategory>(ENDPOINTS.policy.categories.detail(id), {
      cache: false,
    })
  },

  async createCategory(data: CreatePolicyCategoryDTO): Promise<APIResponse<ApiPolicyCategory>> {
    return policyHttpClient.post<ApiPolicyCategory>(ENDPOINTS.policy.categories.create, data)
  },

  async updateCategory(
    id: string,
    data: UpdatePolicyCategoryDTO
  ): Promise<APIResponse<ApiPolicyCategory>> {
    return policyHttpClient.put<ApiPolicyCategory>(ENDPOINTS.policy.categories.update(id), data)
  },

  async deleteCategory(id: string): Promise<APIResponse<void>> {
    return policyHttpClient.delete<void>(ENDPOINTS.policy.categories.delete(id))
  },

  async getCategoryItems(categoryId: string): Promise<APIResponse<ApiPolicyItem[]>> {
    return policyHttpClient.get<ApiPolicyItem[]>(ENDPOINTS.policy.categories.items(categoryId), {
      cache: false,
    })
  },

  // Policy Items
  async getItemById(id: string): Promise<APIResponse<ApiPolicyItem>> {
    return policyHttpClient.get<ApiPolicyItem>(ENDPOINTS.policy.items.detail(id), {
      cache: false,
    })
  },

  async createItem(data: CreatePolicyItemDTO): Promise<APIResponse<ApiPolicyItem>> {
    return policyHttpClient.post<ApiPolicyItem>(ENDPOINTS.policy.items.create, data)
  },

  async updateItem(id: string, data: UpdatePolicyItemDTO): Promise<APIResponse<ApiPolicyItem>> {
    return policyHttpClient.put<ApiPolicyItem>(ENDPOINTS.policy.items.update(id), data)
  },

  async deleteItem(id: string): Promise<APIResponse<void>> {
    return policyHttpClient.delete<void>(ENDPOINTS.policy.items.delete(id))
  },
}

