import { useEffect, useState, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import type { AdminNotification } from '../types'
import { adminAuthService } from '../services/adminAuthService'

// Admin User ID cố định theo guide
const ADMIN_USER_ID = '44444444-4444-4444-4444-444444444444'

// Hub URL theo guide
const SIGNALR_HUB_URL = '/globalhub'

// Interface cho notification từ SignalR theo guide
interface SignalRNotification {
  id: string
  userId: string
  type: number
  severity: number
  title: string
  message: string
  data: string // JSON string
  relatedEntityId: string
  relatedEntityType: string
  createdAt: string
  isRead: boolean
}

// Map notification type từ backend (number) sang frontend type
const mapNotificationType = (type: number, title: string): AdminNotification['type'] => {
  // Type 15: AuctionCreated
  if (type === 15) return 'auction_pending'
  
  // Type 17: WithdrawalRequested
  if (type === 17) return 'withdraw_pending'
  
  // Type 14: DistupeOpened
  if (type === 14) return 'dispute_pending'
  
  // Type 7: System - cần check title để phân biệt
  if (type === 7) {
    if (title === 'Tài khoản mới chờ duyệt') return 'account_pending'
    if (title === 'Chứng chỉ mới chờ duyệt') return 'certification_pending'
    return 'system'
  }
  
  return 'system'
}

// Map severity từ backend (number) sang frontend severity
const mapSeverity = (severity: number): AdminNotification['severity'] => {
  // 0: Success, 1: Info, 2: Warning, 3: Error
  if (severity === 0) return 'success'
  if (severity === 1) return 'info'
  if (severity === 2) return 'warning'
  if (severity === 3) return 'error'
  return 'info'
}

// Parse và normalize notification từ SignalR
const normalizeNotification = (signalRNotif: SignalRNotification): AdminNotification | null => {
  try {
    // Parse data JSON string
    let parsedData: Record<string, unknown> | undefined
    if (signalRNotif.data) {
      try {
        parsedData = JSON.parse(signalRNotif.data) as Record<string, unknown>
      } catch {
        // Nếu parse fail, giữ nguyên data
        parsedData = { raw: signalRNotif.data }
      }
    }

    const notification: AdminNotification = {
      id: signalRNotif.id,
      type: mapNotificationType(signalRNotif.type, signalRNotif.title),
      title: signalRNotif.title,
      message: signalRNotif.message,
      severity: mapSeverity(signalRNotif.severity),
      isRead: signalRNotif.isRead,
      relatedEntityId: signalRNotif.relatedEntityId || undefined,
      relatedEntityType: signalRNotif.relatedEntityType || undefined,
      data: parsedData,
      createdAt: signalRNotif.createdAt,
      readAt: signalRNotif.isRead ? signalRNotif.createdAt : null,
    }

    return notification
  } catch (error) {
    console.error('[useAdminSignalR] Error normalizing notification:', error)
    return null
  }
}

interface UseAdminSignalRReturn {
  connection: signalR.HubConnection | null
  isConnected: boolean
  pendingCounts: {
    auctions: number
    accounts: number
    certifications: number
    withdrawals: number
    disputes: number
  }
  notifications: AdminNotification[]
  getUnreadCount: () => Promise<number>
}

export function useAdminSignalR(
  onNewNotification?: (notification: AdminNotification) => void
): UseAdminSignalRReturn {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [pendingCounts, setPendingCounts] = useState({
    auctions: 0,
    accounts: 0,
    certifications: 0,
    withdrawals: 0,
    disputes: 0,
  })
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  
  const onNewNotificationRef = useRef(onNewNotification)
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const isConnectingRef = useRef(false)
  const isMountedRef = useRef(true)
  const processedNotificationIdsRef = useRef<Set<string>>(new Set())

  // Update ref when callback changes
  useEffect(() => {
    onNewNotificationRef.current = onNewNotification
  }, [onNewNotification])

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Get access token
  const getAccessToken = useCallback((): string | null => {
    // Theo guide, dùng adminToken hoặc authToken
    return localStorage.getItem('adminToken') || localStorage.getItem('authToken')
  }, [])

  // Check if token expired
  const isTokenExpired = useCallback((token: string | null): boolean => {
    if (!token) return true
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''))
      if (!payload.exp) return false
      const nowInSeconds = Math.floor(Date.now() / 1000)
      return payload.exp - 30 <= nowInSeconds
    } catch {
      return true
    }
  }, [])

  // Initialize SignalR connection
  useEffect(() => {
    // Check if already connecting or connected
    if (isConnectingRef.current || connectionRef.current) {
      return
    }

    isConnectingRef.current = true

    const connectWithToken = async () => {
      try {
        if (!isMountedRef.current) {
          isConnectingRef.current = false
          return
        }

        // Get current token
        let currentToken = getAccessToken()

        // Refresh token if expired
        if (isTokenExpired(currentToken)) {
          console.log('[useAdminSignalR] Token expired, refreshing...')
          const refreshedToken = await adminAuthService.refreshToken()
          if (refreshedToken) {
            currentToken = refreshedToken
            console.log('[useAdminSignalR] Token refreshed successfully')
          } else {
            console.error('[useAdminSignalR] Failed to refresh token')
            isConnectingRef.current = false
            return
          }
        }

        if (!currentToken) {
          console.warn('[useAdminSignalR] No auth token available')
          isConnectingRef.current = false
          return
        }

        console.log('[useAdminSignalR] Connecting to SignalR hub:', SIGNALR_HUB_URL)

        const newConnection = new signalR.HubConnectionBuilder()
          .withUrl(SIGNALR_HUB_URL, {
            accessTokenFactory: async () => {
              let latestToken = getAccessToken()

              // Refresh token if expired during connection
              if (isTokenExpired(latestToken)) {
                console.log('[useAdminSignalR] Token expired during connection, refreshing...')
                const newToken = await adminAuthService.refreshToken()
                if (newToken) {
                  latestToken = newToken
                } else {
                  throw new Error('Token refresh failed')
                }
              }

              if (!latestToken) {
                throw new Error('No token available')
              }

              return latestToken
            },
          })
          .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: (retryContext) => {
              if (retryContext.previousRetryCount === 0) return 0
              if (retryContext.previousRetryCount === 1) return 2000
              if (retryContext.previousRetryCount === 2) return 5000
              if (retryContext.previousRetryCount === 3) return 10000
              return 30000
            },
          })
          .configureLogging(signalR.LogLevel.Warning)
          .build()

        // Handler cho notification mới
        const handleNotification = (notification: SignalRNotification) => {
          // Chỉ xử lý notifications cho admin user
          if (notification.userId !== ADMIN_USER_ID) {
            return
          }

          // Prevent duplicate processing
          if (processedNotificationIdsRef.current.has(notification.id)) {
            return
          }
          processedNotificationIdsRef.current.add(notification.id)

          const normalized = normalizeNotification(notification)
          if (!normalized) {
            return
          }

          console.log('[useAdminSignalR] New notification:', normalized)

          // Add to notifications list
          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === normalized.id)
            if (exists) return prev
            return [normalized, ...prev].slice(0, 50) // Keep max 50
          })

          // Update pending counts
          if (!normalized.isRead) {
            setPendingCounts((prev) => {
              const newCounts = { ...prev }
              switch (normalized.type) {
                case 'auction_pending':
                  newCounts.auctions += 1
                  break
                case 'account_pending':
                  newCounts.accounts += 1
                  break
                case 'certification_pending':
                  newCounts.certifications += 1
                  break
                case 'withdraw_pending':
                  newCounts.withdrawals += 1
                  break
                case 'dispute_pending':
                  newCounts.disputes += 1
                  break
              }
              return newCounts
            })
          }

          // Call callback if provided
          if (onNewNotificationRef.current) {
            onNewNotificationRef.current(normalized)
          }
        }

        // Register handlers theo guide
        // 1. AuctionCreated (Type: 15)
        newConnection.on('AuctionCreated', (notification: SignalRNotification) => {
          handleNotification(notification)
        })

        // 2. System (Type: 7) - có thể là account, certification, hoặc confirmation
        newConnection.on('System', (notification: SignalRNotification) => {
          handleNotification(notification)
        })

        // 3. WithdrawalRequested (Type: 17)
        newConnection.on('WithdrawalRequested', (notification: SignalRNotification) => {
          handleNotification(notification)
        })

        // 4. DistupeOpened (Type: 14) - Note: guide có typo "DistupeOpened"
        newConnection.on('DistupeOpened', (notification: SignalRNotification) => {
          handleNotification(notification)
        })

        // Lifecycle events
        newConnection.onreconnecting((error) => {
          console.log('[useAdminSignalR] Reconnecting...', error)
          if (isMountedRef.current) {
            setIsConnected(false)
          }
        })

        newConnection.onreconnected((connectionId) => {
          console.log('[useAdminSignalR] Reconnected! Connection ID:', connectionId)
          if (isMountedRef.current) {
            setIsConnected(true)
          }
        })

        newConnection.onclose((error) => {
          if (error) {
            console.warn('[useAdminSignalR] Connection closed with error:', error)
          }
          if (isMountedRef.current) {
            setIsConnected(false)
          }
        })

        // Start connection
        await newConnection.start()

        if (!isMountedRef.current) {
          newConnection.stop().catch(console.error)
          isConnectingRef.current = false
          return
        }

        console.log('[useAdminSignalR] Connected!')
        setIsConnected(true)

        // Try to get initial unread count
        try {
          const count = await newConnection.invoke<number>('GetUnreadNotificationCount')
          if (typeof count === 'number' && isMountedRef.current) {
            // Update counts based on notifications
            // Note: Backend should return count, but we'll also track locally
          }
        } catch {
          // Method might not exist, that's OK
        }

        if (isMountedRef.current) {
          setConnection(newConnection)
          connectionRef.current = newConnection
        } else {
          newConnection.stop().catch(console.error)
        }
      } catch (error) {
        console.error('[useAdminSignalR] Error connecting:', error)
      } finally {
        isConnectingRef.current = false
      }
    }

    connectWithToken()

    return () => {
      isMountedRef.current = false
      isConnectingRef.current = false
      const currentConnection = connectionRef.current
      if (currentConnection) {
        currentConnection.stop().catch(console.error)
      }
      connectionRef.current = null
      setConnection(null)
      setIsConnected(false)
    }
  }, [getAccessToken, isTokenExpired])

  // Get unread count
  const getUnreadCount = useCallback(async (): Promise<number> => {
    if (connection && isConnected) {
      try {
        const count = await connection.invoke<number>('GetUnreadNotificationCount')
        return typeof count === 'number' ? count : 0
      } catch {
        // Fallback to local count
        return notifications.filter((n) => !n.isRead).length
      }
    }
    return notifications.filter((n) => !n.isRead).length
  }, [connection, isConnected, notifications])

  return {
    connection,
    isConnected,
    pendingCounts,
    notifications,
    getUnreadCount,
  }
}

