import { useEffect, useState, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import type { AdminNotification, AdminNotificationType, AdminNotificationSeverity } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE_URL } from '../services/constants/apiConstants'
import { adminAuthService } from '../services/adminAuthService'

// Admin User ID cố định theo guide
const ADMIN_USER_ID = '44444444-4444-4444-4444-444444444444'

// Hub URL - Backend thực tế dùng /api/messaging-service/hubs/global (giống signalrService.ts và agrimart-web)
// Guide nói /globalhub nhưng có thể đã cũ hoặc backend đã thay đổi
const SIGNALR_HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || 
  `${API_BASE_URL.replace(/\/+$/, '')}/api/messaging-service/hubs/global`

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

// Admin notification type methods - the events SignalR will broadcast theo guide
// Events theo guide: AuctionCreated, System, WithdrawalRequested, DistupeOpened (typo) / DisputeOpened (sửa)
const ADMIN_NOTIFICATION_METHODS = [
  // Events theo guide
  'AuctionCreated',      // Type: 15 - Phiên đấu giá mới cần duyệt
  'System',              // Type: 7 - Tài khoản/chứng chỉ mới hoặc xác nhận
  'WithdrawalRequested', // Type: 17 - Yêu cầu rút tiền mới
  'DistupeOpened',       // Type: 14 - Tranh chấp mới (note: typo trong guide)
  'DisputeOpened',       // Type: 14 - Tranh chấp mới (tên đúng)
  'disputeopened',       // Thêm lowercase phòng backend gửi lowercase
  // Legacy events (backward compatibility)
  'accountpendingapproval',
  'certificationpendingapproval',
  'auctionpendingapproval',
  'withdrawrequestpending',
  'disputepending',
  'wallettransfer',
  'systemnotification',
  'ReceiveNotification',
  'NewNotification',
  'AdminNotification',
] as const

// Map backend notification type to frontend type
// Theo guide: Type 15 = AuctionCreated, Type 7 = System, Type 17 = WithdrawalRequested, Type 14 = DistupeOpened
const mapNotificationType = (backendType: string | number, title?: string): AdminNotificationType => {
  const typeNum = typeof backendType === 'number' ? backendType : parseInt(String(backendType), 10)
  const typeStr = String(backendType).toLowerCase()
  const titleStr = (title || '').toLowerCase()
  
  // Type 15: AuctionCreated
  if (typeNum === 15 || typeStr.includes('auction')) {
    return 'auction_pending'
  }
  
  // Type 17: WithdrawalRequested
  if (typeNum === 17 || typeStr.includes('withdraw')) {
    return 'withdraw_pending'
  }
  
  // Type 14: DistupeOpened
  if (typeNum === 14 || typeStr.includes('dispute')) {
    return 'dispute_pending'
  }
  
  // Type 7: System - cần check title để phân biệt
  if (typeNum === 7 || typeStr.includes('system')) {
    if (titleStr.includes('tài khoản') || titleStr.includes('account') || titleStr.includes('user')) {
      return 'account_pending'
    }
    if (titleStr.includes('chứng chỉ') || titleStr.includes('certification') || titleStr.includes('cert')) {
      return 'certification_pending'
    }
    return 'system'
  }
  
  // Legacy mapping
  if (typeStr.includes('account') || typeStr.includes('user') || typeNum === 0) {
    return 'account_pending'
  }
  if (typeStr.includes('certification') || typeStr.includes('cert') || typeNum === 1) {
    return 'certification_pending'
  }
  if (typeStr.includes('wallet') || typeStr.includes('transfer') || typeStr.includes('funds') || typeNum === 5) {
    return 'wallet_transfer'
  }
  
  return 'system'
}

// Map notification severity
// Theo guide: 0 = Success, 1 = Info, 2 = Warning, 3 = Error
const mapSeverity = (severity: string | number | undefined): AdminNotificationSeverity => {
  if (severity === undefined) return 'info'
  const sevNum = typeof severity === 'number' ? severity : parseInt(String(severity), 10)
  const sevStr = String(severity).toLowerCase()
  
  if (sevNum === 0 || sevStr === 'success') return 'success'
  if (sevNum === 1 || sevStr === 'info') return 'info'
  if (sevNum === 2 || sevStr === 'warning') return 'warning'
  if (sevNum === 3 || sevStr === 'error') return 'error'
  return 'info'
}

