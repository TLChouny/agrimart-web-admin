import { useEffect, useState, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import type { AdminNotification, AdminNotificationType, AdminNotificationSeverity } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE_URL } from '../services/constants/apiConstants'
import { adminAuthService } from '../services/adminAuthService'

const SIGNALR_HUB_URL = `${API_BASE_URL}/api/messaging-service/hubs/global`

// Helper: check if token expired (pure function to avoid adding hooks)
const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''))
    if (!payload.exp) return false
    const nowInSeconds = Math.floor(Date.now() / 1000)
    // Add small leeway to avoid racing the expiry
    return payload.exp - 30 <= nowInSeconds
  } catch {
    // If parsing fails, treat token as invalid to force a refresh
    return true
  }
}

// Admin notification type methods - the events SignalR will broadcast
const ADMIN_NOTIFICATION_METHODS = [
  'accountpendingapproval',
  'certificationpendingapproval',
  'auctionpendingapproval',
  'withdrawrequestpending',
  'disputepending',
  'wallettransfer',
  'systemnotification',
  // Also listen to these generic events
  'ReceiveNotification',
  'NewNotification',
  'AdminNotification',
] as const

// Map backend notification type to frontend type
const mapNotificationType = (backendType: string | number): AdminNotificationType => {
  const typeStr = String(backendType).toLowerCase()
  
  if (typeStr.includes('account') || typeStr.includes('user') || typeStr === '0') {
    return 'account_pending'
  }
  if (typeStr.includes('certification') || typeStr.includes('cert') || typeStr === '1') {
    return 'certification_pending'
  }
  if (typeStr.includes('auction') || typeStr === '2') {
    return 'auction_pending'
  }
  if (typeStr.includes('withdraw') || typeStr === '3') {
    return 'withdraw_pending'
  }
  if (typeStr.includes('dispute') || typeStr === '4') {
    return 'dispute_pending'
  }
  if (typeStr.includes('wallet') || typeStr.includes('transfer') || typeStr.includes('funds') || typeStr === '5') {
    return 'wallet_transfer'
  }
  return 'system'
}

// Map notification severity
const mapSeverity = (severity: string | number | undefined): AdminNotificationSeverity => {
  if (severity === undefined) return 'info'
  const sevStr = String(severity).toLowerCase()
  
  if (sevStr === 'success' || sevStr === '0') return 'success'
  if (sevStr === 'warning' || sevStr === '1') return 'warning'
  if (sevStr === 'error' || sevStr === '2') return 'error'
  return 'info'
}

