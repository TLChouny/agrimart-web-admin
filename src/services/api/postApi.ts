// postApi.ts
import { HttpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse, ApiPost, PaginatedPosts, CreatePostDTO, UpdatePostDTO, PostStatus } from '../../types/api'

const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_URL ?? 'https://gateway.a-379.store'
const postHttpClient = new HttpClient(GATEWAY_BASE_URL)

export const postApi = {
  // GET LIST WITH PAGINATION
  async getPosts(
    status?: PostStatus,
    pageNumber: number = 1,
    pageSize: number = 10,
    searchValue?: string
  ): Promise<APIResponse<PaginatedPosts>> {
    const params: Record<string, string | number> = {
      pageNumber,
      pageSize,
    }
    if (status) {
      params.status = status
    }
    if (searchValue) {
      params.searchValue = searchValue
    }

    return postHttpClient.get<PaginatedPosts>(
      ENDPOINTS.post.list,
      {
        cache: false,
        params,
      }
    )
  },

  async getPostById(id: string): Promise<APIResponse<ApiPost>> {
    return postHttpClient.get<ApiPost>(
      `${ENDPOINTS.post.list}/${id}`,
      { cache: false }
    )
  },

  async createPost(data: CreatePostDTO): Promise<APIResponse<ApiPost>> {
    return postHttpClient.post<ApiPost>(
      ENDPOINTS.post.list,
      data
    )
  },

  async updatePost(id: string, data: UpdatePostDTO): Promise<APIResponse<ApiPost>> {
    return postHttpClient.put<ApiPost>(
      `${ENDPOINTS.post.list}/${id}`,
      data
    )
  },

  async deletePost(id: string): Promise<APIResponse<void>> {
    return postHttpClient.delete<void>(
      `${ENDPOINTS.post.list}/${id}`
    )
  },

  async updatePostStatus(id: string, status: PostStatus): Promise<APIResponse<ApiPost>> {
    return postHttpClient.patch<ApiPost>(
      ENDPOINTS.post.updateStatus(id),
      { status }
    )
  },
}

