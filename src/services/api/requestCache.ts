import type { APIResponse } from '../../types/api'

interface CacheEntry<T> { data: APIResponse<T>; timestamp: number; expiresAt: number }
interface PendingRequest<T> { promise: Promise<APIResponse<T>>; timestamp: number }

export class RequestCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private pendingRequests: Map<string, PendingRequest<any>> = new Map()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes
  private maxCacheSize = 100
  private cleanupInterval: number | null = null
  private readonly CLEANUP_INTERVAL = 60 * 1000 // 1 minute
  private readonly PENDING_TIMEOUT = 30 * 1000 // 30 seconds

  constructor() {
    if (typeof window !== 'undefined') {
      this.startCleanup()
    }
  }

  private startCleanup(): void {
    if (this.cleanupInterval) return
    this.cleanupInterval = window.setInterval(() => {
      this.removeExpired()
      this.cleanupPending()
    }, this.CLEANUP_INTERVAL)
  }

  private removeExpired(): void {
    const now = Date.now()
    const expiredKeys: string[] = []
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        expiredKeys.push(key)
      }
    }
    expiredKeys.forEach(key => this.cache.delete(key))
  }

  private cleanupPending(): void {
    const now = Date.now()
    const expiredKeys: string[] = []
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > this.PENDING_TIMEOUT) {
        expiredKeys.push(key)
      }
    }
    expiredKeys.forEach(key => this.pendingRequests.delete(key))
  }

  private evictOldest(): void {
    if (this.cache.size < this.maxCacheSize) return
    
    let oldestKey: string | null = null
    let oldestTime = Infinity
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  generateKey(endpoint: string, method: string, body?: unknown): string {
    const bodyStr = body ? JSON.stringify(body) : ''
    return `${method}:${endpoint}:${bodyStr}`
  }

  get<T>(key: string): APIResponse<T> | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const now = Date.now()
    if (entry.expiresAt < now) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }

  set<T>(key: string, data: APIResponse<T>, ttl: number = this.defaultTTL): void {
    this.evictOldest()
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    })
  }

  getPending<T>(key: string): Promise<APIResponse<T>> | null {
    const pending = this.pendingRequests.get(key)
    if (!pending) return null
    
    const now = Date.now()
    if (now - pending.timestamp > this.PENDING_TIMEOUT) {
      this.pendingRequests.delete(key)
      return null
    }
    return pending.promise
  }

  setPending<T>(key: string, promise: Promise<APIResponse<T>>): void {
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    })
    
    promise.finally(() => {
      this.pendingRequests.delete(key)
    })
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }
    
    const keysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingSize: this.pendingRequests.size,
      maxCacheSize: this.maxCacheSize
    }
  }
}

export const requestCache = new RequestCache()