// Normalize notification from backend format
const normalizeNotification = (data: unknown): AdminNotification | null => {
  if (!data || typeof data !== 'object') {
    return null
  }

  const raw = data as Record<string, unknown>
  
  // Backend may send with PascalCase or camelCase - normalize both
  const rawType = raw.type ?? raw.Type ?? raw.TYPE ?? 'system'
  const rawSeverity = raw.severity ?? raw.Severity ?? raw.SEVERITY
  const normalized: Partial<AdminNotification> = {
    id: (raw.id || raw.Id || raw.ID) as string,
    type: mapNotificationType(rawType as string | number),
    severity: mapSeverity(rawSeverity as string | number | undefined),
    title: (raw.title || raw.Title || raw.TITLE || 'Thông báo mới') as string,
    message: (raw.message || raw.Message || raw.MESSAGE || raw.content || raw.Content || '') as string,
    isRead: raw.isRead !== undefined ? (raw.isRead as boolean) : (raw.IsRead as boolean) ?? false,
    readAt: (raw.readAt || raw.ReadAt || raw.READ_AT) as string | null,
    data: (raw.data || raw.Data || raw.DATA) as Record<string, unknown> | undefined,
    relatedEntityId: (raw.relatedEntityId || raw.RelatedEntityId || raw.RELATED_ENTITY_ID) as string | undefined,
    relatedEntityType: (raw.relatedEntityType || raw.RelatedEntityType || raw.RELATED_ENTITY_TYPE) as string | undefined,
    createdAt: (raw.createdAt || raw.CreatedAt || raw.CREATED_AT || new Date().toISOString()) as string,
  }

  // Generate ID if missing
  if (!normalized.id) {
    normalized.id = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Validate required fields
  if (!normalized.title || !normalized.message) {
    console.warn('[useAdminNotifications] Notification missing required fields:', raw)
    return null
  }

  return normalized as AdminNotification
}

interface UseAdminNotificationsReturn {
  connection: signalR.HubConnection | null
  isConnected: boolean
  unreadCount: number
  notifications: AdminNotification[]
  refreshUnreadCount: () => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
}

export function useAdminNotifications(
  onNewNotification?: (notification: AdminNotification) => void
): UseAdminNotificationsReturn {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const { user } = useAuth()
  
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

  // Get access token from localStorage
  const getAccessToken = useCallback((): string | null => {
    return localStorage.getItem('authToken')
  }, [])

  // Initialize SignalR connection
  useEffect(() => {
    // Chỉ connect khi đã có user id (role đã được backend validate là admin khi login)
    if (!user?.id) {
      const currentConnection = connectionRef.current
      if (currentConnection) {
        currentConnection.stop().catch(console.error)
        setConnection(null)
        setIsConnected(false)
        connectionRef.current = null
      }
      isConnectingRef.current = false
      return
    }

    // Check if we already have a connection
    const currentConnection = connectionRef.current
    if (currentConnection) {
      if (
        currentConnection.state === signalR.HubConnectionState.Connected ||
        currentConnection.state === signalR.HubConnectionState.Connecting ||
        isConnectingRef.current
      ) {
        console.log('[useAdminNotifications] Connection already exists')
        return
      }
      if (currentConnection.state === signalR.HubConnectionState.Disconnected) {
        currentConnection.stop().catch(console.error)
        connectionRef.current = null
      }
    }

    if (isConnectingRef.current) {
      return
    }

    isConnectingRef.current = true

    const connectWithToken = async () => {
      try {
        if (!isMountedRef.current) {
          isConnectingRef.current = false
          return
        }

        // Lấy token hiện tại từ localStorage
        let currentToken = getAccessToken()

        // Nếu token hết hạn hoặc không có, thử refresh qua adminAuthService
        if (isTokenExpired(currentToken)) {
          console.log('[useAdminNotifications] Token expired, refreshing before connection...')
          const refreshedToken = await adminAuthService.refreshToken()
          if (refreshedToken) {
            currentToken = refreshedToken
            console.log('[useAdminNotifications] Token refreshed successfully before SignalR connection')
          } else {
            console.error('[useAdminNotifications] Failed to refresh token before SignalR connection')
            isConnectingRef.current = false
            return
          }
        }

        if (!currentToken) {
          console.warn('[useAdminNotifications] No auth token available')
          isConnectingRef.current = false
          return
        }

        console.log('[useAdminNotifications] Connecting to SignalR hub:', SIGNALR_HUB_URL)

        const newConnection = new signalR.HubConnectionBuilder()
          .withUrl(SIGNALR_HUB_URL, {
            transport: signalR.HttpTransportType.LongPolling,
            // accessTokenFactory: luôn lấy token mới nhất, tự refresh khi cần
            accessTokenFactory: async () => {
              let latestToken = getAccessToken()

              // Nếu token hết hạn hoặc không có, thử refresh
              if (isTokenExpired(latestToken)) {
                console.log('[useAdminNotifications] Token expired during connection, refreshing...')
                const newToken = await adminAuthService.refreshToken()
                if (newToken) {
                  latestToken = newToken
                  console.log('[useAdminNotifications] Token refreshed during SignalR connection lifecycle')
                } else {
                  console.error('[useAdminNotifications] Failed to refresh token during SignalR connection')
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

        // Generic handler for all notifications
        const handleNotification = (notificationData: unknown) => {
          const notification = normalizeNotification(notificationData)
          
          if (!notification) {
            return
          }

          // Prevent duplicate processing
          if (processedNotificationIdsRef.current.has(notification.id)) {
            return
          }
          processedNotificationIdsRef.current.add(notification.id)

          console.log('[useAdminNotifications] New notification:', notification)

          // Add to notifications list
          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === notification.id)
            if (exists) return prev
            return [notification, ...prev].slice(0, 50) // Keep max 50 notifications
          })

          // Update unread count
          if (!notification.isRead) {
            setUnreadCount((prev) => prev + 1)
          }

          // Call callback if provided
          if (onNewNotificationRef.current) {
            onNewNotificationRef.current(notification)
          }
        }

        // Register handlers for each notification method
        ADMIN_NOTIFICATION_METHODS.forEach((methodName) => {
          newConnection.on(methodName, (data: unknown) => {
            let notificationData: unknown
            if (typeof data === 'string') {
              try {
                notificationData = JSON.parse(data)
              } catch {
                console.warn(`[useAdminNotifications] Failed to parse notification from ${methodName}`)
                return
              }
            } else {
              notificationData = data
            }
            handleNotification(notificationData)
          })
        })

        // Lifecycle events
        newConnection.onreconnecting((error) => {
          console.log('[useAdminNotifications] Reconnecting...', error)
          if (isMountedRef.current) {
            setIsConnected(false)
          }
        })

        newConnection.onreconnected((connectionId) => {
          console.log('[useAdminNotifications] Reconnected! Connection ID:', connectionId)
          if (isMountedRef.current) {
            setIsConnected(true)
            // Try to join admin group after reconnect
            newConnection.invoke('JoinAdminGroup').catch(() => {
              // Silently ignore if method doesn't exist
            })
          }
        })

        newConnection.onclose((error) => {
          if (error) {
            console.warn('[useAdminNotifications] Connection closed with error:', error)
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

        console.log('[useAdminNotifications] Connected!')
        setIsConnected(true)

        // Try to join admin notification group
        try {
          await newConnection.invoke('JoinAdminGroup')
          console.log('[useAdminNotifications] Joined admin group')
        } catch {
          // Method might not exist, that's OK
          console.log('[useAdminNotifications] JoinAdminGroup method not available')
        }

        // Try to get initial unread count
        try {
          const count = await newConnection.invoke<number>('GetAdminUnreadCount')
          if (typeof count === 'number' && isMountedRef.current) {
            setUnreadCount(count)
          }
        } catch {
          // Method might not exist
        }

        if (isMountedRef.current) {
          setConnection(newConnection)
          connectionRef.current = newConnection
        } else {
          newConnection.stop().catch(console.error)
        }
      } catch (error) {
        console.error('[useAdminNotifications] Error connecting:', error)
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
  }, [user?.id, user?.role, getAccessToken])

  // Refresh unread count
  const refreshUnreadCount = useCallback(() => {
    const count = notifications.filter(n => !n.isRead).length
    setUnreadCount(count)
  }, [notifications])

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    )
    setUnreadCount(0)
  }, [])

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
    processedNotificationIdsRef.current.clear()
  }, [])

  return {
    connection,
    isConnected,
    unreadCount,
    notifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  }
}

