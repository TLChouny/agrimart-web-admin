import * as signalR from '@microsoft/signalr'
import { API_BASE_URL } from './constants/apiConstants'

// Hub path align với client web: sử dụng messaging-service thay vì auction-service
const SIGNALR_HUB_URL =
  import.meta.env.VITE_SIGNALR_HUB_URL ??
  `${API_BASE_URL.replace(/\/+$/, '')}/api/messaging-service/hubs/global`

export type BidPlacedEvent = {
  auctionId: string
  bidId: string
  userId: string
  userName: string
  bidAmount: number
  previousPrice: number
  newPrice: number
  placedAt: string
}

export type BuyNowEvent = {
  auctionId: string
  bidId: string
  userId: string
  userName: string
  buyNowPrice: number
  purchasedAt: string
}

export type NewNotificationEvent = {
  id: string
  userId: string
  type: string
  title: string
  message: string
  createdAt: string
  data?: unknown
  relatedEntityId?: string
}

export type SystemNotificationEvent = {
  type: string
  content: string
  timestamp: string
}

type AuctionRealtimeEvents = {
  bidPlaced: (event: BidPlacedEvent) => void
  buyNow: (event: BuyNowEvent) => void
  newNotification?: (event: NewNotificationEvent) => void
  systemNotification?: (event: SystemNotificationEvent) => void
}