// Normalize notification from backend format
// Theo guide, notification có format:
// - data: string (JSON string cần parse)
// - userId: string (phải là ADMIN_USER_ID)
// - type: number (15, 7, 17, 14)
// - severity: number (0, 1, 2, 3)
const normalizeNotification = (data: unknown): AdminNotification | null => {
  if (!data || typeof data !== 'object') {
    return null
  }

  const raw = data as Record<string, unknown>
  
  // Backend may send with PascalCase or camelCase - normalize both
  const rawType = raw.type ?? raw.Type ?? raw.TYPE ?? 'system'
  const rawSeverity = raw.severity ?? raw.Severity ?? raw.SEVERITY
  const rawTitle = (raw.title || raw.Title || raw.TITLE || 'Thông báo mới') as string
  const rawMessage = (raw.message || raw.Message || raw.MESSAGE || raw.content || raw.Content || '') as string
  const rawData = raw.data || raw.Data || raw.DATA
  
  // Parse data nếu là JSON string (theo guide)
  let parsedData: Record<string, unknown> | undefined
  if (typeof rawData === 'string') {
    try {
      parsedData = JSON.parse(rawData) as Record<string, unknown>
    } catch {
      // Nếu không parse được, giữ nguyên
      parsedData = { raw: rawData }
    }
  } else if (rawData && typeof rawData === 'object') {
    parsedData = rawData as Record<string, unknown>
  }

  // Check userId - chỉ xử lý notifications cho admin
  // Theo guide, admin có userId cố định là ADMIN_USER_ID
  // Nhưng trong thực tế, backend có thể gửi notification với userId là ADMIN_USER_ID
  // hoặc có thể không có userId field (nếu đã filter ở backend)
  // Vì admin đã được filter ở SignalR hub (chỉ admin mới nhận được notifications này),
  // nên ta có thể bỏ qua check userId hoặc chỉ log để debug
  const rawUserId = (raw.userId || raw.UserId || raw.USER_ID) as string | undefined
  if (rawUserId && rawUserId !== ADMIN_USER_ID) {
    // Nếu có userId và không phải admin, log warning nhưng vẫn xử lý (có thể backend đã filter)
    console.warn('[useAdminNotifications] ⚠️ Notification userId mismatch:', rawUserId, 'Expected:', ADMIN_USER_ID, 'But processing anyway...')
    // Không return null - để xử lý notification vì có thể backend đã filter
  } else if (rawUserId === ADMIN_USER_ID) {
    console.log('[useAdminNotifications] ✅ Notification for admin user:', ADMIN_USER_ID)
  } else {
    console.log('[useAdminNotifications] ℹ️ No userId in notification, assuming it\'s for admin (backend filtered)')
  }
  // Tiếp tục xử lý notification

  const normalized: Partial<AdminNotification> = {
    id: (raw.id || raw.Id || raw.ID) as string,
    type: mapNotificationType(rawType as string | number, rawTitle),
    severity: mapSeverity(rawSeverity as string | number | undefined),
    title: rawTitle,
    message: rawMessage,
    isRead: raw.isRead !== undefined ? (raw.isRead as boolean) : (raw.IsRead as boolean) ?? false,
    readAt: (raw.readAt || raw.ReadAt || raw.READ_AT) as string | null,
    data: parsedData,
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
  // Theo guide, dùng adminToken hoặc authToken
  const getAccessToken = useCallback((): string | null => {
    return localStorage.getItem('adminToken') || localStorage.getItem('authToken')
  }, [])

  // Initialize SignalR connection
  useEffect(() => {
    console.log('[useAdminNotifications] 🔄 Effect triggered. User:', user?.id, 'Role:', user?.role)
    
    // Chỉ connect khi đã có user id (role đã được backend validate là admin khi login)
    if (!user?.id) {
      console.log('[useAdminNotifications] ⏸️ No user ID, skipping connection')
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

    // Kiểm tra xem user có phải admin không (theo guide, admin có ID cố định)
    // Nhưng trong thực tế, có thể admin có ID khác, chỉ cần role === 'admin'
    if (user?.role !== 'admin') {
      console.log('[useAdminNotifications] ⏸️ User is not admin, skipping connection. Role:', user?.role)
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

        console.log('[useAdminNotifications] 🔌 Connecting to SignalR hub:', SIGNALR_HUB_URL)
        console.log('[useAdminNotifications] API_BASE_URL:', API_BASE_URL)

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
          console.log('[useAdminNotifications] 🔔 Raw notification data received:', notificationData)
          const notification = normalizeNotification(notificationData)
          
          if (!notification) {
            console.warn('[useAdminNotifications] ⚠️ Failed to normalize notification:', notificationData)
            return
          }

          // Prevent duplicate processing
          if (processedNotificationIdsRef.current.has(notification.id)) {
            console.log('[useAdminNotifications] ⏭️ Duplicate notification ignored:', notification.id)
            return
          }
          processedNotificationIdsRef.current.add(notification.id)

          console.log('[useAdminNotifications] ✅ New notification processed:', {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            userId: (notificationData as any)?.userId,
          })

          // Add to notifications list
          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === notification.id)
            if (exists) {
              console.log('[useAdminNotifications] Notification already in list:', notification.id)
              return prev
            }
            console.log('[useAdminNotifications] Adding notification to list. Total:', prev.length + 1)
            return [notification, ...prev].slice(0, 50) // Keep max 50 notifications
          })

          // Update unread count
          if (!notification.isRead) {
            setUnreadCount((prev) => {
              const newCount = prev + 1
              console.log('[useAdminNotifications] Unread count updated:', newCount)
              return newCount
            })
          }

          // Call callback if provided - ĐẢM BẢO CALLBACK ĐƯỢC GỌI
          if (onNewNotificationRef.current) {
            console.log('[useAdminNotifications] ✅ Calling onNewNotification callback for notification:', notification.id)
            try {
              onNewNotificationRef.current(notification)
              console.log('[useAdminNotifications] ✅ Callback executed successfully')
            } catch (error) {
              console.error('[useAdminNotifications] ❌ Error in callback:', error)
            }
          } else {
            console.warn('[useAdminNotifications] ⚠️ No onNewNotification callback provided - toast sẽ không tự động hiển thị!')
          }
        }

        // Register handlers for each notification method
        console.log('[useAdminNotifications] Registering handlers for methods:', ADMIN_NOTIFICATION_METHODS)
        ADMIN_NOTIFICATION_METHODS.forEach((methodName) => {
          newConnection.on(methodName, (data: unknown) => {
            console.log(`[useAdminNotifications] Received event: ${methodName}`, data)
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
            // Theo guide, admin tự động join vào group user:44444444-4444-4444-4444-444444444444 khi connect thành công
            // Không cần gọi JoinAdminGroup
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
        console.log('[useAdminNotifications] Starting SignalR connection...')
        await newConnection.start()
        
        if (!isMountedRef.current) {
          newConnection.stop().catch(console.error)
          isConnectingRef.current = false
          return
        }

        console.log('[useAdminNotifications] ✅ Connected successfully! Connection ID:', newConnection.connectionId)
        console.log('[useAdminNotifications] Connection state:', newConnection.state)
        setIsConnected(true)

        // Theo guide, admin tự động join vào group user:44444444-4444-4444-4444-444444444444 khi connect thành công
        // Không cần gọi method nào để join group
        console.log('[useAdminNotifications] Admin should be auto-joined to group user:' + ADMIN_USER_ID)

        // Try to get initial unread count
        try {
          const count = await newConnection.invoke<number>('GetUnreadNotificationCount')
          console.log('[useAdminNotifications] Initial unread count:', count)
          if (typeof count === 'number' && isMountedRef.current) {
            setUnreadCount(count)
          }
        } catch (error) {
          console.log('[useAdminNotifications] GetUnreadNotificationCount method not available or error:', error)
        }

        if (isMountedRef.current) {
          setConnection(newConnection)
          connectionRef.current = newConnection
          
          // Expose connection to window for debugging (development only)
          if (import.meta.env.DEV) {
            ;(window as any).__signalRConnection = newConnection
            ;(window as any).__adminNotifications = {
              connection: newConnection,
              isConnected: true,
              notifications: notifications,
              getUnreadCount: async () => {
                try {
                  return await newConnection.invoke<number>('GetUnreadNotificationCount')
                } catch {
                  return notifications.filter((n) => !n.isRead).length
                }
              },
            }
            console.log('[useAdminNotifications] 🔧 Debug helpers available: window.__signalRConnection, window.__adminNotifications')
          }
        } else {
          newConnection.stop().catch(console.error)
        }
      } catch (error) {
        console.error('[useAdminNotifications] ❌ Error connecting to SignalR:', error)
        
        // Log chi tiết về lỗi để debug
        if (error instanceof Error) {
          console.error('[useAdminNotifications] Error message:', error.message)
          console.error('[useAdminNotifications] Error name:', error.name)
          
          // Kiểm tra nếu là lỗi 404
          if (error.message.includes('404') || error.message.includes('Not Found')) {
            console.error('[useAdminNotifications] ⚠️ Hub URL không đúng hoặc không tồn tại!')
            console.error('[useAdminNotifications] Hub URL đang dùng:', SIGNALR_HUB_URL)
            console.error('[useAdminNotifications] Vui lòng kiểm tra lại hub URL trong backend hoặc env variable VITE_SIGNALR_HUB_URL')
          }
        }
        
        // Set connection state để UI có thể hiển thị lỗi
        if (isMountedRef.current) {
          setIsConnected(false)
        }
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

