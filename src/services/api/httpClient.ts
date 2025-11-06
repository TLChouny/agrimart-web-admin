import { API_BASE_URL } from '../constants/apiConstants'
import type { APIResponse, ApiError } from '../../types/api'
import { requestCache } from './requestCache'

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
  retries?: number
  retryDelay?: number
}

interface AspNetValidationError {
  type?: string
  title?: string
  status: number
  errors?: Record<string, string[]>
  traceId?: string
}

class HttpClient {
  private baseURL: string
  private defaultTimeout = 30000
  private defaultRetries = 2
  private defaultRetryDelay = 1000

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw { message: 'Request timeout', status: 408, errors: ['The request took too long to complete'] } as ApiError
      }
      throw error
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private isRetryableError(status: number): boolean {
    return status === 0 || status === 408 || status === 429 || status >= 500
  }

  private parseErrorResponse(data: unknown, status: number): ApiError {
    const errorData = data as any
    if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
      const aspNetError = errorData as AspNetValidationError
      const errorMessages: string[] = []
      if (aspNetError.errors) {
        Object.entries(aspNetError.errors).forEach(([field, messages]) => {
          errorMessages.push(...messages.map(msg => `${field}: ${msg}`))
        })
      }
      return { message: aspNetError.title || 'Validation error', status, errors: errorMessages }
    }
    return { message: errorData.message || 'API request failed', status, errors: Array.isArray(errorData.errors) ? errorData.errors : [] }
  }

  private async request<T>(endpoint: string, options: HttpRequestOptions = {}): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const { method = 'GET', headers = {}, body, timeout = this.defaultTimeout, retries = this.defaultRetries, retryDelay = this.defaultRetryDelay } = options

    const token = localStorage.getItem('authToken')
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    }

    const init: RequestInit = { method, headers: requestHeaders }
    if (body !== undefined) {
      if (body instanceof FormData) {
        delete (init.headers as Record<string, string>)['Content-Type']
        init.body = body
      } else {
        init.body = JSON.stringify(body)
      }
    }

    let lastError: ApiError | null = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, init, timeout)
        let data: any
        const contentType = response.headers.get('content-type')
        try {
          if (contentType && contentType.includes('application/json')) data = await response.json()
          else data = { isSuccess: response.ok, statusCode: response.status, message: response.ok ? 'Success' : 'Request failed', data: undefined }
        } catch {
          data = { isSuccess: response.ok, statusCode: response.status, message: response.ok ? 'Success' : 'Request failed', data: undefined }
        }

        if (!response.ok) {
          if (response.status === 401) {
            try {
              localStorage.removeItem('authToken')
              localStorage.removeItem('refreshToken')
              localStorage.removeItem('currentUser')
              if (typeof window !== 'undefined') {
                window.location.replace('/auth/login')
              }
            } catch {}
          }
          const error = this.parseErrorResponse(data, response.status)
          if (this.isRetryableError(response.status) && attempt < retries) {
            lastError = error
            await this.sleep(retryDelay * Math.pow(2, attempt))
            continue
          }
          throw error
        }

        if (data.isSuccess !== undefined) {
          if (!data.isSuccess) throw this.parseErrorResponse(data, response.status)
          return data as APIResponse<T>
        }
        return { isSuccess: true, statusCode: response.status, message: 'Success', data: data as T }
      } catch (error) {
        if (error && typeof error === 'object' && 'status' in error) {
          const apiError = error as ApiError
          if (apiError.status === 401) {
            try {
              localStorage.removeItem('authToken')
              localStorage.removeItem('refreshToken')
              localStorage.removeItem('currentUser')
              if (typeof window !== 'undefined') {
                window.location.replace('/auth/login')
              }
            } catch {}
          }
          if (this.isRetryableError(apiError.status) && attempt < retries) {
            lastError = apiError
            await this.sleep(retryDelay * Math.pow(2, attempt))
            continue
          }
          throw apiError
        }
        const networkError: ApiError = { message: error instanceof Error ? error.message : 'Network error occurred', status: 0, errors: ['Unable to connect to server'] }
        if (attempt < retries) {
          lastError = networkError
          await this.sleep(retryDelay * Math.pow(2, attempt))
          continue
        }
        throw networkError
      }
    }
    throw lastError || { message: 'Request failed after multiple attempts', status: 0, errors: ['Maximum retry attempts exceeded'] }
  }

  async get<T>(endpoint: string, options: { cache?: boolean; cacheTTL?: number } = {}): Promise<APIResponse<T>> {
    const { cache = true, cacheTTL } = options
    if (cache) {
      const cacheKey = requestCache.generateKey(endpoint, 'GET')
      const cachedData = requestCache.get<T>(cacheKey)
      if (cachedData) return cachedData
      const pendingRequest = requestCache.getPending<T>(cacheKey)
      if (pendingRequest) return pendingRequest
      const requestPromise = this.request<T>(endpoint, { method: 'GET' })
      requestCache.setPending(cacheKey, requestPromise)
      const response = await requestPromise
      requestCache.set(cacheKey, response, cacheTTL)
      return response
    }
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown, options: { invalidateCache?: string } = {}): Promise<APIResponse<T>> {
    const response = await this.request<T>(endpoint, { method: 'POST', body: data })
    if (options.invalidateCache) requestCache.invalidate(options.invalidateCache)
    return response
  }

  async put<T>(endpoint: string, data?: unknown, options: { invalidateCache?: string } = {}): Promise<APIResponse<T>> {
    const response = await this.request<T>(endpoint, { method: 'PUT', body: data })
    if (options.invalidateCache) requestCache.invalidate(options.invalidateCache)
    return response
  }

  async patch<T>(endpoint: string, data?: unknown, options: { invalidateCache?: string } = {}): Promise<APIResponse<T>> {
    const response = await this.request<T>(endpoint, { method: 'PATCH', body: data })
    if (options.invalidateCache) requestCache.invalidate(options.invalidateCache)
    return response
  }

  async delete<T>(endpoint: string, options: { invalidateCache?: string } = {}): Promise<APIResponse<T>> {
    const response = await this.request<T>(endpoint, { method: 'DELETE' })
    if (options.invalidateCache) requestCache.invalidate(options.invalidateCache)
    return response
  }

  clearCache(pattern?: string): void {
    requestCache.invalidate(pattern)
  }
}

export const httpClient = new HttpClient(API_BASE_URL)

export async function http<TResponse>(url: string, options: HttpRequestOptions = {}): Promise<TResponse> {
  const { method = 'GET', headers = {}, body } = options
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (body !== undefined) init.body = JSON.stringify(body)
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed with ${res.status}`)
  }
  return (await res.json()) as TResponse
}