class SignalRService {
  private connection: signalR.HubConnection | null = null
  private currentAuctionId: string | null = null
  private isConnecting = false
  private handlers: Partial<AuctionRealtimeEvents> = {}
  // Track processed events to prevent duplicates
  private lastProcessedBidId: string | null = null
  private lastProcessedBidTime: number = 0
  private lastProcessedBuyNowId: string | null = null
  private lastProcessedBuyNowTime: number = 0

  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('authToken')
  }

  async connect(auctionId: string, handlers: Partial<AuctionRealtimeEvents>): Promise<void> {
    // If already connected to this auction, just update handlers
    if (this.connection && this.currentAuctionId === auctionId) {
      this.handlers = handlers
      this.registerHandlers()
      return
    }

    // If another connection exists, stop it first
    if (this.connection) {
      await this.disconnect()
    }

    const token = this.getToken()
    if (!token) {
      console.warn('[SignalR] No auth token found, cannot connect')
      return
    }

    this.currentAuctionId = auctionId
    this.isConnecting = true
    this.handlers = handlers

    console.log('[SignalR] Connecting to hub:', SIGNALR_HUB_URL, 'for auction:', auctionId)

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL, {
        // Dùng LongPolling cho chắc chắn qua gateway/proxy (trùng cách triển khai agrimart-web)
        transport: signalR.HttpTransportType.LongPolling,
        accessTokenFactory: () => token ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Information)
      .build()

    this.registerHandlers()

    this.connection.onreconnected(() => {
      console.log('[SignalR] Reconnected, resubscribing to auction:', this.currentAuctionId)
      if (this.currentAuctionId) {
        this.subscribeToAuction(this.currentAuctionId).catch(console.error)
      }
    })

    try {
      await this.connection.start()
      console.log('[SignalR] Connected successfully')
      await this.subscribeToAuction(auctionId)
    } catch (error) {
      console.error('[SignalR] Failed to connect to hub:', error)
      console.error('[SignalR] Hub URL was:', SIGNALR_HUB_URL)
      console.error('[SignalR] Error details:', error instanceof Error ? error.message : String(error))
      throw error
    } finally {
      this.isConnecting = false
    }
  }

  private registerHandlers(): void {
    if (!this.connection) return

    // Unregister old handlers to avoid duplicates
    this.connection.off('BidPlaced')
    this.connection.off('bidplaced')
    this.connection.off('BuyNow')
    this.connection.off('buynow')
    this.connection.off('NewNotification')
    this.connection.off('SystemNotification')

    // Register BidPlaced event (both uppercase and lowercase)
    // Use class-level flags to prevent duplicate calls if both events fire
    if (this.handlers.bidPlaced) {
      const handleBidPlaced = (payload: BidPlacedEvent) => {
        // Prevent duplicate calls within 200ms (same bid from different event names)
        const now = Date.now()
        if (this.lastProcessedBidId === payload.bidId && (now - this.lastProcessedBidTime) < 200) {
          console.log('[SignalR] Duplicate BidPlaced event ignored:', payload.bidId, 'Time diff:', now - this.lastProcessedBidTime, 'ms')
          return
        }
        this.lastProcessedBidId = payload.bidId
        this.lastProcessedBidTime = now
        console.log('[SignalR] Received BidPlaced event:', payload)
        this.handlers.bidPlaced?.(payload)
      }
      
      this.connection.on('BidPlaced', handleBidPlaced)
      // Also register lowercase version (but use same handler to prevent duplicates)
      this.connection.on('bidplaced', handleBidPlaced)
    }

    // Register BuyNow event (both uppercase and lowercase)
    // Use class-level flags to prevent duplicate calls if both events fire
    if (this.handlers.buyNow) {
      const handleBuyNow = (payload: BuyNowEvent) => {
        // Prevent duplicate calls within 200ms (same buy now from different event names)
        const now = Date.now()
        if (this.lastProcessedBuyNowId === payload.bidId && (now - this.lastProcessedBuyNowTime) < 200) {
          console.log('[SignalR] Duplicate BuyNow event ignored:', payload.bidId, 'Time diff:', now - this.lastProcessedBuyNowTime, 'ms')
          return
        }
        this.lastProcessedBuyNowId = payload.bidId
        this.lastProcessedBuyNowTime = now
        console.log('[SignalR] Received BuyNow event:', payload)
        this.handlers.buyNow?.(payload)
      }
      
      this.connection.on('BuyNow', handleBuyNow)
      // Also register lowercase version (but use same handler to prevent duplicates)
      this.connection.on('buynow', handleBuyNow)
    }

    // Register notification events
    if (this.handlers.newNotification) {
      this.connection.on('NewNotification', (payload: NewNotificationEvent) => {
        console.log('[SignalR] Received NewNotification event:', payload)
        this.handlers.newNotification?.(payload)
      })
    }

    if (this.handlers.systemNotification) {
      this.connection.on('SystemNotification', (payload: SystemNotificationEvent) => {
        console.log('[SignalR] Received SystemNotification event:', payload)
        this.handlers.systemNotification?.(payload)
      })
    }
  }

  private async subscribeToAuction(auctionId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.warn('[SignalR] Cannot subscribe: connection not ready')
      return
    }

    try {
      console.log('[SignalR] Subscribing to auction group:', auctionId)
      await this.connection.invoke('JoinAuctionGroup', auctionId)
      console.log('[SignalR] Successfully subscribed to auction:', auctionId)
    } catch (error) {
      console.error('[SignalR] Failed to subscribe to auction:', error)
      // Don't throw - connection might still work without explicit group join
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnecting) {
      // Avoid stopping while starting
      return
    }

    if (this.connection) {
      try {
        await this.connection.stop()
        console.log('[SignalR] Disconnected')
      } catch (error) {
        console.error('[SignalR] Failed to stop connection:', error)
      } finally {
        this.connection = null
        this.currentAuctionId = null
        this.handlers = {}
        // Reset duplicate prevention flags
        this.lastProcessedBidId = null
        this.lastProcessedBidTime = 0
        this.lastProcessedBuyNowId = null
        this.lastProcessedBuyNowTime = 0
      }
    }
  }

  // Legacy methods for backward compatibility
  async joinGroup(_groupName: string): Promise<void> {
    // This is now handled by connect() method
    console.log('[SignalR] joinGroup called (legacy), use connect() instead')
  }

  async leaveGroup(_groupName: string): Promise<void> {
    // This is now handled by disconnect() method
    console.log('[SignalR] leaveGroup called (legacy), use disconnect() instead')
  }

  // Legacy on() method for backward compatibility - but prefer using connect() directly
  on<K extends 'BidPlaced' | 'BuyNow' | 'NewNotification' | 'SystemNotification'>(
    event: K,
    handler: K extends 'BidPlaced'
      ? (payload: BidPlacedEvent) => void
      : K extends 'BuyNow'
      ? (payload: BuyNowEvent) => void
      : K extends 'NewNotification'
      ? (payload: NewNotificationEvent) => void
      : (payload: SystemNotificationEvent) => void
  ): () => void {
    console.warn('[SignalR] Using legacy on() method. Consider using connect() instead.')
    
    // For backward compatibility, store handler but recommend using connect()
    if (event === 'BidPlaced') {
      this.handlers.bidPlaced = handler as (event: BidPlacedEvent) => void
    } else if (event === 'BuyNow') {
      this.handlers.buyNow = handler as (event: BuyNowEvent) => void
    } else if (event === 'NewNotification') {
      this.handlers.newNotification = handler as (event: NewNotificationEvent) => void
    } else if (event === 'SystemNotification') {
      this.handlers.systemNotification = handler as (event: SystemNotificationEvent) => void
    }

    return () => {
      if (event === 'BidPlaced') {
        delete this.handlers.bidPlaced
      } else if (event === 'BuyNow') {
        delete this.handlers.buyNow
      } else if (event === 'NewNotification') {
        delete this.handlers.newNotification
      } else if (event === 'SystemNotification') {
        delete this.handlers.systemNotification
      }
    }
  }

  off<K extends 'BidPlaced' | 'BuyNow' | 'NewNotification' | 'SystemNotification'>(
    event: K,
    _handler: any
  ): void {
    // Remove handler
    if (event === 'BidPlaced') {
      delete this.handlers.bidPlaced
    } else if (event === 'BuyNow') {
      delete this.handlers.buyNow
    }
  }
}

export const signalRService = new SignalRService()
