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
  params?: Record<string, any> // <-- Added
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

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseURL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }
    return url.toString()
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
    const { method = 'GET', headers = {}, body, timeout = this.defaultTimeout, retries = this.defaultRetries, retryDelay = this.defaultRetryDelay, params } = options

    const url = this.buildUrl(endpoint, params)

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
              if (typeof window !== 'undefined') window.location.replace('/auth/login')
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
              if (typeof window !== 'undefined') window.location.replace('/auth/login')
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

  async get<T>(endpoint: string, options: { cache?: boolean; cacheTTL?: number; params?: Record<string, any> } = {}): Promise<APIResponse<T>> {
    const { cache = true, cacheTTL, params } = options

    if (cache) {
      const cacheKey = requestCache.generateKey(endpoint + JSON.stringify(params || {}), 'GET')
      const cachedData = requestCache.get<T>(cacheKey)
      if (cachedData) return cachedData

      const pendingRequest = requestCache.getPending<T>(cacheKey)
      if (pendingRequest) return pendingRequest

      const requestPromise = this.request<T>(endpoint, { method: 'GET', params })
      requestCache.setPending(cacheKey, requestPromise)
      const response = await requestPromise
      requestCache.set(cacheKey, response, cacheTTL)

      return response
    }

    return this.request<T>(endpoint, { method: 'GET', params })
  }

  async post<T>(endpoint: string, data?: unknown, options: { invalidateCache?: string } = {}): Promise<APIResponse<T>> {
    const response = await this.request<T>(endpoint, { method: 'POST', body: data })
    if (options.invalidateCache) requestCache.invalidate(options.invalidateCache)
    return response
  }

  async put<T>(endpoint: string, data?: unknown, options: { invalidateCache?: string; params?: Record<string, any> } = {}): Promise<APIResponse<T>> {
    const { invalidateCache, params } = options
    const response = await this.request<T>(endpoint, { method: 'PUT', body: data, params })
    if (invalidateCache) requestCache.invalidate(invalidateCache)
    return response
  }

  async patch<T>(endpoint: string, data?: unknown, options: { invalidateCache?: string } = {}): Promise<APIResponse<T>> {
    const response = await this.request<T>(endpoint, { method: 'PATCH', body: data })
    if (options.invalidateCache) requestCache.invalidate(options.invalidateCache)
    return response
  }

  async delete<T>(endpoint: string, options: { invalidateCache?: string } = {}): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const token = localStorage.getItem('authToken')
    const requestHeaders: Record<string, string> = {}
    if (token) requestHeaders['Authorization'] = `Bearer ${token}`

    console.log('DELETE Request:', { url, method: 'DELETE', headers: requestHeaders })

    const init: RequestInit = { method: 'DELETE', headers: requestHeaders }

    let lastError: ApiError | null = null
    for (let attempt = 0; attempt <= this.defaultRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, init, this.defaultTimeout)
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
              if (typeof window !== 'undefined') window.location.replace('/auth/login')
            } catch {}
          }
          const error = this.parseErrorResponse(data, response.status)
          console.error('DELETE request failed:', { url, status: response.status, data, error })
          if (this.isRetryableError(response.status) && attempt < this.defaultRetries) {
            lastError = error
            await this.sleep(this.defaultRetryDelay * Math.pow(2, attempt))
            continue
          }
          throw error
        }

        if (data.isSuccess !== undefined) {
          if (!data.isSuccess) {
            console.error('DELETE request returned isSuccess=false:', { url, data })
            const error = this.parseErrorResponse(data, response.status)
            throw error
          }
          if (options.invalidateCache) requestCache.invalidate(options.invalidateCache)
          return data as APIResponse<T>
        }
        if (options.invalidateCache) requestCache.invalidate(options.invalidateCache)
        return { isSuccess: true, statusCode: response.status, message: 'Success', data: data as T }
      } catch (error) {
        if (error && typeof error === 'object' && 'status' in error) {
          const apiError = error as ApiError
          if (apiError.status === 401) {
            try {
              localStorage.removeItem('authToken')
              localStorage.removeItem('refreshToken')
              localStorage.removeItem('currentUser')
              if (typeof window !== 'undefined') window.location.replace('/auth/login')
            } catch {}
          }
          if (this.isRetryableError(apiError.status) && attempt < this.defaultRetries) {
            lastError = apiError
            await this.sleep(this.defaultRetryDelay * Math.pow(2, attempt))
            continue
          }
          throw apiError
        }
        const networkError: ApiError = { message: error instanceof Error ? error.message : 'Network error occurred', status: 0, errors: ['Unable to connect to server'] }
        if (attempt < this.defaultRetries) {
          lastError = networkError
          await this.sleep(this.defaultRetryDelay * Math.pow(2, attempt))
          continue
        }
        throw networkError
      }
    }
    throw lastError || { message: 'Request failed after multiple attempts', status: 0, errors: ['Maximum retry attempts exceeded'] }
  }

  clearCache(pattern?: string): void {
    requestCache.invalidate(pattern)
  }
}

export const httpClient = new HttpClient(API_BASE_URL)
export { HttpClient }

export async function http<TResponse>(url: string, options: HttpRequestOptions = {}): Promise<TResponse> {
  const { method = 'GET', headers = {}, body, params } = options

  const finalUrl = new URL(url)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) finalUrl.searchParams.append(k, String(v))
    })
  }

  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (body !== undefined) init.body = JSON.stringify(body)

  const res = await fetch(finalUrl.toString(), init)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed with ${res.status}`)
  }
  return (await res.json()) as TResponse
}
