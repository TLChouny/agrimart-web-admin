import type { APIResponse } from '../../types/api'

interface CacheEntry<T> { data: APIResponse<T>; timestamp: number; expiresAt: number }
interface PendingRequest<T> { promise: Promise<APIResponse<T>>; timestamp: number }

export class RequestCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private pendingRequests: Map<string, PendingRequest<any>> = new Map()
  private defaultTTL = 5 * 60 * 1000
  private maxCacheSize = 100
  private cleanupInterval: number | null = null

  constructor() { this.startCleanup() }
  private startCleanup(): void { this.cleanupInterval = window.setInterval(() => { this.removeExpired() }, 60 * 1000) }
  private removeExpired(): void { const now = Date.now(); for (const [key, entry] of this.cache.entries()) { if (entry.expiresAt < now) this.cache.delete(key) } }
  private evictOldest(): void { if (this.cache.size >= this.maxCacheSize) { let oldestKey: string | null = null; let oldestTime = Infinity; for (const [key, entry] of this.cache.entries()) { if (entry.timestamp < oldestTime) { oldestTime = entry.timestamp; oldestKey = key } } if (oldestKey) this.cache.delete(oldestKey) } }
  generateKey(endpoint: string, method: string, body?: unknown): string { const bodyStr = body ? JSON.stringify(body) : ''; return `${method}:${endpoint}:${bodyStr}` }
  get<T>(key: string): APIResponse<T> | null { const entry = this.cache.get(key); if (!entry) return null; const now = Date.now(); if (entry.expiresAt < now) { this.cache.delete(key); return null } return entry.data }
  set<T>(key: string, data: APIResponse<T>, ttl: number = this.defaultTTL): void { this.evictOldest(); const now = Date.now(); this.cache.set(key, { data, timestamp: now, expiresAt: now + ttl }) }
  getPending<T>(key: string): Promise<APIResponse<T>> | null { const pending = this.pendingRequests.get(key); if (!pending) return null; const now = Date.now(); if (now - pending.timestamp > 30000) { this.pendingRequests.delete(key); return null } return pending.promise }
  setPending<T>(key: string, promise: Promise<APIResponse<T>>): void { this.pendingRequests.set(key, { promise, timestamp: Date.now() }); promise.finally(() => { this.pendingRequests.delete(key) }) }
  invalidate(pattern?: string): void { if (!pattern) { this.cache.clear(); return } for (const key of this.cache.keys()) { if (key.includes(pattern)) this.cache.delete(key) } }
  clear(): void { this.cache.clear(); this.pendingRequests.clear() }
  destroy(): void { if (this.cleanupInterval) { clearInterval(this.cleanupInterval); this.cleanupInterval = null } this.clear() }
}

export const requestCache = new RequestCache()

