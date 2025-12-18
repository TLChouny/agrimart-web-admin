import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Bell, CheckCheck, Loader2, User, Award, Gavel, Banknote, AlertTriangle, Wallet, Info } from 'lucide-react'
import { Button } from '../ui/button'
import { useAdminNotifications } from '../../hooks/useAdminNotifications'
import type { AdminNotification, AdminNotificationType } from '../../types'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { notificationApi } from '../../services/api/notificationApi'
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

  // Ưu tiên dựa trên relatedEntityType nếu có
  if (entityType.includes('auction')) {
    return relatedEntityId
      ? ROUTES.ADMIN_AUCTIONS_BY_ID.replace(':id', relatedEntityId)
      : ROUTES.ADMIN_AUCTIONS
  }

  if (entityType.includes('withdrawrequest')) {
    // Hiện tại admin hiển thị danh sách yêu cầu rút trong trang ví
    // Có thể bổ sung query string để filter theo id nếu cần
    return ROUTES.ADMIN_WALLET
  }

  if (entityType.includes('wallet')) {
    return ROUTES.ADMIN_WALLET
  }

  if (entityType.includes('dispute')) {
    return ROUTES.ADMIN_DISPUTES
  }

  // Fallback theo notification type
  switch (type) {
    case 'account_pending':
    case 'certification_pending':
      // Các duyệt tài khoản / chứng chỉ tập trung ở trang approval
      return ROUTES.ADMIN_APPROVAL
    case 'auction_pending':
      return relatedEntityId
        ? ROUTES.ADMIN_AUCTIONS_BY_ID.replace(':id', relatedEntityId)
        : ROUTES.ADMIN_AUCTIONS
    case 'withdraw_pending':
    case 'wallet_transfer':
      return ROUTES.ADMIN_WALLET
    case 'dispute_pending':
      return ROUTES.ADMIN_DISPUTES
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

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
    if (route) {
      navigate(route)
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
                          {notification.message}
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

