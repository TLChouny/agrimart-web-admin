import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Bell, CheckCheck, Loader2, User, Award, Gavel, Banknote, AlertTriangle, Wallet, Info } from 'lucide-react'
import { Button } from '../ui/button'
import { useAdminNotifications } from '../../hooks/useAdminNotifications'
import type { AdminNotification, AdminNotificationType } from '../../types'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { notificationApi } from '../../services/api/notificationApi'
import { userApi } from '../../services/api/userApi'
import { walletApi } from '../../services/api/walletApi'
import { ROUTES } from '../../constants'

// Icon mapping cho các loại thông báo
const NOTIFICATION_ICONS: Record<AdminNotificationType, React.ReactNode> = {
  account_pending: <User className="h-4 w-4 text-blue-500" />,
  certification_pending: <Award className="h-4 w-4 text-amber-500" />,
  auction_pending: <Gavel className="h-4 w-4 text-purple-500" />,
  withdraw_pending: <Banknote className="h-4 w-4 text-green-500" />,
  dispute_pending: <AlertTriangle className="h-4 w-4 text-red-500" />,
  wallet_transfer: <Wallet className="h-4 w-4 text-emerald-500" />,
  system: <Info className="h-4 w-4 text-gray-500" />,
}

// Background color mapping cho notification type
const NOTIFICATION_BG_COLORS: Record<AdminNotificationType, string> = {
  account_pending: 'bg-blue-50',
  certification_pending: 'bg-amber-50',
  auction_pending: 'bg-purple-50',
  withdraw_pending: 'bg-green-50',
  dispute_pending: 'bg-red-50',
  wallet_transfer: 'bg-emerald-50',
  system: 'bg-gray-50',
}

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Vừa xong'
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} phút trước`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} giờ trước`
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} ngày trước`
  }
  
  return date.toLocaleDateString('vi-VN')
}

// Get navigation route based on notification type & related entity
const getNotificationRoute = (notification: AdminNotification): string | null => {
  const { type, relatedEntityId, relatedEntityType } = notification
  const entityType = (relatedEntityType || '').toLowerCase()

  // Ưu tiên check notification type trước cho account và certification
  if (type === 'certification_pending') {
    return `${ROUTES.ADMIN_APPROVAL}?tab=certifications`
  }
  if (type === 'account_pending') {
    return ROUTES.ADMIN_APPROVAL
  }

  // Sau đó check relatedEntityType nếu có
  if (entityType.includes('auction')) {
    return relatedEntityId
      ? ROUTES.ADMIN_AUCTIONS_BY_ID.replace(':id', relatedEntityId)
      : ROUTES.ADMIN_AUCTIONS
  }

  if (entityType.includes('withdrawrequest') || entityType.includes('withdraw')) {
    return ROUTES.ADMIN_WALLET
  }

  if (entityType.includes('wallet')) {
    return ROUTES.ADMIN_WALLET
  }

  if (entityType.includes('dispute')) {
    return ROUTES.ADMIN_DISPUTES
  }

  if (entityType.includes('user') || entityType.includes('account')) {
    return ROUTES.ADMIN_APPROVAL
  }

  if (entityType.includes('certification') || entityType.includes('cert')) {
    return `${ROUTES.ADMIN_APPROVAL}?tab=certifications`
  }

  // Fallback theo notification type (account_pending và certification_pending đã được xử lý ở trên)
  switch (type) {
    case 'auction_pending':
      return relatedEntityId
        ? ROUTES.ADMIN_AUCTIONS_BY_ID.replace(':id', relatedEntityId)
        : ROUTES.ADMIN_AUCTIONS
    case 'withdraw_pending':
    case 'wallet_transfer':
      return ROUTES.ADMIN_WALLET
    case 'dispute_pending':
      return ROUTES.ADMIN_DISPUTES
    case 'system':
      return ROUTES.ADMIN_DASHBOARD
    default:
      return ROUTES.ADMIN_DASHBOARD
  }
}

export function AdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiNotifications, setApiNotifications] = useState<AdminNotification[]>([])
  const [apiUnreadCount, setApiUnreadCount] = useState(0)
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({})
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // UUID pattern để tìm userId trong message
  const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

  // Fetch user name từ userId
  const fetchUserName = useCallback(async (userId: string): Promise<string | null> => {
    if (userNamesMap[userId]) {
      return userNamesMap[userId]
    }

    try {
      const res = await userApi.getById(userId)
      if (res.isSuccess && res.data) {
        const userName = `${res.data.firstName} ${res.data.lastName}`.trim() || res.data.email
        setUserNamesMap(prev => ({ ...prev, [userId]: userName }))
        return userName
      }
    } catch (error) {
      console.error('[AdminNotificationBell] Error fetching user:', error)
    }
    return null
  }, [userNamesMap])

  // Fetch user name từ withdraw request
  const fetchUserNameFromWithdrawRequest = useCallback(async (withdrawRequestId: string): Promise<string | null> => {
    try {
      const res = await walletApi.getWithdrawRequestById(withdrawRequestId)
      if (res.isSuccess && res.data) {
        const userId = res.data.userId
        return await fetchUserName(userId)
      }
    } catch (error) {
      console.error('[AdminNotificationBell] Error fetching withdraw request:', error)
    }
    return null
  }, [fetchUserName])


  // Hook để quản lý notifications qua SignalR
  const {
    isConnected,
    unreadCount,
    notifications,
    markAsRead,
    markAllAsRead,
  } = useAdminNotifications((notification) => {
    // Callback khi có notification mới - có thể show toast/browser notification
    console.log('[AdminNotificationBell] New notification:', notification)
    
    // Show browser notification nếu được phép
    if ('Notification' in window && window.Notification.permission === 'granted') {
      try {
        const browserNotification = new window.Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        })
        
        setTimeout(() => {
          browserNotification.close()
        }, 5000)
      } catch (error) {
        console.error('[AdminNotificationBell] Browser notification error:', error)
      }
    }
  })

  // State để lưu formatted messages
  const [formattedMessages, setFormattedMessages] = useState<Record<string, string>>({})

  // Format messages khi notifications thay đổi
  useEffect(() => {
    const formatAllMessages = async () => {
      const allNotifications = [...apiNotifications, ...notifications]
      const newFormattedMessages: Record<string, string> = {}
      const userIdsToFetch = new Set<string>()

      // Tìm tất cả userIds cần fetch từ messages
      allNotifications.forEach(notification => {
        if (formattedMessages[notification.id]) {
          newFormattedMessages[notification.id] = formattedMessages[notification.id]
          return
        }

        const userIds = notification.message.match(UUID_PATTERN) || []
        userIds.forEach(userId => {
          if (!userNamesMap[userId]) {
            userIdsToFetch.add(userId)
          }
        })
      })

      // Fetch tất cả user names cần thiết
      if (userIdsToFetch.size > 0) {
        const fetchPromises = Array.from(userIdsToFetch).map(async (userId) => {
          const userName = await fetchUserName(userId)
          return { userId, userName }
        })

        const fetchResults = await Promise.all(fetchPromises)
        const newUserNamesMap: Record<string, string> = {}
        fetchResults.forEach(({ userId, userName }) => {
          if (userName) {
            newUserNamesMap[userId] = userName
          }
        })

        // Cập nhật userNamesMap
        if (Object.keys(newUserNamesMap).length > 0) {
          setUserNamesMap(prev => ({ ...prev, ...newUserNamesMap }))
        }
      }

      // Format messages với user names đã có
      allNotifications.forEach(notification => {
        if (newFormattedMessages[notification.id]) {
          return
        }

        let message = notification.message
        const userIds = notification.message.match(UUID_PATTERN) || []

        // Nếu là notification về withdrawal, lấy userId từ relatedEntityId
        if (notification.type === 'withdraw_pending' && notification.relatedEntityId && userIds.length > 0) {
          // Fetch withdraw request để lấy userId và format message
          fetchUserNameFromWithdrawRequest(notification.relatedEntityId).then(userName => {
            if (userName) {
              let formattedMessage = notification.message
              userIds.forEach(userId => {
                formattedMessage = formattedMessage.replace(userId, userName)
              })
              setFormattedMessages(prev => ({ ...prev, [notification.id]: formattedMessage }))
            }
          }).catch(() => {
            // Fallback: dùng userNamesMap nếu có
            let formattedMessage = notification.message
            userIds.forEach(userId => {
              const userName = userNamesMap[userId]
              if (userName) {
                formattedMessage = formattedMessage.replace(userId, userName)
              }
            })
            setFormattedMessages(prev => ({ ...prev, [notification.id]: formattedMessage }))
          })
          // Tạm thời dùng message gốc, sẽ update sau khi fetch xong
          newFormattedMessages[notification.id] = message
        } else if (userIds.length > 0) {
          // Với các notification khác, thay userId bằng tên từ map
          userIds.forEach(userId => {
            const userName = userNamesMap[userId]
            if (userName) {
              message = message.replace(userId, userName)
            }
          })
          newFormattedMessages[notification.id] = message
        } else {
          newFormattedMessages[notification.id] = message
        }
      })

      setFormattedMessages(prev => ({ ...prev, ...newFormattedMessages }))
    }

    if (apiNotifications.length > 0 || notifications.length > 0) {
      formatAllMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiNotifications, notifications])

  // Hợp nhất notifications từ SignalR (realtime) và API (lịch sử)
  const mergedNotifications = useMemo(() => {
    const map = new Map<string, AdminNotification>()
    apiNotifications.forEach((n) => {
      map.set(n.id, n)
    })
    notifications.forEach((n) => {
      map.set(n.id, n)
    })
    const all = Array.from(map.values())
    return all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [apiNotifications, notifications])

  // Tổng số chưa đọc: ưu tiên realtime nếu có, fallback API
  const totalUnreadCount = useMemo(() => {
    return unreadCount > 0 ? unreadCount : apiUnreadCount
  }, [unreadCount, apiUnreadCount])

  // Fetch notifications từ API cho admin
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const [items, unread] = await Promise.all([
        notificationApi.getNotifications(user.id),
        notificationApi.getUnreadCount(user.id),
      ])
      setApiNotifications(items)
      setApiUnreadCount(unread)
    } catch (error) {
      console.error('[AdminNotificationBell] Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Load ban đầu
  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
    }
  }, [user?.id, fetchNotifications])

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission()
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchNotifications()
    }
  }, [isOpen, user?.id, fetchNotifications])

  // Handle click on notification
  const handleNotificationClick = useCallback((notification: AdminNotification) => {
    console.log('[AdminNotificationBell] Notification clicked:', notification)
    
    // Mark as read (API + local state + SignalR state)
    const markOneAsRead = async () => {
      if (!user?.id || notification.isRead) return
      try {
        const success = await notificationApi.markAsRead(notification.id, user.id)
        if (success) {
          markAsRead(notification.id)
          setApiNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id
                ? { ...n, isRead: true, readAt: new Date().toISOString() }
                : n
            )
          )
          setApiUnreadCount((prev) => Math.max(0, prev - 1))
        }
      } catch (error) {
        console.error('[AdminNotificationBell] Error marking notification as read:', error)
      }
    }

    void markOneAsRead()

    // Navigate to related page
    const route = getNotificationRoute(notification)
    console.log('[AdminNotificationBell] Route for notification:', route, 'Type:', notification.type)
    
    if (route) {
      navigate(route)
    } else {
      console.warn('[AdminNotificationBell] No route found for notification:', notification)
      // Fallback: navigate to approval page for account/certification
      if (notification.type === 'certification_pending') {
        navigate(`${ROUTES.ADMIN_APPROVAL}?tab=certifications`)
      } else if (notification.type === 'account_pending') {
        navigate(ROUTES.ADMIN_APPROVAL)
      }
    }

    setIsOpen(false)
  }, [markAsRead, navigate, user?.id])

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    setIsMarkingRead(true)
    try {
      if (user?.id) {
        const success = await notificationApi.markAllAsRead(user.id)
        if (success) {
          markAllAsRead()
          setApiNotifications((prev) =>
            prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
          )
          setApiUnreadCount(0)
        }
      } else {
        markAllAsRead()
      }
    } finally {
      setIsMarkingRead(false)
    }
  }, [markAllAsRead])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-10 w-10 p-0 hover:bg-gray-100 rounded-lg"
        aria-label={`Thông báo${totalUnreadCount > 0 ? ` (${totalUnreadCount} chưa đọc)` : ''}`}
        title={isConnected ? 'Đã kết nối realtime' : 'Đang kết nối...'}
      >
        <Bell className="h-5 w-5 text-gray-600" />
        
        {/* Badge số thông báo */}
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white animate-pulse">
            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
          </span>
        )}
        
        {/* Connection status indicator */}
        <span 
          className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white ${
            isConnected ? 'bg-green-400' : 'bg-yellow-400'
          }`} 
        />
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-96 rounded-xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Thông báo</h3>
              {isConnected && (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  Live
                </span>
              )}
            </div>
            {totalUnreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingRead}
                className="h-8 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {isMarkingRead ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <CheckCheck className="h-3 w-3 mr-1" />
                )}
                Đọc tất cả
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : mergedNotifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600">Không có thông báo mới</p>
                <p className="text-xs text-gray-400 mt-1">
                  Các thông báo về tài khoản, chứng chỉ, đấu giá sẽ xuất hiện ở đây
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {mergedNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? NOTIFICATION_BG_COLORS[notification.type] : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 mt-0.5 p-2 rounded-lg ${
                        !notification.isRead ? 'bg-white shadow-sm' : 'bg-gray-100'
                      }`}>
                        {NOTIFICATION_ICONS[notification.type]}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium line-clamp-1 ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500 mt-1.5" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                          {formattedMessages[notification.id] || notification.message}
                        </p>
                        <p className="mt-1.5 text-xs text-gray-400">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {mergedNotifications.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-2.5 text-center bg-gray-50/50">
              <p className="text-xs text-gray-500">
                {totalUnreadCount > 0 
                  ? `${totalUnreadCount} thông báo chưa đọc`
                  : 'Đã đọc tất cả thông báo'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminNotificationBell

